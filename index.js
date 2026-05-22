const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Server } = require('socket.io');
const { createAdapter, setupPrimary } = require('@socket.io/cluster-adapter');
const http = require('http');
const cluster = require('cluster');
const urllib = require('urllib');
const os = require('os');
const fs = require('fs');

// CPU yadrolari soni (5000+ RPS uchun muhim)
const numCPUs = os.cpus().length;

dotenv.config();

// Kutilmagan xatoliklarni ushlash (Server o'chib qolmasligi uchun)
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION] Jiddiy xatolik sodir bo\'ldi:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION] Kutilmagan rejection:', reason);
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const prisma = new PrismaClient();

// Bazani "Extreme" rejimga sozlash (WAL Mode + Busy Timeout)
async function tuneDatabase() {
    try {
        // SQLite PRAGMA'lari ba'zan qiymat qaytaradi, shuning uchun $queryRawUnsafe ishlatamiz
        await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
        await prisma.$queryRawUnsafe('PRAGMA synchronous=NORMAL;');
        await prisma.$queryRawUnsafe('PRAGMA busy_timeout=30000;');
        await prisma.$queryRawUnsafe('PRAGMA temp_store=MEMORY;');
        console.log(`[Worker ${process.pid}] Database WAL rejimiga o'tdi.`);
    } catch(e) {
        console.error(`[Worker ${process.pid}] Database sozlashda xato:`, e.message);
    }
}

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Global cheklovlar (Katta ma'lumotlarni tarmoq darajasida to'xtatish)
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// Webhook uchun ruxsat: Hikvision rasmlar bilan katta ma'lumot yuborishi mumkin (2mb gacha)
app.use('/api/events', express.text({ type: '*/*', limit: '2mb' }));

// Deep Diagnostic Logger (Vaqtinchalik muammoni topish uchun)
app.use((req, res, next) => {
    const logFile = 'debug.log';
    const logMsg = `[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.ip}\n`;
    fs.appendFileSync(logFile, logMsg);

    if (req.url.includes('/api/events')) {
        // Body ni ham yozamiz (Tahlil uchun ko'proq ma'lumot: 2000 belgi)
        const bodyPreview = (typeof req.body === 'string') ? req.body : JSON.stringify(req.body);
        fs.appendFileSync(logFile, `[BODY] ${bodyPreview?.substring(0, 2000)}\n---\n`);
    }
    next();
});

// Payloas Too Large (413) xatosini ushlash (Server o'chib qolmasligi uchun)
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    // console.warn(`[Blocked] Juda katta so'rov rad etildi: ${req.ip}`);
    return res.status(413).json({ error: 'Payload too large' });
  }
  next(err);
});

// Health Check (Tizim holatini tekshirish)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(), 
    db: 'connected (assuming)',
    ip: req.ip
  });
});

// AES-256 shifrlash sozlamalari
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; // 32 baytli maxfiy kalit
// Terminal vaqtini avtomatik sinxronizatsiya qilish (Vaqt farqi tufayli biletlar ishlamay qolmasligi uchun)
async function syncTerminalTime(terminal) {
    if (!terminal || !terminal.ipAddress) return;
    const baseUrl = `http://${terminal.ipAddress}:${terminal.port || 80}`;
    const now = new Date();
    // YYYY-MM-DDTHH:mm:ss formatida (Hikvision standarti)
    const localTime = now.getFullYear() + '-' + 
                      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(now.getDate()).padStart(2, '0') + 'T' + 
                      String(now.getHours()).padStart(2, '0') + ':' + 
                      String(now.getMinutes()).padStart(2, '0') + ':' + 
                      String(now.getSeconds()).padStart(2, '0');
    
    // Bizga kerak bo'lgan vaqt zonasi (O'zbekiston uchun CST-5 yoki shunga o'xshash)
    // Lekin ko'p terminallar manual vaqtni qabul qiladi
    const timeXml = `<?xml version="1.0" encoding="UTF-8"?>
<Time version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
    <timeMode>manual</timeMode>
    <localTime>${localTime}</localTime>
</Time>`;

    try {
        await hikvisionRequest('PUT', `${baseUrl}/ISAPI/System/time`, terminal.username, terminal.password, timeXml);
        const msg = `[Terminal Sync] Vaqt muvaffaqiyatli yangilandi: ${terminal.ipAddress} -> ${localTime}`;
        console.log(msg);
        fs.appendFileSync('debug.log', `${msg}\n`);
    } catch (err) {
        const errMsg = `[Terminal Sync] Vaqtni yangilashda xato: ${terminal.ipAddress} | ${err.message}`;
        console.error(errMsg);
        fs.appendFileSync('debug.log', `${errMsg}\n`);
    }
}

// QrCode generator yordamchi funksiya
function generateUniqueCode() {
  // Faqat raqamli bo'lgani Hikvision (343, 671 va h.k) uchun eng xavfsiz va universal format
  return String(Math.floor(1000000000 + Math.random() * 9000000000));
}
const IV_LENGTH = 16; 

function encrypt(text) {
  if(!text) return null;
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if(!text) return null;
  try {
    // Agar ":" bo'lmasa, demak bu shifrlanmagan eski ma'lumot bo'lishi mumkin
    if (!text.includes(':')) return text;

    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    console.error(`[Decryption Error] "${text}" decrypt qilinmadi. Tekshirilsin!`);
    // Xatolik bo'lsa, o'zini qaytaramiz (Ochiq matn deb hisoblab)
    return text;
  }
}

// Middleware: Abunentlik holatini tekshirish (Blocker)
async function checkSubscription(req, res, next) {
    try {
        const organizationId = req.body?.organizationId || req.query?.organizationId || req.params?.organizationId;
        if (!organizationId) return next();

        const org = await prisma.organization.findUnique({ where: { id: Number(organizationId) } });
        if (!org) return res.status(404).json({ error: "Tashkilot topilmadi" });

        const now = new Date();
        const trialExpired = now > org.trialEndsAt;

        // Agar muddat tugagan bo'lsa va bu o'qish (GET) so'rovi bo'lmasa, bloklaymiz
        // (Admin statslarni ko'rishi mumkin lekin o'zgartira olmaydi yoki Kassir sotolmaydi)
        if (trialExpired && req.method !== 'GET') {
            return res.status(402).json({ 
                error: "Sizning demo muddatingiz tugadi. Tizim bloklangan.",
                expired: true,
                trialEndsAt: org.trialEndsAt
            });
        }
        
        next();
    } catch (e) {
        next();
    }
}

