const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const qr = await prisma.qRCode.findFirst({
        where: { qrString: '4836943218' }
    });
    console.log("Found QR:", JSON.stringify(qr, null, 2));
}
main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
