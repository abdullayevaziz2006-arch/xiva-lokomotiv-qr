# Xiva Lokomotiv QR Tizimi Tahlili

Ushbu loyiha parkdagi karusellar uchun QR-kod asosidagi kirish nazorati tizimidir. Tizim quyidagi asosiy qismlardan iborat:

## 1. Texnologik stek
- **Backend:** Node.js, Express framework, Prisma ORM.
- **Database:** SQLite (`backend/prisma/dev.db`).
- **Frontend:** React.js (Vite orqali).
- **Integratsiya:** Hikvision ISAPI (XML asosidagi protokol).

## 2. Ma'lumotlar Modeli (Prisma)
- **User:** Admin, Tadbirkor va Kassir rollari.
- **Terminal:** Hikvision qurilmalari (IP, Login/Parol).
- **Carousel:** Har bir karusel ma'lum bir terminalga va tadbirkorga biriktirilgan.
- **QRCode:** Chiptaning asosiy ma'lumotlari.
- **QRCodeCarousel:** Chiptaning qaysi karusellar uchun amal qilishi va ishlatilganlik holati.

## 3. Asosiy Modullar

### Backend (`/backend`)
- `index.js`: API endpointlari (Login, Chipta sotish, Qaytarish, Statistika).
- `updateTerminal.js`: Hikvision qurilmalariga QR kodlarni ISAPI orqali yuklash va o'chirish.
- `prisma/`: Ma'lumotlar bazasi sxemasi va migratsiyalari.

### Frontend (`/frontend`)
- `KassirPanel.jsx`: Chipta sotish interfeysi, terminalga yuborish va chop etish.
- `AdminPanel.jsx`: Foydalanuvchilarni, karusellarni va terminallarni boshqarish.

### Simulyator (`/hikvision_simulator`)
- `simulator.js`: Haqiqiy Hikvision terminali bo'lmaganda tizimni test qilish uchun terminal serverini simulyatsiya qiladi (ISAPI XML formatida javob beradi).

## 4. Ishlash jarayoni (Workflow)
1. Kassir chipta sotadi (QR generatsiya qilinadi).
2. Backend QR ni bazaga yozadi va tegishli Karuselning Terminaliga (Hikvision) yuboradi.
3. Mijoz terminalda QR ni skanerlaganda, terminal kirishga ruxsat beradi (yoki rad etadi).
4. Qaytarish (Refund) jarayonida terminaldan QR o'chiriladi va haqiqiy foydalanish holati (`AcsEvent`) tekshiriladi.