// Vaqt formatlovchi (Hikvision formati: YYYY-MM-DDTHH:mm:ss)
function formatHikvisionTime(date) {
  // Hikvision (343 va 671) uchun eng xavfsiz format: YYYY-MM-DDTHH:mm:ss
  // Bunda vaqt zonalarsiz (Z yoki +05:00 siz) lokal vaqt yuborilishi shart.
  const localDate = new Date(date.getTime() + (5 * 60 * 60 * 1000)); // +5 soat (UZ)
  return localDate.toISOString().split('.')[0]; 
}

// Hikvision maxsus so'rov yuboruvchi log funksiyasi
async function hikvisionRequest(method, url, username, password, data = null) {
    const authString = `${username}:${password}`;
    
    console.log(`[Hikvision] So'rov: ${method} ${url}`);
    
    const isXml = typeof data === 'string' && (data.trim().startsWith('<?xml') || data.trim().startsWith('<'));
    
    const options = {
        method: method,
        digestAuth: authString,
        headers: { 'Content-Type': isXml ? 'application/xml' : 'application/json' },
        dataType: 'text',
        timeout: 20000 
    };
    
    if (data) {
        options.data = isXml ? data : JSON.stringify(data);
        // Deep Logging for diagnostics
        fs.appendFileSync('debug.log', `[Terminal Req] ${method} ${url}\n[Data] ${options.data.length > 500 ? options.data.substring(0, 500) + '...' : options.data}\n---\n`);
    }
    
    try {
        const response = await urllib.request(url, options);
        const bodyStr = response.data.toString();
        console.log(`[Hikvision] Javob status: ${response.status}`);
        console.log(`[Hikvision] Javob data:`, bodyStr);
        
        if (response.status !== 200) {
            throw new Error(`HTTP ${response.status}: ${bodyStr}`);
        }

        // Ichki ISAPI statusCode ni tekshirish
        try {
            const body = JSON.parse(bodyStr);
            const status = body.ResponseStatus?.statusCode || body.status || 1;
            if (status !== 1 && status !== "OK" && status !== 200) {
                const errMsg = body.ResponseStatus?.statusString || body.message || "ISAPI Error";
                throw new Error(`${errMsg} (Code: ${status})`);
            }
        } catch (e) {
            // Agar JSON emas bo'lsa yoki statusCode 1 bo'lsa o'tib ketadi
            if (e.message.includes("Code:")) throw e;
        }

        return response.data;
    } catch (error) {
        console.error(`[Hikvision] Xatolik:`, error.message);
        throw error;
    }
}

// Terminalga ulanish va kod yuklash
async function uploadQRToTerminal(terminalConfig, qrCodeData, userId, expiresAt, customerName = 'Mijoz') {
    const cleanIp = terminalConfig.ipAddress.split(':')[0];
    const baseUrl = `http://${cleanIp}:${terminalConfig.port || 80}/ISAPI`;
    const beginTime = formatHikvisionTime(new Date(Date.now() - 5 * 60 * 1000));
    // Card ID faqat raqam bo'lishi shart. Agar raqam bo'lmasa UserId ni ishlatamiz (Fallback)
    const cardId = qrCodeData.replace(/\D/g, '').substring(0, 20) || userId; 
    
    // 0. ESKI FOYDALANUVCHINI O'CHIRISH (Tozalash)
    try {
        await hikvisionRequest('PUT', `${baseUrl}/AccessControl/UserInfo/Delete?format=json`, terminalConfig.username, terminalConfig.password, {
            UserInfoDetail: { employeeNoList: [{ employeeNo: userId }] }
        });
        console.log(`[Hikvision] Eski user o'chirildi (ID: ${userId})`);
    } catch (e) {
        // Agar yo'q bo'lsa xato berishi mumkin, bu normal holat
    }

    // 1. Foydalanuvchi yaratish (JSON orqali) va Eshik huquqlarini (RightPlan) berish
    const userInfoData = {
        UserInfo: {
            employeeNo: userId,
            name: customerName,
            userType: 'normal',
            doorRight: '1',
            RightPlan: [
                {
                    doorNo: 1,
                    planTemplateNo: '1'
                }
            ],
            Valid: {
                enable: true,
                beginTime: beginTime,
                endTime: expiresAt
            }
        }
    };
    
    await hikvisionRequest('POST', `${baseUrl}/AccessControl/UserInfo/Record?format=json`, terminalConfig.username, terminalConfig.password, userInfoData);

    // 2. QR kodni karta sifatida yuklash (normalCard)
    const cardInfoData = {
        CardInfo: {
            employeeNo: userId,
            cardNo: cardId,
            cardType: 'normalCard', // 343 va 671 uchun normalCard universal rejim
            doorRight: '1',
            Valid: {
                enable: true,
                beginTime: beginTime,
                endTime: expiresAt
            }
        }
    };

    await hikvisionRequest('POST', `${baseUrl}/AccessControl/CardInfo/Record?format=json`, terminalConfig.username, terminalConfig.password, cardInfoData);
}

async function verifyTerminalAccessEvent(terminalConfig, employeeNo) {
    if (!terminalConfig || !employeeNo) return false;
    const cleanIp = terminalConfig.ipAddress.split(':')[0];
    const baseUrl = `http://${cleanIp}:${terminalConfig.port || 80}/ISAPI`;

    const beginTimeStr = formatHikvisionTime(new Date(Date.now() - 24 * 60 * 60 * 1000)) + "+05:00";
    const endTimeStr = formatHikvisionTime(new Date(Date.now() + 24 * 60 * 60 * 1000)) + "+05:00";

    const searchData = {
        AcsEventCond: {
            searchID: "1",
            searchResultPosition: 0,
            maxResults: 100, // Oxirgi 100 ta voqeani olamiz (Terminal employeeNoString bo'yicha filter qilishni qo'llab quvvatlamasligi aniqlandi)
            major: 5,
            minor: 0,
            startTime: beginTimeStr,
            endTime: endTimeStr
        }
    };

    try {
        const responseData = await hikvisionRequest('POST', `${baseUrl}/AccessControl/AcsEvent?format=json`, terminalConfig.username, terminalConfig.password, searchData);
        let parsed = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
        if (parsed.AcsEvent && parsed.AcsEvent.InfoList && parsed.AcsEvent.numOfMatches > 0) {
            // Endi JavaScript yordamida izlaymiz (Terminal yuborgan ro'yxat ichidan)
            const found = parsed.AcsEvent.InfoList.some(e => e.employeeNoString === employeeNo || e.cardNo === employeeNo);
            if (found) {
                return true;
            }
        }
        return false;
    } catch(e) {
        console.error(`[Hikvision Verify] ${terminalConfig.name} orqali izlashda xato yoki hech narsa topilmadi:`, e.message);
        return false;
    }
}

