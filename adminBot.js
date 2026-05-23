const TelegramBot = require('node-telegram-bot-api');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function initAdminBot(activeAgents) {
  const token = process.env.ADMIN_BOT_TOKEN;
  if (!token) {
    console.warn('⚠️ [Admin Bot] ADMIN_BOT_TOKEN topilmadi. Admin Bot ishga tushmadi.');
    return;
  }

  const bot = new TelegramBot(token, { polling: true });
  console.log('🤖 [Admin Bot] Polling rejimida ishga tushdi ✅');

  const adminKeyboard = {
    reply_markup: {
      keyboard: [
        [{ text: '🏢 Tashkilotlar' }, { text: '📡 Shlagbaumlar (Online)' }],
        [{ text: '💰 Umumiy Kunlik Tushum' }]
      ],
      resize_keyboard: true
    }
  };

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    // Ruxsat etilgan admin Chat ID sini tekshirish
    const allowedChatId = process.env.ADMIN_CHAT_ID;
    if (allowedChatId && String(chatId) !== String(allowedChatId)) {
      bot.sendMessage(
        chatId, 
        `❌ Kechirasiz, siz ushbu tizimning administratori emassiz.\nSizning Chat ID: \`${chatId}\``, 
        { parse_mode: 'Markdown' }
      );
      return;
    }

    if (text === '/start') {
      bot.sendMessage(
        chatId, 
        '👋 Assalomu alaykum, SmartPark Tizimining Bosh Administratori! Kerakli bo\'limni tanlang:', 
        adminKeyboard
      );
      return;
    }

    if (text === '🏢 Tashkilotlar') {
      try {
        const orgs = await prisma.organization.findMany({
          include: {
            users: true,
            parkingLots: true
          }
        });

        if (orgs.length === 0) {
          bot.sendMessage(chatId, '🏢 Hozircha hech qanday tashkilot ro\'yxatdan o\'tmagan.', adminKeyboard);
          return;
        }

        let response = `🏢 *Tashkilotlar ro'yxati (${orgs.length} ta):*\n\n`;
        orgs.forEach((org, idx) => {
          response += `*${idx + 1}. ${org.name}* (Slug: \`${org.slug}\`)\n`;
          if (org.users.length > 0) {
            response += `👥 Xodimlar:\n`;
            org.users.forEach(u => {
              response += `  • *${u.fullName}* (${u.phone})${u.telegramChatId ? ' 🟢' : ''}\n`;
            });
          } else {
            response += `👥 Xodimlar: 0 ta\n`;
          }
          response += `🅿️ Parkovkalar: ${org.parkingLots.length} ta\n\n`;
        });

        bot.sendMessage(chatId, response, { parse_mode: 'Markdown', ...adminKeyboard });
      } catch (err) {
        console.error('[Admin Bot Orgs Error]', err.message);
        bot.sendMessage(chatId, 'Tashkilotlarni yuklashda xatolik yuz berdi.', adminKeyboard);
      }
    } 
    else if (text === '📡 Shlagbaumlar (Online)') {
      try {
        const onlineLotIds = Object.keys(activeAgents);
        if (onlineLotIds.length === 0) {
          bot.sendMessage(chatId, '🔌 Hozirda hech qanday shlagbaum online emas.', adminKeyboard);
          return;
        }

        const lots = await prisma.parkingLot.findMany({
          where: { id: { in: onlineLotIds } }
        });

        let response = `📡 *Hozirda Online Shlagbaumlar (${lots.length} ta):*\n\n`;
        lots.forEach((lot, idx) => {
          response += `🟢 *${idx + 1}. ${lot.name}*\nID: \`${lot.id}\`\n\n`;
        });

        bot.sendMessage(chatId, response, { parse_mode: 'Markdown', ...adminKeyboard });
      } catch (err) {
        console.error('[Admin Bot Lots Error]', err.message);
        bot.sendMessage(chatId, 'Shlagbaumlarni yuklashda xatolik yuz berdi.', adminKeyboard);
      }
    } 
    else if (text === '💰 Umumiy Kunlik Tushum') {
      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const payments = await prisma.payment.findMany({
          where: {
            createdAt: { gte: startOfDay },
            status: 'SUCCESS'
          }
        });

        const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
        const paymentsCount = payments.length;

        let response = `💰 *Tizim bo'yicha Bugungi Umumiy Tushum:*\n\n`;
        response += `💸 *Umumiy tushum:* ${totalRevenue.toLocaleString()} UZS\n`;
        response += `🧾 *Muvaffaqiyatli to'lovlar soni:* ${paymentsCount} ta\n`;

        bot.sendMessage(chatId, response, { parse_mode: 'Markdown', ...adminKeyboard });
      } catch (err) {
        console.error('[Admin Bot Revenue Error]', err.message);
        bot.sendMessage(chatId, 'Tushumni hisoblashda xatolik yuz berdi.', adminKeyboard);
      }
    }
  });
}

module.exports = initAdminBot;
