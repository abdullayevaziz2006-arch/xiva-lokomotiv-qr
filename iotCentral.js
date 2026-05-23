const TelegramBot = require('node-telegram-bot-api');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const activeAgents = {}; // lotId -> socket mapping

function initIoTCentral(io) {
  // --- SOCKET.IO AGENT MANAGER ---
  io.on('connection', (socket) => {
    console.log(`📡 [IoT Central] Yangi ulanish: ${socket.id}`);

    socket.on('register_agent', ({ lotId }) => {
      socket.lotId = lotId;
      activeAgents[lotId] = socket;
      console.log(`📡 [IoT Central] Agent ro'yxatdan o'tdi: ${lotId}`);
    });

    // Sinxronizatsiya ma'lumotlarini qabul qilish
    socket.on('sync_data', async ({ lotId, sessions, payments, logs, cars }) => {
      console.log(`📡 [IoT Central] Sync data keldi, LotID: ${lotId}. Syncing...`);
      try {
        // 1. Cars sinxronlash
        for (const car of cars) {
          await prisma.car.upsert({
            where: { id: car.id },
            update: {
              plateNumber: car.plateNumber,
              isSubscriber: car.isSubscriber,
              subscriberEnd: car.subscriberEnd ? new Date(car.subscriberEnd) : null,
              isBlacklisted: car.isBlacklisted,
              cardNo: car.cardNo
            },
            create: {
              id: car.id,
              plateNumber: car.plateNumber,
              isSubscriber: car.isSubscriber,
              subscriberEnd: car.subscriberEnd ? new Date(car.subscriberEnd) : null,
              isBlacklisted: car.isBlacklisted,
              cardNo: car.cardNo
            }
          });
        }

        // 2. ParkingLot mavjudligini tekshirish
        let lot = await prisma.parkingLot.findUnique({ where: { id: lotId } });
        if (!lot) {
          lot = await prisma.parkingLot.create({
            data: {
              id: lotId,
              name: 'Lokal Parkovka ' + lotId.substring(0, 5)
            }
          });
        }

        // 3. Sessions sinxronlash
        for (const s of sessions) {
          await prisma.parkingSession.upsert({
            where: { id: s.id },
            update: {
              carId: s.carId,
              lotId: s.lotId,
              entryTime: new Date(s.entryTime),
              exitTime: s.exitTime ? new Date(s.exitTime) : null,
              fee: s.fee,
              status: s.status
            },
            create: {
              id: s.id,
              carId: s.carId,
              lotId: s.lotId,
              entryTime: new Date(s.entryTime),
              exitTime: s.exitTime ? new Date(s.exitTime) : null,
              fee: s.fee,
              status: s.status
            }
          });
        }

        // 4. Payments sinxronlash
        for (const p of payments) {
          await prisma.payment.upsert({
            where: { id: p.id },
            update: {
              sessionId: p.sessionId,
              amount: p.amount,
              method: p.method,
              status: p.status,
              createdAt: new Date(p.createdAt)
            },
            create: {
              id: p.id,
              sessionId: p.sessionId,
              amount: p.amount,
              method: p.method,
              status: p.status,
              createdAt: new Date(p.createdAt)
            }
          });
        }

        // 5. Logs sinxronlash
        for (const l of logs) {
          await prisma.log.upsert({
            where: { id: l.id },
            update: {
              type: l.type,
              carId: l.carId,
              description: l.description,
              createdAt: new Date(l.createdAt)
            },
            create: {
              id: l.id,
              type: l.type,
              carId: l.carId,
              description: l.description,
              createdAt: new Date(l.createdAt)
            }
          });
        }

        console.log(`✅ [IoT Central] LotID: ${lotId} sinxronizatsiyasi muvaffaqiyatli yakunlandi.`);
      } catch (err) {
        console.error(`❌ [IoT Central] LotID: ${lotId} sinxronlashda xatolik:`, err.message);
      }
    });

    socket.on('disconnect', () => {
      if (socket.lotId && activeAgents[socket.lotId] === socket) {
        delete activeAgents[socket.lotId];
        console.log(`🔌 [IoT Central] Agent uzildi: ${socket.lotId}`);
      }
    });
  });

  // --- TELEGRAM BOT LOGIC ---
  const token = process.env.TELEGRAM_BOT_TOKEN || '8653750532:AAFV5o7bEUufpi4zwpUQYx-iKDHOqPT8GIE'; // Userning shared tokeni
  const bot = new TelegramBot(token, { polling: true });
  console.log('🤖 [IoT Central Bot] Polling rejimida ishga tushdi ✅');

  const mainKeyboard = {
    reply_markup: {
      keyboard: [
        [{ text: '📊 Statistika' }, { text: '🚗 Ichkaridagi mashinalar' }],
        [{ text: '🔓 Shlagbaum ochish' }]
      ],
      resize_keyboard: true
    }
  };

  // Foydalanuvchini bazadan qidirish
  async function getUserByChatId(chatId) {
    return await prisma.user.findFirst({
      where: { telegramChatId: String(chatId) },
      include: {
        organization: {
          include: {
            parkingLots: true
          }
        }
      }
    });
  }

  // Raqamni yuborganda tekshirish
  bot.on('contact', async (msg) => {
    const chatId = msg.chat.id;
    let phoneNumber = msg.contact.phone_number;
    
    // Raqamni formatlash (masalan +998... qilish)
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+' + phoneNumber;
    }

    try {
      const user = await prisma.user.findFirst({
        where: { phone: phoneNumber }
      });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { telegramChatId: String(chatId) }
        });

        bot.sendMessage(
          chatId,
          `🎉 Muvaffaqiyatli kirdingiz! Salom, ${user.fullName}. Endi SmartPark botini ishlata olasiz.`,
          mainKeyboard
        );
      } else {
        bot.sendMessage(
          chatId,
          `❌ Kechirasiz, ${phoneNumber} raqami SmartPark tizimida ro'yxatdan o'tmagan. Iltimos, administratorga murojaat qiling.`
        );
      }
    } catch (err) {
      console.error('[Bot Contact Error]', err.message);
      bot.sendMessage(chatId, 'Xatolik yuz berdi. Iltimos keyinroq urunib ko\'ring.');
    }
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;
    if (text === '/start') {
      const user = await getUserByChatId(chatId);
      if (user) {
        bot.sendMessage(chatId, `👋 Assalomu alaykum, ${user.fullName}! SmartPark boshqaruv botiga xush kelibsiz.`, mainKeyboard);
      } else {
        bot.sendMessage(chatId, '👋 Assalomu alaykum! SmartPark botidan foydalanish uchun quyidagi tugma orqali telefon raqamingizni yuboring:', {
          reply_markup: {
            keyboard: [[{ text: '📞 Telefon raqamni yuborish', request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true
          }
        });
      }
      return;
    }

    // Authenticate check
    const user = await getUserByChatId(chatId);
    if (!user) {
      bot.sendMessage(chatId, '⚠️ Iltimos, avval /start buyrug\'ini yuboring va telefon raqamingizni tasdiqlang.');
      return;
    }

    const parkingLots = user.organization?.parkingLots || [];
    if (parkingLots.length === 0) {
      bot.sendMessage(chatId, '⚠️ Sizning tashkilotingizga bog\'langan hech qanday shlagbaum/parkovka topilmadi.');
      return;
    }

    if (text === '📊 Statistika') {
      const lotIds = parkingLots.map(l => l.id);
      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // Bugungi seanslar soni
        const todaySessionsCount = await prisma.parkingSession.count({
          where: {
            lotId: { in: lotIds },
            entryTime: { gte: startOfDay }
          }
        });

        // Hozirda ichkarida (ACTIVE) turgan mashinalar soni
        const activeCarsCount = await prisma.parkingSession.count({
          where: {
            lotId: { in: lotIds },
            status: 'ACTIVE'
          }
        });

        // Bugungi to'lovlar summasi
        const payments = await prisma.payment.findMany({
          where: {
            session: {
              lotId: { in: lotIds }
            },
            createdAt: { gte: startOfDay },
            status: 'SUCCESS'
          }
        });
        const todayRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

        let response = `📊 *Bugungi Statistika:*\n\n`;
        response += `🚗 *Kunlik kelgan mashinalar:* ${todaySessionsCount} ta\n`;
        response += `🅿️ *Hozirgi ichkarida:* ${activeCarsCount} ta\n`;
        response += `💰 *Bugungi umumiy tushum:* ${todayRevenue.toLocaleString()} UZS\n`;

        bot.sendMessage(chatId, response, { parse_mode: 'Markdown', ...mainKeyboard });
      } catch (err) {
        console.error('[Bot Stats Error]', err.message);
        bot.sendMessage(chatId, 'Statistikani yuklashda xatolik yuz berdi.', mainKeyboard);
      }
    } 
    else if (text === '🚗 Ichkaridagi mashinalar') {
      const lotIds = parkingLots.map(l => l.id);
      try {
        const activeSessions = await prisma.parkingSession.findMany({
          where: {
            lotId: { in: lotIds },
            status: 'ACTIVE'
          },
          include: {
            car: true
          },
          take: 20
        });

        if (activeSessions.length === 0) {
          bot.sendMessage(chatId, '🅿️ Hozirda ichkarida hech qanday mashina yo\'q.', mainKeyboard);
          return;
        }

        let response = `🚗 *Ichkaridagi mashinalar ro'yxati (oxirgi 20 ta):*\n\n`;
        activeSessions.forEach((s, idx) => {
          const time = new Date(s.entryTime).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
          response += `${idx + 1}. 🚗 *${s.car.plateNumber}* (Kirish: ${time})\n`;
        });

        bot.sendMessage(chatId, response, { parse_mode: 'Markdown', ...mainKeyboard });
      } catch (err) {
        console.error('[Bot Active Cars Error]', err.message);
        bot.sendMessage(chatId, 'Ma\'lumotlarni olishda xatolik yuz berdi.', mainKeyboard);
      }
    } 
    else if (text === '🔓 Shlagbaum ochish') {
      if (parkingLots.length === 1) {
        const lot = parkingLots[0];
        const socket = activeAgents[lot.id];
        if (socket) {
          socket.emit('open_barrier_cmd');
          bot.sendMessage(chatId, `🔓 *${lot.name}* shlagbaumini ochish buyrug'i yuborildi!`, { parse_mode: 'Markdown', ...mainKeyboard });
        } else {
          bot.sendMessage(chatId, `⚠️ *${lot.name}* shlagbaumi offline holatda (lokal PC o'chgan yoki internet yo'q)!`, { parse_mode: 'Markdown', ...mainKeyboard });
        }
      } else {
        // Agar bir nechta parkovka bo'lsa inline tugmalar chiqariladi
        const buttons = parkingLots.map(lot => {
          return [{ text: lot.name, callback_data: `open_lot:${lot.id}` }];
        });
        bot.sendMessage(chatId, 'Qaysi shlagbaumni ochmoqchisiz?', {
          reply_markup: {
            inline_keyboard: buttons
          }
        });
      }
    }
  });

  // Inline tugmalar bosilganda (ko'p parkovkali holatda)
  bot.on('callback_query', async (callbackQuery) => {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;

    if (data.startsWith('open_lot:')) {
      const lotId = data.split(':')[1];
      const user = await getUserByChatId(chatId);
      if (!user) return;

      const lot = user.organization?.parkingLots.find(l => l.id === lotId);
      if (!lot) {
        bot.answerCallbackQuery(callbackQuery.id, { text: 'Ruxsat berilmagan lot!' });
        return;
      }

      const socket = activeAgents[lotId];
      if (socket) {
        socket.emit('open_barrier_cmd');
        bot.answerCallbackQuery(callbackQuery.id, { text: 'Ochish buyrug\'i yuborildi!' });
        bot.sendMessage(chatId, `🔓 *${lot.name}* shlagbaumi ochildi!`, { parse_mode: 'Markdown' });
      } else {
        bot.answerCallbackQuery(callbackQuery.id, { text: 'Uskuna offline!' });
        bot.sendMessage(chatId, `⚠️ *${lot.name}* shlagbaumi offline holatda!`);
      }
    }
  });
}

module.exports = {
  initIoTCentral,
  activeAgents
};
