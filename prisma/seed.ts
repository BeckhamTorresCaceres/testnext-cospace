import { PrismaClient, Role, SpaceType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando proceso de seed en Supabase...');

  // 1. Limpieza controlada en desarrollo (orden inverso de dependencias)
  await prisma.booking.deleteMany();
  await prisma.space.deleteMany();
  await prisma.user.deleteMany();

  // 2. Creación del Administrador del Sistema
  const adminPasswordHash = await bcrypt.hash('AdminCoSpace2026!', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Super Admin CoSpace',
      email: 'admin@cospace.dev',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });
  console.log(`Administrador creado: ${admin.email} (Rol: ${admin.role})`);

  // 3. Creación de un usuario estándar para pruebas inmediatas
  const userPasswordHash = await bcrypt.hash('UserCoSpace2026!', 10);
  const testUser = await prisma.user.create({
    data: {
      name: 'Carlos Mendoza',
      email: 'carlos@ejemplo.com',
      passwordHash: userPasswordHash,
      role: Role.USER,
    },
  });
  console.log(`Usuario demo creado: ${testUser.email}`);

  // 4. Creación de Catálogo Inicial de Espacios
  const spacesData = [
    {
      name: 'Hot Desk Central 01',
      description:
        'Puesto de trabajo flexible en área abierta, iluminación natural, conexión de alta velocidad y café de especialidad ilimitado.',
      type: SpaceType.DESK,
      capacity: 1,
      pricePerHour: 12.0,
      imageUrl:
        'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=1200&q=80',
      isActive: true,
    },
    {
      name: 'Hot Desk Quiet Zone 04',
      description:
        'Escritorio individual en zona silenciosa con silla ergonómica Herman Miller y monitor 4K disponible.',
      type: SpaceType.DESK,
      capacity: 1,
      pricePerHour: 15.0,
      imageUrl:
        'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      isActive: true,
    },
    {
      name: 'Sala de Juntas Innovación',
      description:
        'Sala de reuniones equipada con pantalla táctil de 75 pulgadas, sistema de videoconferencia Logitech 4K y pizarra de cristal.',
      type: SpaceType.MEETING_ROOM,
      capacity: 8,
      pricePerHour: 45.0,
      imageUrl:
        'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1200&q=80',
      isActive: true,
    },
    {
      name: 'Sala Creativa Workshop',
      description:
        'Espacio dinámico con mobiliario modular, proyector láser, rotafolios y ambiente acústicamente aislado.',
      type: SpaceType.MEETING_ROOM,
      capacity: 12,
      pricePerHour: 60.0,
      imageUrl:
        'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80',
      isActive: true,
    },
    {
      name: 'Cabina Acústica Focus Alpha',
      description:
        'Cabina insonorizada individual ideal para videollamadas privadas, entrevistas o grabaciones con ventilación activa.',
      type: SpaceType.BOOTH,
      capacity: 1,
      pricePerHour: 18.0,
      imageUrl:
        'https://images.unsplash.com/photo-1572021335469-31706a17aaef?auto=format&fit=crop&w=1200&q=80',
      isActive: true,
    },
    {
      name: 'Cabina Dúo Podcast / Entrevistas',
      description:
        'Cabina acústica para 2 personas con micrófonos Shure MV7 preconfigurados, brazos articulados y aislamiento acústico de 32dB.',
      type: SpaceType.BOOTH,
      capacity: 2,
      pricePerHour: 28.0,
      imageUrl:
        'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
      isActive: true,
    },
  ];

  for (const space of spacesData) {
    await prisma.space.create({ data: space });
  }

  console.log(`Catálogo creado exitosamente: ${spacesData.length} espacios agregados.`);
}

main()
  .catch((e) => {
    console.error('Error durante la ejecución del seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
