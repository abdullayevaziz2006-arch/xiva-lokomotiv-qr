const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const rels = await prisma.qRCodeCarousel.findMany({
        where: { qrCodeId: 10 },
        include: { carousel: true }
    });
    console.log("QRCodeCarousel for ID 10:", JSON.stringify(rels, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