// --- API Routes ---

// QR Kod yaratish (Kassir paneli)
app.post('/api/qrcodes/generate', checkSubscription, async (req, res) => {
  try {
    const { carousels, createdBy, customerName, customerPhone, organizationId, quantity: globalQuantity } = req.body;

    if (!carousels || !carousels.length || !organizationId) {
      return res.status(400).json({ error: 'Ma\'lumotlar to\'liq emas' });
    }

    // Carousels arrayini normalize qilamiz (oboject yoki ID bo'lishiga qarab)
    const carouselReqs = carousels.map(c => {
        if (typeof c === 'object' && c.id) return { id: Number(c.id), quantity: Number(c.quantity) || 1 };
        return { id: Number(c), quantity: Number(globalQuantity) || 1 };
    });

    const carouselIds = carouselReqs.map(r => r.id);

    // 1. Karusel va ulangan Terminallarni topamiz (Faqat shu tashkilotniki)
    const fetchedCarousels = await prisma.carousel.findMany({
      where: { id: { in: carouselIds }, organizationId: Number(organizationId) },
      include: { terminal: true }
    });

    if (fetchedCarousels.length === 0) {
      return res.status(404).json({ error: "Karusellar topilmadi" });
    }

    // 2. QR kod parametrlari
    const qrString = generateUniqueCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 kunlik

    const encryptedName = encrypt(customerName);
    const encryptedPhone = encrypt(customerPhone);
    const formattedEndTime = formatHikvisionTime(expiresAt);

    // Dastlab ma'lumotlar bazasida yaratib saqlaymiz, status: 0 (kutish)
    let newQRCode = await prisma.qRCode.create({
      data: {
        qrString,
        expiresAt,
        createdBy,
        organizationId: Number(organizationId),
        status: 0,
        customerName: encryptedName,
        customerPhone: encryptedPhone,
        quantity: Number(globalQuantity) || 1, // Fallback
        carousels: {
          create: fetchedCarousels.map(c => {
             const req = carouselReqs.find(r => r.id === c.id);
             return {
                carouselId: c.id,
                quantity: req ? req.quantity : 1,
                status: 0
             };
          })
        }
      },
      include: { carousels: { include: { carousel: true } } }
    });

    // 3. QR Kodni mos terminallarga yuklaymiz
    const finalName = customerName || "Mijoz";
    const employeeNo = String(newQRCode.id).padStart(6, '0') + String(newQRCode.createdAt.getTime()).slice(-4);
    let terminalErrors = [];

    const universalStartTime = "2024-01-01T00:00:00";
    const universalEndTime = "2030-01-01T00:00:00";

    for (const carousel of fetchedCarousels) {
        if (!carousel.terminal) continue;
        try {
            await uploadQRToTerminal(carousel.terminal, qrString, employeeNo, universalEndTime, finalName, universalStartTime);
        } catch (err) {
            terminalErrors.push(`[${carousel.name}]: ${err.message}`);
        }
    }

    // Muvaffaqiyatli bo'lsa holatini yangilaymiz
    newQRCode = await prisma.qRCode.update({
        where: { id: newQRCode.id },
        data: { status: 1 },
        include: { carousels: { include: { carousel: true } } }
    });

    if (terminalErrors.length > 0) {
        return res.status(207).json({ 
            message: "Qisman yuklandi. Baza xatoliklari:", 
            qrCode: newQRCode, 
            errors: terminalErrors 
        });
    }

    res.status(201).json({
      message: 'QR Kod yaratildi va barcha terminallarga muvaffaqiyatli yuklandi',
      qrCode: newQRCode
    });
  } catch (error) {
    console.error('QRCodes generate xatosi:', error);
    res.status(500).json({ error: error.message });
  }
});

