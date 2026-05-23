const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Find or create Organization
  let org = await prisma.organization.findFirst({
    where: { name: 'SmartPark Test Tashkilot' }
  });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'SmartPark Test Tashkilot',
        slug: 'smartpark-test-' + Math.floor(Math.random() * 9000 + 1000)
      }
    });
  }
  console.log('Tashkilot:', org.name, 'ID:', org.id);

  // 2. Create or update User
  const user = await prisma.user.upsert({
    where: { phone: '+998777343201' },
    update: {
      fullName: 'Mirazim',
      role: 'admin',
      organizationId: org.id
    },
    create: {
      fullName: 'Mirazim',
      phone: '+998777343201',
      passwordHash: 'dummy_hash',
      role: 'admin',
      organizationId: org.id,
      isOwner: true
    }
  });
  console.log('Foydalanuvchi yaratildi/yangilandi:', user.fullName, 'Telefon:', user.phone);

  // 3. Link ParkingLot cd8a3ffc-9fdd-4c21-8688-cd73629a0ffd to this Organization
  const lotId = 'cd8a3ffc-9fdd-4c21-8688-cd73629a0ffd';
  let lot = await prisma.parkingLot.findUnique({ where: { id: lotId } });
  if (lot) {
    await prisma.parkingLot.update({
      where: { id: lotId },
      data: {
        organizationId: org.id,
        name: 'SmartPark Asosiy Shlagbaum'
      }
    });
    console.log('Shlagbaum (Lot) tashkilotga muvaffaqiyatli bog\'landi.');
  } else {
    // Agar lot hali bazada bo'lmasa, uni yaratamiz
    await prisma.parkingLot.create({
      data: {
        id: lotId,
        name: 'SmartPark Asosiy Shlagbaum',
        organizationId: org.id
      }
    });
    console.log('Shlagbaum (Lot) yangidan yaratildi va tashkilotga bog\'landi.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
