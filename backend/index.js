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
const os = require('os');

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

app.use(cors());
// Global cheklovlar (Katta ma'lumotlarni tarmoq darajasida to'xtatish)
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// Webhook uchun juda qattiq cheklov (Rasm va og'ir binary data kirmasligi uchun)
app.use('/api/events', express.text({ type: '*/*', limit: '10kb' }));

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

// QrCode generator yordamchi funksiya
function generateUniqueCode() {
  // Masalan: QR-A7F3K9M2 ko'rinishida (11 belgili)
  return 'QR-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Vaqt formatlovchi (Hikvision formati: YYYY-MM-DDTHH:mm:ss)
function formatHikvisionTime(date) {
  // ISO-8601 formati "T" harfi bilan Hikvision uchun ideal ishlaydi.
  return date.toISOString().split('.')[0];
}

// Hikvision maxsus so'rov yuboruvchi log funksiyasi
async function hikvisionRequest(method, url, username, password, data = null) {
    const authString = `${username}:${password}`;
    
    console.log(`[Hikvision] So'rov: ${method} ${url}`);
    if (data) console.log(`[Hikvision] JSON data:`, JSON.stringify(data));
    
    const options = {
        method: method,
        digestAuth: authString,
        headers: { 'Content-Type': 'application/json' },
        dataType: 'text',
        timeout: 30000
    };
    
    if (data) {
        options.data = JSON.stringify(data);
    }
    
    try {
        const response = await request(url, options);
        console.log(`[Hikvision] Javob status: ${response.status}`);
        console.log(`[Hikvision] Javob data:`, response.data.toString());
        
        if (response.status !== 200) {
            throw new Error(`HTTP ${response.status}: ${response.data.toString()}`);
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
            cardNo: qrCodeData,
            cardType: 'normalCard', // DS-K1T671MF qrCode o'rniga normalCard kutadi
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
app.post('/api/qrcodes/generate', async (req, res) => {
  try {
    const { carousels, createdBy, customerName, customerPhone } = req.body;

    if (!carousels || !carousels.length) {
      return res.status(400).json({ error: 'Hech qanday o\'yingoh tanlanmagan' });
    }

    // 1. Karusel va ulangan Terminallarni topamiz
    const fetchedCarousels = await prisma.carousel.findMany({
      where: { id: { in: carousels } },
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
    const employeeNo = qrString.replace(/-/g, '').substring(0, 32); 
    const formattedEndTime = formatHikvisionTime(expiresAt);

    // Dastlab ma'lumotlar bazasida yaratib saqlaymiz, status: 0 (kutish)
    let newQRCode = await prisma.qRCode.create({
      data: {
        qrString,
        expiresAt,
        createdBy,
        status: 0,
        customerName: encryptedName,
        customerPhone: encryptedPhone,
        carousels: {
          create: fetchedCarousels.map(c => ({
             carouselId: c.id,
             status: 0
          }))
        }
      },
      include: { carousels: true }
    });

    // 3. QR Kodni mos terminallarga yuklaymiz
    const finalName = customerName || "Mijoz";
    let terminalErrors = [];

    for (const carousel of fetchedCarousels) {
        if (!carousel.terminal) continue;
        try {
            await uploadQRToTerminal(carousel.terminal, qrString, employeeNo, formattedEndTime, finalName);
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
            message: "Qisman yuklandi. Baza xatoliklari mavjud.", 
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

// QR kodni qayta yuklash (Retry) Endpoint
app.post('/api/qrcodes/:id/retry', async (req, res) => {
    try {
        const qrId = Number(req.params.id);
        const qr = await prisma.qRCode.findUnique({
            where: { id: qrId },
            include: { carousels: { include: { carousel: { include: { terminal: true } } } } }
        });

        if (!qr) return res.status(404).json({ error: "QR kod topilmadi" });

        const employeeNo = qr.qrString.replace(/-/g, '').substring(0, 32);
        const formattedEndTime = formatHikvisionTime(qr.expiresAt);
        const decName = decrypt(qr.customerName) || "Mijoz";

        let errors = [];
        for (const rel of qr.carousels) {
            if (rel.status === -1) continue; // Agar vozvrat qilingan bo'lsa, yuklamaydi
            const term = rel.carousel?.terminal;
            if (term) {
                try {
                    await uploadQRToTerminal(term, qr.qrString, employeeNo, formattedEndTime, decName);
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
// QR ni Qidirish (Vozvrat oynasi uchun)
app.get('/api/qrcodes/search', async (req, res) => {
    try {
        const { query } = req.query; // Kassir QR kodni, ismini yoki raqamini yozadi
        if (!query) return res.status(400).json({ error: "Qidiruv so'zini kiriting" });
        
        // 1. Dastlab aniq QR String bo'yicha qarab ko'ramiz
        let qr = await prisma.qRCode.findUnique({
            where: { qrString: query },
            include: { carousels: { include: { carousel: { include: { terminal: true } } } } }
        });

        // 2. Agar topilmasa Telefon raqam yoki Ism ekanligini taxmin qilib, AES-256 dekriptsiya bilan oxirgi 500 tadan qidiramiz
        if (!qr) {
            const recentQRs = await prisma.qRCode.findMany({
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
                           findField(event, 'EmployeeNoString', rawDataForSearch);
        const name = findField(event, 'name', rawDataForSearch) || 
                     findField(event, 'Name', rawDataForSearch);

        if (employeeNo || name) {
            console.log(`[Webhook] Aniqlangan -> ID: ${employeeNo}, Ism: ${name}`);

            // 1. IP orqali qaysi terminal kelayotganini aniqlaymiz (Muhim!)
            const terminal = await prisma.terminal.findFirst({
                where: { ipAddress: { contains: sourceIp } }
            });

            if (!terminal) {
                console.warn(`[Webhook] Noma'lum terminal IP: ${sourceIp}. Filtrlashsiz qidiramiz.`);
            }

            // 2. Bazadan ushbu name yoki employeeNo ga mos chiptani izlaymiz (faqat 'Expected' holatdagilar)
            const pendingEvents = await prisma.qRCodeCarousel.findMany({
                where: {
                    status: 0,
                    ...(terminal ? { carousel: { terminalId: terminal.id } } : {})
                },
                include: { qrCode: true, carousel: true }
            });

            // Ularni JavaScript da decrypt qilib solishtiramiz
            const match = pendingEvents.find(rel => {
                try {
                    const normIncoming = normalizeName(name);
                    const normDec = normalizeName(decrypt(rel.qrCode.customerName));
                    
                    const incomingID = employeeNo ? employeeNo.toString().replace(/QR/i, '').replace(/-/g, '').toLowerCase().trim() : "";
                    const cleanID = rel.qrCode.qrString.replace(/QR/i, '').replace(/-/g, '').toLowerCase().trim();
                    
                    // Aniq ID bo'yicha moslik (Eng ishonchli)
                    const matchID = incomingID !== "" && (cleanID.includes(incomingID) || incomingID.includes(cleanID));

                    // Ism bo'yicha moslik (Order-independent)
                    const wordsDec = normDec.split(' ').filter(w => w.length > 1);
                    const wordsIncoming = normIncoming.split(' ').filter(w => w.length > 1);
                    const matchName = normIncoming !== "" && (
                        normDec.includes(normIncoming) || 
                        normIncoming.includes(normDec) ||
                        (wordsIncoming.length > 0 && wordsIncoming.every(w => wordsDec.includes(w)))
                    );
                    
                    if (matchID || matchName) {
                        console.log(`[Webhook] Match topildi! ID Match: ${matchID}, Name Match: ${matchName} (Dec: ${normDec}, Incoming: ${name})`);
                    }
                    
                    return matchID || matchName;
                } catch (err) {
                    console.error(`[Webhook] Solishtirishda xato (QR: ${rel.qrCode.qrString}):`, err.message);
                    return false;
                }
            });

            if (match) {
                console.log(`[Webhook] MOSLIK TOPILDI: ID=${match.qrCode.qrString}, Ism=${decrypt(match.qrCode.customerName)}`);
                await prisma.qRCodeCarousel.update({
                    where: { id: match.id },
                    data: { status: 1, usedAt: new Date() }
                });
                
                io.emit('qr-used', {
                    qrCodeId: match.qrCodeId,
                    carouselId: match.carouselId,
                    qrString: match.qrCode.qrString,
                    carouselName: match.carousel.name,
                    status: 1
                });
                console.log(`[Webhook] BAZA YANGILANDI: ${match.qrCode.qrString} -> ${match.carousel.name}`);
            } else {
                console.warn(`[Webhook] Mos chipta topilmadi. Kelgan: ID=${employeeNo}, Name=${name}`);
            }
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
    const terminals = await prisma.terminal.findMany();
    res.json(terminals);
});

app.post('/api/terminals', async (req, res) => {
    try {
        const { name, ipAddress, port, username, password, status } = req.body;
        const newTerminal = await prisma.terminal.create({
            data: { name, ipAddress, port: port || "80", username, password, status: status || "active" }
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
        await prisma.terminal.delete({ where: { id: Number(req.params.id) } });
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
        
        const response = await request(`${baseUrl}/System/deviceInfo?format=json`, {
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

// --- Avtorizatsiya (Login) API ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        const user = await prisma.user.findUnique({ where: { phone } });
        if (!user) return res.status(401).json({ error: "Xato" });

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
             if (password !== user.passwordHash) return res.status(401).json({ error: "Xato" });
        }

        return res.json({ id: user.id, fullName: user.fullName, phone: user.phone, role: user.role });
    } catch (e) {
         res.status(500).json({ error: e.message });
    }
});

// --- Foydalanuvchilar, Karusellar va boshqalar ---
app.get('/api/users', async (req, res) => {
    const users = await prisma.user.findMany();
    res.json(users);
});
app.get('/api/carousels', async (req, res) => {
    const carousels = await prisma.carousel.findMany({ include: { terminal: true, entrepreneur: true } });
    res.json(carousels);
});

// --- REPORT APIS (Admin Panel) ---

// Dashboard (Basic)
app.get('/api/reports/dashboard', async (req, res) => {
    try {
        const [totalSold, totalRefund, terminalsTotal] = await Promise.all([
            prisma.qRCodeCarousel.count(),
            prisma.qRCodeCarousel.count({ where: { status: -1 } }),
            prisma.terminal.count()
        ]);

        res.json({ 
            totalSold: totalSold || 0, 
            totalRefund: totalRefund || 0, 
            activeNow: (totalSold - totalRefund) || 0, 
            terminalsTotal: terminalsTotal || 0, 
            terminalsActive: terminalsTotal || 0, 
            successRate: 100 
        });
    } catch (e) {
        console.error('[Dashboard Error]:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Carousels Statistics
app.get('/api/reports/carousels', async (req, res) => {
    try {
        const carousels = await prisma.carousel.findMany({
            include: {
                entrepreneur: true,
                qrCodes: true
            }
        });

        const reportData = carousels.map(c => {
            try {
                const totalIssued = c.qrCodes ? c.qrCodes.length : 0;
                const refunded = c.qrCodes ? c.qrCodes.filter(rel => rel.status === -1).length : 0;
                const usedCount = c.qrCodes ? c.qrCodes.filter(rel => rel.status === 1).length : 0;
                const validNet = usedCount; // Sof foyda = haqiqatda minganlar

                return {
                    id: c.id,
                    name: c.name,
                    entrepreneurName: c.entrepreneur?.fullName || "Noma'lum",
                    totalIssued,
                    refunded,
                    usedCount,
                    validNet
                };
            } catch (innerError) {
                console.error(`[Carousel Report Row Error] ID: ${c.id}:`, innerError.message);
                return {
                    id: c.id,
                    name: c.name || "Noma'lum",
                    entrepreneurName: "Xatolik",
                    totalIssued: 0,
                    refunded: 0,
                    validNet: 0
                };
            }
        });

        // Ommaboplik bo'yicha saralash (eng ko'p tashrif buyurilganlar yuqorida)
        reportData.sort((a, b) => b.validNet - a.validNet);

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

// --- SERVER ISHGA TUSHIRISH (CLUSTERING) ---
const PORT = process.env.PORT || 5000;

if (cluster.isMaster) {
    console.log(`[Master] Master jarayoni ishga tushdi: ${process.pid}`);
    
    // Cluster adapter primary setup
    setupPrimary();

    // Har bir yadro uchun server nusxasini (Worker) yaratish
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`[Master] Worker o'chdi: ${worker.process.pid}. Qayta tiklanmoqda...`);
        cluster.fork();
    });
} else {
    // Worker'lar tomonidan serverni tinglash
    io.adapter(createAdapter());

    server.listen(PORT, '0.0.0.0', async () => {
        await tuneDatabase();
        console.log(`[Worker] Server ${process.pid} ishga tushdi (Port: ${PORT})`);
    });
}