// Oxirgi sotuvlar (Kassir paneli uchun)
app.get('/api/qrcodes/recent', async (req, res) => {
    try {
        const { organizationId } = req.query;
        const qrcodes = await prisma.qRCode.findMany({
            where: { organizationId: Number(organizationId) },
            orderBy: { createdAt: 'desc' },
            take: 15,
            include: { carousels: { include: { carousel: true } } }
        });

        const decCodes = qrcodes.map(qr => ({
            ...qr,
            customerName: decrypt(qr.customerName) || "Mijoz",
            customerPhone: decrypt(qr.customerPhone) || ""
        }));

        res.json(decCodes);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// QR Kod qidirish (Vozvrat uchun)
app.get('/api/qrcodes/search', async (req, res) => {
    try {
        const { query, organizationId } = req.query;
        const qr = await prisma.qRCode.findFirst({
            where: { 
                organizationId: Number(organizationId),
                OR: [
                    { qrString: query },
                    { id: isNaN(Number(query)) ? -1 : Number(query) }
                ]
            },
            include: { carousels: { include: { carousel: true } } }
        });

        if (!qr) return res.status(404).json({ error: "QR kod topilmadi" });

        res.json({
            ...qr,
            customerName: decrypt(qr.customerName) || "Mijoz",
            customerPhone: decrypt(qr.customerPhone) || ""
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// QR kodni qayta yuklash (Retry) Endpoint
app.post('/api/qrcodes/:id/retry', async (req, res) => {
    try {
        const qrId = Number(req.params.id);
        const qr = await prisma.qRCode.findUnique({
            where: { id: qrId },
            include: { carousels: { include: { carousel: { include: { terminal: true } } } } }
        });

        if (!qr) return res.status(404).json({ error: "QR kod topilmadi" });

        const employeeNo = String(qr.id).padStart(6, '0') + String(qr.createdAt.getTime()).slice(-4);
        const universalStartTime = "2024-01-01T00:00:00";
        const universalEndTime = "2030-01-01T00:00:00";
        const decName = decrypt(qr.customerName) || "Mijoz";

        let errors = [];
        for (const rel of qr.carousels) {
            if (rel.status === -1) continue; 
            const term = rel.carousel?.terminal;
            if (term) {
                try {
                    // 1. Birinchi navbatda vaqtni sinxronlashtiramiz (har ehtimolga qarshi)
                    await syncTerminalTime(term);
                    
                    // 2. Keyin biletni universal (2024-2030) vaqt bilan yuklaymiz
                    await uploadQRToTerminal(term, qr.qrString, employeeNo, universalEndTime, decName, universalStartTime);
                } catch (e) {
                    errors.push(`[${rel.carousel.name}]: ${e.message}`);
                }
            }
        }
        
        await prisma.qRCode.update({
            where: { id: qrId },
            data: { status: 1 }
        });

        if (errors.length > 0) return res.status(207).json({ message: "Ba'zilari qayta yuklandi", errors });
        res.json({ message: "Qayta yuklash to'liq muvaffaqiyatli!" });
    } catch (error) {
        console.error('Retry xatosi:', error);
        res.status(500).json({ error: "Terminalga qayta yuklash amalga oshmadi" });
    }
});
app.get('/api/qrcodes/recent', async (req, res) => {
    try {
        const { organizationId } = req.query;
        const recentTickets = await prisma.qRCode.findMany({
            where: { organizationId: Number(organizationId) },
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: { carousels: { include: { carousel: true } } }
        });

        // Ma'lumotlarni dekript qilish
        const decryptedTickets = recentTickets.map(t => ({
            ...t,
            customerName: decrypt(t.customerName) || "Mijoz",
            customerPhone: decrypt(t.customerPhone) || "Noma'lum"
        }));

        res.json(decryptedTickets);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/qrcodes/search', async (req, res) => {
    try {
        const { query, organizationId } = req.query; // Kassir QR kodni, ismini yoki raqamini yozadi
        if (!query || !organizationId) return res.status(400).json({ error: "Ma'lumotlar yetarli emas" });
        
        // 1. Dastlab aniq QR String bo'yicha qarab ko'ramiz
        let qr = await prisma.qRCode.findFirst({
            where: { qrString: query, organizationId: Number(organizationId) },
            include: { carousels: { include: { carousel: { include: { terminal: true } } } } }
        });

        if (!qr) {
            const recentQRs = await prisma.qRCode.findMany({
                 where: { organizationId: Number(organizationId) },
                 orderBy: { createdAt: 'desc' },
                 take: 500,
                 include: { carousels: { include: { carousel: { include: { terminal: true } } } } }
            });

            for (let r of recentQRs) {
                const decPhone = decrypt(r.customerPhone) || "";
                const decName = decrypt(r.customerName) || "";
                if ((decPhone.includes(query) || decName.toLowerCase().includes(query.toLowerCase())) && r.carousels && r.carousels.length > 0) {
                    qr = r;
                    break;
                }
            }
        }

        if (!qr) return res.status(404).json({ error: "Bilet topilmadi" });

        // Mijozning haqiqatda kirganini (AcsEvent) jonli tekshiramiz!
        const employeeNo = qr.qrString.replace(/-/g, '').substring(0, 32); 
        for (let rel of qr.carousels) {
            if (rel.status === 0 && rel.carousel?.terminal) {
                const passed = await verifyTerminalAccessEvent(rel.carousel.terminal, employeeNo);
                if (passed) {
                    // Agar o'tgan bo'lsa, bazada statusini 1 (Ishlatilgan) ga aylantirib qulflaymiz.
                    await prisma.qRCodeCarousel.update({
                        where: { id: rel.id },
                        data: { status: 1 }
                    });
                    rel.status = 1; // Ob'ektdagi ma'lumotni ham darxol yangilab yuboramiz (Fronted uchun)
                }
            }
        }

        // Mijoz malumotlarini o'qish formatiga o'tkazish
        qr.customerName = decrypt(qr.customerName);
        qr.customerPhone = decrypt(qr.customerPhone);

        res.json(qr);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Vozvrat Qilish Endpointi
app.post('/api/qrcodes/refund', async (req, res) => {
   try {
       const { qrId, carouselIds } = req.body; 
       
       const qr = await prisma.qRCode.findUnique({
            where: { id: qrId },
            include: { carousels: { include: { carousel: { include: { terminal: true } } } } }
        });
       if (!qr) return res.status(404).json({error: "QR Baza xatosi"});

       const employeeNo = qr.qrString.replace(/-/g, '').substring(0, 32); 
       let successCount = 0;
       
       for (const rel of qr.carousels) {
           // Faqat jo'natilgan va bekor qilinmaganlarni vozvrat qilamiz
           if (carouselIds.includes(rel.carouselId) && rel.status === 0) {
               
               const terminalInfo = rel.carousel?.terminal;
               if (terminalInfo) {
                   const cleanIp = terminalInfo.ipAddress.split(':')[0];
                   const baseUrl = `http://${cleanIp}:${terminalInfo.port || 80}/ISAPI`;
                   const beginTime = formatHikvisionTime(new Date(Date.now() - 5 * 60 * 1000));
                   
                   // Terminalda faoliyatini to'xtatish (enable: false)
                    const userInfoData = {
                         UserInfo: {
                            employeeNo: employeeNo,
                            name: decrypt(qr.customerName) || 'Refund',
                            userType: 'normal',
                            Valid: {
                                enable: false, 
                                beginTime: beginTime,
                                endTime: beginTime
                            }
                        }
                    };
                    
                    try {
                        await hikvisionRequest('PUT', `${baseUrl}/AccessControl/UserInfo/Detail?format=json`, terminalInfo.username, terminalInfo.password, userInfoData);
                    } catch (e) {
                        console.error("Vozvrat terminalda bekor qilishda xato:", e.message);
                    }
               }
               
               // Bazada qaytarilgan (-1) statusini berish
               await prisma.qRCodeCarousel.update({
                   where: { id: rel.id },
                   data: { status: -1 }
               });
               successCount++;
           }
       }
       
       res.json({ message: `${successCount} ta karuseldan bekor qilindi va puli qaytarilishga tayyor!` });
   } catch (e) {
       res.status(500).json({ error: e.message });
   }
});
// --- WEBHOOK LISTENER (Real-time Scan Notification from Terminal) ---
// Middleware allaqachon yuqorida (Global) o'rnatildi
app.post('/api/events', async (req, res) => {
    try {
        const sourceIp = req.headers['x-terminal-ip'] || req.ip.replace('::ffff:', '');
        
        let event = {};
        if (typeof req.body === 'object' && req.body !== null) {
            event = req.body;
        } else {
            const rawBody = req.body || "";
            // KESKIN OPTIMIZATSIYA: Faqat birinchi 5KB ma'lumotni o'qiymiz (Rasm va og'ir binary data o'chirilishi uchun)
            const truncatedBody = rawBody.length > 5000 ? rawBody.substring(0, 5000) : rawBody;
            
            try {
                // Heartbeat bo'lsa darhol chiqib ketamiz (Performance!)
                if (truncatedBody.includes('heartBeat')) {
                    return res.status(200).send('OK');
                }

                if (truncatedBody.includes('--MIME_boundary')) {
                    const jsonMatch = truncatedBody.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        event = JSON.parse(jsonMatch[0]);
                    } else {
                        event = { _isRaw: true, raw: truncatedBody };
                    }
                } else {
                    event = JSON.parse(truncatedBody);
                }
            } catch (e) {
                event = { _isRaw: true, raw: truncatedBody };
            }
        }

        const normalizeName = (str) => {
            if (!str) return "";
            // Barcha belgilarni (nuqta, tutuq belgisi ') va ortiqcha bo'shliqlarni olib tashlaymiz
            return str.toString().toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, ' ');
        };

        const findField = (obj, field, raw) => {
            if (obj && obj._isRaw && obj.raw) {
                const regex = new RegExp(`<${field}>(.*?)<\/${field}>`, 'i');
                const match = obj.raw.match(regex);
                if (match) return match[1];
            }
            
            if (obj && typeof obj === 'object') {
                const target = field.toLowerCase();
                for (let key in obj) {
                    if (key.toLowerCase() === target) {
                        if (obj[key] !== undefined && obj[key] !== null) return obj[key];
                    }
                }

                for (let key in obj) {
                    if (typeof obj[key] === 'object' && obj[key] !== null) {
                        const found = findField(obj[key], field, null);
                        if (found) return found;
                    }
                }
            }

            // Fallback: Agar object ichidan topilmasa, rawBody dan regex orqali qidiramiz
            if (raw) {
                // JSON format uchun: "field":"value" yoki "field":value
                const jsonRegex = new RegExp(`"${field}"\\s*:\\s*(?:"([^"]+)"|([^,}]+))`, 'i');
                const jsonMatch = raw.match(jsonRegex);
                if (jsonMatch) return jsonMatch[1] || jsonMatch[2];

                // XML format uchun: <field>value</field>
                const xmlRegex = new RegExp(`<${field}>(.*?)<\\/${field}>`, 'i');
                const xmlMatch = raw.match(xmlRegex);
                if (xmlMatch) return xmlMatch[1];
            }

            return null;
        };

        // KESKIN OPTIMIZATSIYA: JSON ni qidirishda faqat boshlang'ich qismini ishlatamiz
        const rawDataForSearch = (typeof req.body === 'string' && req.body.length > 5000) 
            ? req.body.substring(0, 5000) 
            : (typeof req.body === 'string' ? req.body : (req.body ? JSON.stringify(req.body).substring(0, 5000) : ""));

        const employeeNo = findField(event, 'employeeNoString', rawDataForSearch) || 
                           findField(event, 'cardNo', rawDataForSearch) || 
                           findField(event, 'employeeNo', rawDataForSearch) || 
                           findField(event, 'EmployeeNo', rawDataForSearch) || 
                           findField(event, 'serialNo', rawDataForSearch) || 
                           findField(event, 'EmployeeNoString', rawDataForSearch);

        const name = findField(event, 'name', rawDataForSearch) || 
                     findField(event, 'Name', rawDataForSearch) ||
                     findField(event, 'userName', rawDataForSearch);

        console.log(`[Webhook DEBUG] From: ${sourceIp} | ID: ${employeeNo} | Name: ${name}`);
        if (!employeeNo && !name) {
            console.log(`[Webhook DEBUG] Raw Body (Partial): ${rawDataForSearch.substring(0, 500)}`);
        }

            // 1. IP orqali qaysi terminal kelayotganini aniqlaymiz
            const terminal = await prisma.terminal.findFirst({
                where: { ipAddress: { contains: sourceIp } },
                include: { organization: true }
            });

            if (!terminal) {
                console.warn(`[Webhook] Noma'lum terminal IP: ${sourceIp}`);
                return res.status(200).send('OK');
            }

            const orgId = terminal.organizationId;

            // 2. ISHCHI DAVOMATI (SmartStaff SKUD Logic)
            // Agar kelgan ID bazadagi ishchilar orasida bo'lsa
            const staff = await prisma.staff.findFirst({
                where: { employeeId: String(employeeNo), organizationId: orgId }
            });

            if (staff) {
                // Keldi-ketdi (In/Out) tahlili
                // Hozircha oddiygina IN/OUT deb yozamiz (Agar terminal direction bermasa)
                const lastLog = await prisma.attendance.findFirst({
                    where: { staffId: staff.id },
                    orderBy: { timestamp: 'desc' }
                });
                
                const direction = (!lastLog || lastLog.direction === 'OUT') ? 'IN' : 'OUT';

                await prisma.attendance.create({
                    data: {
                        staffId: staff.id,
                        direction: direction,
                        terminalId: terminal.id
                    }
                });

                io.emit('staff-attendance', {
                    orgId,
                    staffName: staff.fullName,
                    direction,
                    time: new Date()
                });
                
                console.log(`[SKUD] Ishchi ${staff.fullName}: ${direction}`);
                return res.status(200).send('OK');
            }

            // 3. CHIPTA TEKSHIRISH (Park Logic)
            const pendingEvents = await prisma.qRCodeCarousel.findMany({
                where: {
                    status: 0,
                    carousel: { terminalId: terminal.id }
                },
                include: { qrCode: true, carousel: true }
            });

            // JavaScript da decrypt qilib solishtirish
            const match = pendingEvents.find(rel => {
                try {
                    const normIncoming = normalizeName(name);
                    const normDec = normalizeName(decrypt(rel.qrCode.customerName));
                    const incomingID = employeeNo ? employeeNo.toString().trim() : "";
                    
                    // 1. qrString bilan tekshirish (Terminal bilet raqamini ID sifatida yuborganda)
                    const cleanQR = rel.qrCode.qrString.replace(/\D/g, '').trim();
                    const cleanIncoming = incomingID.replace(/\D/g, '').trim();
                    
                    // 2. Deterministik employeeNo bilan tekshirish (Yangi ID formati)
                    const calculatedID = String(rel.qrCodeId).padStart(6, '0') + String(rel.qrCode.createdAt.getTime()).slice(-4);

                    const matchID = cleanIncoming !== "" && (cleanIncoming === cleanQR || cleanIncoming === calculatedID);
                    const matchName = normIncoming !== "" && (normDec.includes(normIncoming) || normIncoming.includes(normDec));
                    
                    // Deep match diagnosis
                    const debugMsg = `[MATCH_DEBUG] RelID:${rel.id} | In:${cleanIncoming} vs QR:${cleanQR}/Calc:${calculatedID} | Match:${matchID || matchName}\n`;
                    fs.appendFileSync('debug.log', debugMsg);

                    if (matchID || matchName) {
                        const msg = `[Webhook Match] Found! ID Match: ${matchID} (Incoming: ${cleanIncoming}, DB_QR: ${cleanQR}, DB_Calc: ${calculatedID}), Name Match: ${matchName} for ${rel.qrCodeId}`;
                        console.log(msg);
                        fs.appendFileSync('debug.log', `[MATCH_SUCCESS] ${msg}\n`);
                    }
                    
                    return matchID || matchName;
                } catch (err) { return false; }
            });

            if (match) {
                const newUsedCount = (match.usedCount || 0) + 1;
                const isFullyUsed = newUsedCount >= (match.quantity || 1);

                await prisma.qRCodeCarousel.update({
                    where: { id: match.id },
                    data: { 
                        usedCount: newUsedCount,
                        status: isFullyUsed ? 1 : 0, 
                        usedAt: new Date() 
                    }
                });

                // AGAR OXIRGI ODAM KIRGAN BO'LSA -> TERMINALDAN O'CHIRAMIZ / DISABLЕ QILAMIZ
                if (isFullyUsed) {
                    const terminalInfo = match.carousel.terminal;
                    if (terminalInfo) {
                        try {
                            const cleanIp = terminalInfo.ipAddress.split(':')[0];
                            const baseUrl = `http://${cleanIp}:${terminalInfo.port || 80}/ISAPI`;
                            const beginTime = formatHikvisionTime(new Date(Date.now() - 5 * 60 * 1000));
                            
                            const userInfoData = {
                                UserInfo: {
                                    employeeNo: employeeNo,
                                    name: decrypt(match.qrCode.customerName) || 'Used',
                                    userType: 'normal',
                                    Valid: { enable: false, beginTime, endTime: beginTime }
                                }
                            };
                            
                            await hikvisionRequest('PUT', `${baseUrl}/AccessControl/UserInfo/Detail?format=json`, terminalInfo.username, terminalInfo.password, userInfoData);
                            console.log(`[Webhook] Chipta tugadi. Terminalda o'chirildi: ${employeeNo}`);
                        } catch (err) {
                            console.error("[Webhook] Terminalda o'chirishda xato:", err.message);
                        }
                    }
                }
                
                io.emit('qr-used', {
                    orgId,
                    qrCodeId: match.qrCodeId,
                    carouselId: match.carouselId,
                    carouselName: match.carousel.name,
                    usedCount: newUsedCount,
                    quantity: match.quantity,
                    status: isFullyUsed ? 1 : 0
                });
        }
        res.status(200).json({ status: 'OK' });
    } catch (error) {
        console.error('[Webhook] Xatolik:', error.message);
        res.status(500).json({ error: error.message });
    }
});



app.get('/api/status', (req, res) => {
    res.json({ status: 'Backend ishlavotti (WebSockets yoqilgan)' });
});

// --- TERMINALLARNI BOSHQARISH APILARI ---
app.get('/api/terminals', async (req, res) => {
    const { organizationId } = req.query;
    if (!organizationId) return res.status(400).json({ error: "organizationId talab qilinadi" });
    const terminals = await prisma.terminal.findMany({
        where: { organizationId: Number(organizationId) }
    });
    res.json(terminals);
});

app.post('/api/terminals', async (req, res) => {
    try {
        const { name, ipAddress, port, username, password, status, organizationId } = req.body;
        if (!organizationId) return res.status(400).json({ error: "organizationId talab qilinadi" });
        const newTerminal = await prisma.terminal.create({
            data: { 
                name, 
                ipAddress, 
                port: port || "80", 
                username, 
                password, 
                status: status || "active",
                organizationId: Number(organizationId)
            }
        });
        res.status(201).json(newTerminal);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/terminals/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { name, ipAddress, port, username, password, status } = req.body;
        const updated = await prisma.terminal.update({
            where: { id },
            data: { name, ipAddress, port, username, password, status }
        });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/terminals/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { organizationId } = req.query; // Xavfsizlik uchun orgId ni ham tekshirish tavsiya etiladi
        await prisma.terminal.delete({ where: { id } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/terminals/test', async (req, res) => {
    try {
        const { ipAddress, port, username, password } = req.body;
        const cleanIp = ipAddress.split(':')[0];
        const baseUrl = `http://${cleanIp}:${port || 80}/ISAPI`;
        const authString = `${username}:${password}`;
        
        const response = await urllib.request(`${baseUrl}/System/deviceInfo?format=json`, {
            method: 'GET',
            digestAuth: authString
        });
        
        if (response.status >= 200 && response.status < 300) {
            res.json({ success: true, message: "Terminal bilan ulanish muvaffaqiyatli o'rnatildi!" });
        } else {
            res.status(response.status).json({ success: false, message: "Terminalga ulanib bo'lmadi. Status: " + response.status });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Terminal bilan aloqa yo'q: " + error.message });
    }
});

// --- SaaS Authentication ---

// Ro'yxatdan o'tish (New Client Registration)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { orgName, fullName, phone, password } = req.body;
        
        if (!orgName || !fullName || !phone || !password) {
            return res.status(400).json({ error: "Barcha maydonlarni to'ldiring" });
        }

        // 1. Tashkilot yaratish (15 kunlik trial bilan)
        const slug = orgName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + '-' + Math.floor(Math.random() * 9000 + 1000);
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 15); 
        trialEndsAt.setHours(23, 59, 59, 999); // Kun oxirigacha

        const organization = await prisma.organization.create({
            data: { 
                name: orgName, 
                slug: slug,
                trialEndsAt: trialEndsAt
            }
        });

        // 2. Admin foydalanuvchi yaratish
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                fullName,
                phone,
                passwordHash,
                role: 'admin',
                isOwner: true,
                organizationId: organization.id
            }
        });

        res.status(201).json({ 
            message: "Ro'yxatdan o'tish muvaffaqiyatli!", 
            slug: organization.slug,
            trialEndsAt: organization.trialEndsAt
        });
    } catch (e) {
        console.error('[Register Error]:', e.message);
        res.status(500).json({ error: "Tashkilot nomi yoki telefon band bo'lishi mumkin." });
    }
});

// Slug orqali tashkilotni topish (Branded Login uchun)
app.get('/api/orgs/by-slug/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const org = await prisma.organization.findUnique({
            where: { slug },
            select: { id: true, name: true, logoUrl: true, status: true, trialEndsAt: true }
        });

        if (!org) return res.status(404).json({ error: "Tashkilot topilmadi" });
        res.json(org);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        let { phone, password } = req.body;
        if (!phone || !password) return res.status(400).json({ error: "Ma'lumotlar to'liq emas" });

        const cleanPhone = phone.toString().replace(/\D/g, '').slice(-9); 
        
        let user = await prisma.user.findFirst({
            where: { phone: { contains: cleanPhone } },
            include: { organization: true }
        });

        if (!user) return res.status(401).json({ error: "Foydalanuvchi topilmadi" });

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (isValid || password === user.passwordHash) {
            const now = new Date();
            const trialEndsAt = new Date(user.organization.trialEndsAt); // Date ob'ekti ekanligiga ishonch
            const trialExpired = now > trialEndsAt;
            
            // Qolgan kunlarni hisoblash
            const diffTime = trialEndsAt - now;
            const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return res.json({ 
                id: user.id, 
                fullName: user.fullName, 
                role: user.role,
                organizationId: user.organizationId,
                organizationName: user.organization.name,
                organizationSlug: user.organization.slug,
                trialExpired: trialExpired,
                trialEndsAt: trialEndsAt,
                remainingDays: remainingDays > 0 ? remainingDays : 0
            });
        }

        return res.status(401).json({ error: "Parol xato" });
    } catch (e) {
         res.status(500).json({ error: e.message });
    }
});

// --- Foydalanuvchilar, Karusellar va boshqalar ---
app.get('/api/users', async (req, res) => {
    try {
        const { organizationId, role } = req.query;
        let where = {};
        if (organizationId) where.organizationId = Number(organizationId);
        if (role) where.role = role;
        
        const users = await prisma.user.findMany({ 
            where,
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const { fullName, phone, password, role, organizationId } = req.body;
        if (!organizationId) return res.status(400).json({ error: "organizationId talab qilinadi" });

        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                fullName,
                phone,
                passwordHash,
                role: role || 'kassir',
                organizationId: Number(organizationId)
            }
        });
        res.status(201).json(newUser);
    } catch (e) {
        res.status(500).json({ error: "Foydalanuvchi yaratishda xato: " + e.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const user = await prisma.user.findUnique({ where: { id } });
        if (user && user.isOwner) return res.status(403).json({ error: "Tashkilot egasini o'chirib bo'lmaydi" });

        await prisma.user.delete({ where: { id } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.get('/api/carousels', async (req, res) => {
    try {
        const { organizationId } = req.query;
        if (!organizationId) return res.status(400).json({ error: "organizationId talab qilinadi" });
        const carousels = await prisma.carousel.findMany({ 
            where: { organizationId: Number(organizationId) },
            include: { terminal: true, entrepreneur: true } 
        });
        res.json(carousels);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/carousels', async (req, res) => {
    try {
        const { name, price, terminalId, organizationId } = req.body;
        if (!organizationId) return res.status(400).json({ error: "organizationId talab qilinadi" });
        
        // Admin user (Owner) ni topamiz mas'ul shaxs sifatida (default)
        const owner = await prisma.user.findFirst({
            where: { organizationId: Number(organizationId), isOwner: true }
        });

        const newCarousel = await prisma.carousel.create({
            data: {
                name,
                price: Number(price) || 0,
                terminalId: Number(terminalId),
                organizationId: Number(organizationId),
                entrepreneurId: owner?.id || null
            },
            include: { terminal: true, entrepreneur: true }
        });
        res.status(201).json(newCarousel);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/carousels/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { name, price, terminalId } = req.body;
        const updated = await prisma.carousel.update({
            where: { id },
            data: { 
                name, 
                price: Number(price) || 0, 
                terminalId: Number(terminalId) 
            },
            include: { terminal: true, entrepreneur: true }
        });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/carousels/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        await prisma.carousel.delete({ where: { id } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- REPORT APIS (Admin Panel) ---

// Dashboard (SaaS Enabled)
app.get('/api/reports/dashboard', async (req, res) => {
    try {
        const { organizationId } = req.query;
        const orgId = Number(organizationId);

        const [totalSold, totalRefund, terminalsTotal, carousels, sums] = await Promise.all([
            prisma.qRCodeCarousel.count({ where: { carousel: { organizationId: orgId } } }),
            prisma.qRCodeCarousel.count({ where: { status: -1, carousel: { organizationId: orgId } } }),
            prisma.terminal.count({ where: { organizationId: orgId } }),
            prisma.carousel.findMany({ 
                where: { organizationId: orgId },
                include: { qrCodes: { where: { status: 1 } } }
            }),
            prisma.qRCodeCarousel.aggregate({
                where: { status: { not: -1 }, carousel: { organizationId: orgId } },
                _sum: {
                    quantity: true,
                    usedCount: true
                }
            })
        ]);

        const totalRevenue = carousels.reduce((acc, c) => acc + (c.qrCodes.length * (c.price || 0)), 0);
        const totalRides = sums._sum.quantity || 0;
        const usedRides = sums._sum.usedCount || 0;

        res.json({ 
            totalSold: totalSold || 0, 
            totalRefund: totalRefund || 0, 
            activeNow: (totalRides - usedRides) || 0, // Nechta odam hali ishlatmagan (Rides)
            terminalsTotal: terminalsTotal || 0, 
            terminalsActive: terminalsTotal || 0, 
            totalRevenue: totalRevenue || 0,
            totalRides,
            usedRides,
            remainingRides: totalRides - usedRides,
            successRate: totalRides > 0 ? Math.round((usedRides / totalRides) * 100) : 100 
        });
    } catch (e) {
        console.error('[Dashboard Error]:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Carousels Statistics
app.get('/api/reports/carousels', async (req, res) => {
    try {
        const { organizationId } = req.query;
        const carousels = await prisma.carousel.findMany({
            where: { organizationId: Number(organizationId) },
            include: {
                entrepreneur: true,
                qrCodes: true
            }
        });

        const reportData = carousels.map(c => {
            try {
                const validQR = c.qrCodes ? c.qrCodes.filter(rel => rel.status !== -1) : [];
                const totalIssued = validQR.reduce((acc, rel) => acc + (rel.quantity || 1), 0);
                const usedCount = validQR.reduce((acc, rel) => acc + (rel.usedCount || 0), 0);
                const refunded = c.qrCodes ? c.qrCodes.filter(rel => rel.status === -1).reduce((acc, rel) => acc + (rel.quantity || 1), 0) : 0;
                
                const revenue = totalIssued * (c.price || 0);

                return {
                    id: c.id,
                    name: c.name,
                    entrepreneurName: c.entrepreneur?.fullName || "Noma'lum",
                    totalIssued,
                    usedCount,
                    refunded,
                    remaining: totalIssued - usedCount,
                    revenue,
                    validNet: usedCount
                };
            } catch (innerError) {
                return { id: c.id, name: c.name || "Noma'lum", error: true };
            }
        });

        res.json(reportData);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Customers Journal
app.get('/api/reports/customers', async (req, res) => {
    try {
        const qrCodes = await prisma.qRCode.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100, // Oxirgi 100 tasi
            include: {
                carousels: {
                    include: { carousel: true }
                },
                creator: true
            }
        });

        const customerInfo = qrCodes.map(qr => {
            let decName = "Mijoz";
            let decPhone = "Noma'lum";

            try {
                decName = decrypt(qr.customerName) || "Mijoz";
                decPhone = decrypt(qr.customerPhone) || "Noma'lum";
            } catch (err) {
                console.error(`[Report Error] ID ${qr.id} uchun decrypt xatosi:`, err.message);
            }

            return {
                id: qr.id,
                customerName: decName,
                customerPhone: decPhone,
                carousels: qr.carousels.map(rel => ({
                    name: rel.carousel.name,
                    status: rel.status
                })),
                status: qr.status, // -1 bekor, 1 aktiv
                cashierName: qr.creator?.fullName || "Tizim",
                createdAt: qr.createdAt
            };
        });

        res.json(customerInfo);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/api/health', (req, res) => res.status(200).json({ status: 'OK', pid: process.pid }));

// --- SmartStaff (SKUD) APIS ---

// Ishchilar ro'yxati
app.get('/api/staff', async (req, res) => {
    try {
        const { organizationId } = req.query;
        if (!organizationId) return res.status(400).json({ error: "Organization ID talab qilinadi" });
        const staff = await prisma.staff.findMany({
            where: { organizationId: Number(organizationId) },
            orderBy: { fullName: 'asc' }
        });
        res.json(staff);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Yangi ishchi qo'shish
app.post('/api/staff', async (req, res) => {
    try {
        const { fullName, phone, employeeId, organizationId } = req.body;
        if (!organizationId) return res.status(400).json({ error: "Organization ID talab qilinadi" });

        const newStaff = await prisma.staff.create({
            data: {
                fullName,
                phone: phone || "",
                employeeId: String(employeeId),
                organizationId: Number(organizationId)
            }
        });
        res.status(201).json(newStaff);
    } catch (e) {
        res.status(500).json({ error: "Ishchi IDsi band bo'lishi mumkin yoki ma'lumotlarda xatolik" });
    }
});

// Davomat loglari
app.get('/api/staff/attendance', async (req, res) => {
    try {
        const { organizationId } = req.query;
        if (!organizationId) return res.status(400).json({ error: "Organization ID talab qilinadi" });
        
        const logs = await prisma.attendance.findMany({
            where: { staff: { organizationId: Number(organizationId) } },
            include: { staff: true, terminal: true },
            orderBy: { timestamp: 'desc' },
            take: 100
        });
        res.json(logs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Self-Healing (Mavjud Xiva Lokomotivni saqlab qolish) ---
async function ensureXivaLokomotiv() {
    try {
        // 1. Xiva Lokomotiv tashkilotini yaratish (agar yo'q bo'lsa)
        const xivaOrg = await prisma.organization.upsert({
            where: { slug: 'xiva-lokomotiv' },
            update: {},
            create: {
                name: 'XIVA LOKOMOTIV',
                slug: 'xiva-lokomotiv',
                trialEndsAt: new Date('2099-01-01') // Ularga muddatsiz
            }
        });

        const passwordHash = await bcrypt.hash('12345', 10);
        
        // Admin
        await prisma.user.upsert({
            where: { phone: '+998917134713' },
            update: { organizationId: xivaOrg.id },
            create: {
                fullName: 'Admin',
                phone: '+998917134713',
                passwordHash: passwordHash,
                role: 'admin',
                organizationId: xivaOrg.id,
                isOwner: true
            }
        });

        // Kassir
        await prisma.user.upsert({
            where: { phone: '+998907134713' },
            update: { organizationId: xivaOrg.id },
            create: {
                fullName: 'Kassir',
                phone: '+998907134713',
                passwordHash: passwordHash,
                role: 'kassir',
                organizationId: xivaOrg.id
            }
        });
    } catch (e) {
        console.error('[Database] Xiva Sync xatosi:', e.message);
    }
}

// --- SERVER ISHGA TUSHIRISH ---
const PORT = process.env.PORT || 5000;

// Railway (Production): Cluster o'chiq, to'g'ridan-to'g'ri ishga tushadi
// Local (Development): NODE_CLUSTER=true bo'lsa cluster yoqiladi
const useCluster = process.env.NODE_CLUSTER === 'true';

if (useCluster && cluster.isMaster) {
    console.log(`[Master] Master jarayoni ishga tushdi: ${process.pid}`);
    setupPrimary();
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    cluster.on('exit', (worker, code, signal) => {
        console.log(`[Master] Worker o'chdi: ${worker.process.pid}. Qayta tiklanmoqda...`);
        cluster.fork();
    });
} else {
    // Railway va oddiy ishga tushurish uchun
    if (useCluster) {
        io.adapter(createAdapter());
    }
    server.listen(PORT, '0.0.0.0', async () => {
        await tuneDatabase();
        await ensureXivaLokomotiv(); // Xiva uchun barqarorlikni ta'minlash
        console.log(`[Server] SmartAccess SaaS Platform ishga tushdi (Port: ${PORT})`);
    });
}
