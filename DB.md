# Especificación y Diseño de Base de Datos - CoSpace

**Proyecto:** CoSpace - Plataforma de Reservas de Coworking  
**Motor de Base de Datos:** PostgreSQL 15+ (Alojada en Supabase)  
**ORM:** Prisma ORM  
**Versión de Esquema:** 1.2.0  
**Fecha:** 27 de octubre de 2026  

---

## 1. Estrategia de Conectividad e Infraestructura en Supabase

Para soportar de manera eficiente el entorno serverless de Next.js 16 (desplegado en Vercel) y al mismo tiempo permitir la ejecución de migraciones y operaciones de seed sin bloqueos, se implementa una arquitectura de doble cadena de conexión.

```
                    +------------------------------------------+
                    |           Next.js 16 Runtime             |
                    |     (Vercel Serverless Functions)        |
                    +--------------------+---------------------+
                                         |
                                         | DATABASE_URL (Puerto 6543)
                                         v
                    +------------------------------------------+
                    |        Supabase Transaction Pooler       |
                    |                (PgBouncer)               |
                    +--------------------+---------------------+
                                         |
                                         | Pool de conexiones
                                         v
+------------------------+  DIRECT_URL   +------------------------------------+
|  Migraciones & Seeds   +-------------->+       PostgreSQL Database          |
| (CLI / Prisma Migrate) | (Puerto 5432) |            (Supabase)              |
+------------------------+               +------------------------------------+
```

### 1.1 Variables de Conexión
* **`DATABASE_URL` (Puerto 6543):** Apunta al Transaction Pooler de Supabase con `?pgbouncer=true`. Maneja cientos de funciones serverless efímeras reutilizando conexiones TCP.
* **`DIRECT_URL` (Puerto 5432):** Conexión directa a PostgreSQL necesaria para operaciones con bloqueo de catálogo, DDL (`npx prisma migrate dev`), advisory locks y scripts CLI (`npx prisma db seed`).

---

## 2. Diagrama Entidad-Relación (ERD)

```
       +---------------------------------------------+
       |                    User                     |
       +---------------------------------------------+
       | id               : UUID             [PK]    |
       | name             : VARCHAR(120)             |
       | email            : VARCHAR(150)     [UQ]    |
       | passwordHash     : VARCHAR(255)             |
       | role             : Role (USER|ADMIN)        |
       | refreshTokenHash : VARCHAR(255)     [NULL]  |
       | createdAt        : TIMESTAMPTZ              |
       | updatedAt        : TIMESTAMPTZ              |
       +----------------------+----------------------+
                              | 1
                              |
                              | N (onDelete: Restrict)
                              v
       +---------------------------------------------+
       |                   Booking                   |
       +---------------------------------------------+
       | id                   : UUID         [PK]    |
       | userId               : UUID         [FK]    |
       | spaceId              : UUID         [FK]    |
       | startTime            : TIMESTAMPTZ          |
       | endTime              : TIMESTAMPTZ          |
       | totalHours           : SMALLINT             |
       | pricePerHourSnapshot : DECIMAL(10,2)        |
       | totalPrice           : DECIMAL(10,2)        |
       | status               : BookingStatus        |
       | createdAt            : TIMESTAMPTZ          |
       | updatedAt            : TIMESTAMPTZ          |
       +----------------------+----------------------+
                              ^
                              | N (onDelete: Restrict)
                              |
                              | 1
       +----------------------+----------------------+
       |                    Space                    |
       +---------------------------------------------+
       | id           : UUID                 [PK]    |
       | name         : VARCHAR(100)                 |
       | description  : TEXT                         |
       | type         : SpaceType                    |
       | capacity     : INTEGER                      |
       | pricePerHour : DECIMAL(10,2)                |
       | imageUrl     : VARCHAR(500)                 |
       | isActive     : BOOLEAN              [T/F]   |
       | createdAt    : TIMESTAMPTZ                  |
       | updatedAt    : TIMESTAMPTZ                  |
       +---------------------------------------------+
```

---

## 3. Esquema Prisma Completo (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Role {
  USER
  ADMIN
}

enum SpaceType {
  DESK          // Escritorio flexible o fijo
  MEETING_ROOM  // Sala de reuniones
  BOOTH         // Cabina acústica privada
}

enum BookingStatus {
  CONFIRMED
  CANCELLED
}

model User {
  id               String    @id @default(uuid())
  name             String    @db.VarChar(120)
  email            String    @unique @db.VarChar(150)
  passwordHash     String    @db.VarChar(255)
  role             Role      @default(USER)
  refreshTokenHash String?   @db.VarChar(255)
  bookings         Booking[]
  createdAt        DateTime  @default(now()) @db.Timestamptz()
  updatedAt        DateTime  @updatedAt @db.Timestamptz()

  @@index([email])
  @@map("users")
}

model Space {
  id           String    @id @default(uuid())
  name         String    @db.VarChar(100)
  description  String    @db.Text
  type         SpaceType
  capacity     Int       @db.Integer
  pricePerHour Decimal   @db.Decimal(10, 2)
  imageUrl     String    @db.VarChar(500)
  isActive     Boolean   @default(true)
  bookings     Booking[]
  createdAt    DateTime  @default(now()) @db.Timestamptz()
  updatedAt    DateTime  @updatedAt @db.Timestamptz()

  @@index([isActive])
  @@index([type])
  @@map("spaces")
}

model Booking {
  id                   String        @id @default(uuid())
  userId               String
  spaceId              String
  startTime            DateTime      @db.Timestamptz()
  endTime              DateTime      @db.Timestamptz()
  totalHours           Int           @db.SmallInt
  pricePerHourSnapshot Decimal       @db.Decimal(10, 2)
  totalPrice           Decimal       @db.Decimal(10, 2)
  status               BookingStatus @default(CONFIRMED)
  createdAt            DateTime      @default(now()) @db.Timestamptz()
  updatedAt            DateTime      @updatedAt @db.Timestamptz()

  user  User  @relation(fields: [userId], references: [id], onDelete: Restrict)
  space Space @relation(fields: [spaceId], references: [id], onDelete: Restrict)

  @@index([spaceId, status, startTime, endTime])
  @@index([userId, status, startTime, endTime])
  @@index([status, startTime])
  @@map("bookings")
}
```

---

## 4. Diccionario de Datos

### 4.1 Tabla `users`

| Columna | Tipo de Dato | Modificadores | Descripción |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, `NOT NULL` | Identificador único del usuario. |
| `name` | `VARCHAR(120)` | `NOT NULL` | Nombre completo del usuario. |
| `email` | `VARCHAR(150)` | `NOT NULL`, `UNIQUE` | Correo electrónico de acceso. |
| `passwordHash` | `VARCHAR(255)` | `NOT NULL` | Hash bcrypt (10 rounds) de la contraseña. |
| `role` | `Role` (ENUM) | `NOT NULL`, `DEFAULT 'USER'` | Rol del usuario (`USER` o `ADMIN`). |
| `refreshTokenHash`| `VARCHAR(255)` | `NULLABLE` | Hash bcrypt del Refresh Token activo. Nulo si no hay sesión. |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Fecha de registro en base de datos. |
| `updatedAt` | `TIMESTAMPTZ` | `NOT NULL` | Timestamp de última modificación. |

### 4.2 Tabla `spaces`

| Columna | Tipo de Dato | Modificadores | Descripción |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, `NOT NULL` | Identificador único del espacio. |
| `name` | `VARCHAR(100)` | `NOT NULL` | Nombre legible del espacio. |
| `description` | `TEXT` | `NOT NULL` | Descripción y amenidades del espacio. |
| `type` | `SpaceType` (ENUM)| `NOT NULL` | Categoría: `DESK`, `MEETING_ROOM`, `BOOTH`. |
| `capacity` | `INTEGER` | `NOT NULL` | Número máximo de personas permitidas. |
| `pricePerHour` | `DECIMAL(10,2)`| `NOT NULL` | Tarifa monetaria vigente por hora. |
| `imageUrl` | `VARCHAR(500)` | `NOT NULL` | URL de la imagen optimizada para `next/image`. |
| `isActive` | `BOOLEAN` | `NOT NULL`, `DEFAULT true` | Borrado lógico: `false` oculta el espacio del catálogo. |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Fecha de creación del espacio. |
| `updatedAt` | `TIMESTAMPTZ` | `NOT NULL` | Timestamp de última actualización. |

### 4.3 Tabla `bookings`

| Columna | Tipo de Dato | Modificadores | Descripción |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, `NOT NULL` | Identificador único de la reserva. |
| `userId` | `UUID` | `FOREIGN KEY`, `NOT NULL` | Referencia al usuario que realiza la reserva. |
| `spaceId` | `UUID` | `FOREIGN KEY`, `NOT NULL` | Referencia al espacio físico reservado. |
| `startTime` | `TIMESTAMPTZ` | `NOT NULL` | Fecha y hora de inicio (UTC). |
| `endTime` | `TIMESTAMPTZ` | `NOT NULL` | Fecha y hora de finalización (UTC). |
| `totalHours` | `SMALLINT` | `NOT NULL` | Duración calculada en horas enteras ($1 \le h \le 4$). |
| `pricePerHourSnapshot` | `DECIMAL(10,2)` | `NOT NULL` | Tarifa horaria congelada al momento de la reserva. |
| `totalPrice` | `DECIMAL(10,2)` | `NOT NULL` | Total calculado en servidor ($\text{totalHours} \times \text{snapshot}$). |
| `status` | `BookingStatus` (ENUM) | `NOT NULL`, `DEFAULT 'CONFIRMED'` | Estado: `CONFIRMED` o `CANCELLED`. |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Momento en el que se confirmó la reserva. |
| `updatedAt` | `TIMESTAMPTZ` | `NOT NULL` | Momento de última actualización o cancelación. |

---

## 5. Mapeo de Reglas de Negocio a Consultas SQL / Transacciones

### 5.1 Prevención de Solapamientos (Reglas RN-04 y RN-05)
Dos reservas $[A_{\text{start}}, A_{\text{end}})$ y $[B_{\text{start}}, B_{\text{end}})$ se solapan si y solo si:
$$A_{\text{start}} < B_{\text{end}} \quad \land \quad A_{\text{end}} > B_{\text{start}}$$
El uso de comparadores estrictos (`<` y `>`) asegura que si una reserva termina a las 12:00, otra pueda iniciar a las 12:00 sin generar conflicto.

#### Detección de solape en espacio (RN-04):
```sql
SELECT id FROM bookings
WHERE "spaceId" = $spaceId
  AND "status" = 'CONFIRMED'
  AND "startTime" < $newEndTime
  AND "endTime" > $newStartTime
LIMIT 1;
```

#### Detección de solape para el mismo usuario (RN-05):
```sql
SELECT id FROM bookings
WHERE "userId" = $userId
  AND "status" = 'CONFIRMED'
  AND "startTime" < $newEndTime
  AND "endTime" > $newStartTime
LIMIT 1;
```

### 5.2 Límite de 3 Reservas Futuras Activas (RN-06)
```sql
SELECT COUNT(*) FROM bookings
WHERE "userId" = $userId
  AND "status" = 'CONFIRMED'
  AND "startTime" > NOW();
```

### 5.3 Validación para Desactivación de Espacio (RN-13)
Antes de actualizar `isActive = false`, se verifica que el espacio no tenga compromisos futuros:
```sql
SELECT COUNT(*) FROM bookings
WHERE "spaceId" = $spaceId
  AND "status" = 'CONFIRMED'
  AND "startTime" > NOW();
```

---

## 6. Transacción Atómica Interactiva para Creación de Reservas

Para evitar condiciones de carrera cuando dos usuarios intentan reservar el mismo bloque de tiempo en el mismo milisegundo, la operación se encierra en una transacción interactiva de Prisma:

```typescript
// src/features/bookings/server/booking.service.ts
import { prisma } from '@/core/db';
import { ConflictError, BadRequestError, NotFoundError } from '@/core/errors';

export async function createBookingTransaction(params: {
  userId: string;
  spaceId: string;
  startTime: Date;
  endTime: Date;
  totalHours: number;
}) {
  const { userId, spaceId, startTime, endTime, totalHours } = params;

  return await prisma.$transaction(async (tx) => {
    // 1. Validar existencia y disponibilidad del espacio (RN-07)
    const space = await tx.space.findUnique({
      where: { id: spaceId },
    });

    if (!space) {
      throw new NotFoundError('El espacio solicitado no existe.');
    }

    if (!space.isActive) {
      throw new ConflictError('No se puede reservar un espacio desactivado.');
    }

    // 2. Validar límite de reservas futuras del usuario (RN-06)
    const now = new Date();
    const activeFutureBookings = await tx.booking.count({
      where: {
        userId,
        status: 'CONFIRMED',
        startTime: { gt: now },
      },
    });

    if (activeFutureBookings >= 3) {
      throw new ConflictError('El usuario ya cuenta con el máximo permitido de 3 reservas futuras.');
    }

    // 3. Validar solapamiento por usuario (RN-05)
    const userOverlap = await tx.booking.findFirst({
      where: {
        userId,
        status: 'CONFIRMED',
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    if (userOverlap) {
      throw new ConflictError('Ya tienes otra reserva confirmada en este mismo horario.');
    }

    // 4. Validar solapamiento en el espacio físico (RN-04)
    const spaceOverlap = await tx.booking.findFirst({
      where: {
        spaceId,
        status: 'CONFIRMED',
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    if (spaceOverlap) {
      throw new ConflictError('El espacio ya cuenta con una reserva confirmada en este intervalo de tiempo.');
    }

    // 5. Cálculo estricto del precio en servidor (RN-08) y snapshot
    const pricePerHour = Number(space.pricePerHour);
    const calculatedTotal = Number((pricePerHour * totalHours).toFixed(2));

    // 6. Persistencia atómica
    return await tx.booking.create({
      data: {
        userId,
        spaceId,
        startTime,
        endTime,
        totalHours,
        pricePerHourSnapshot: pricePerHour,
        totalPrice: calculatedTotal,
        status: 'CONFIRMED',
      },
      include: {
        space: {
          select: {
            name: true,
            type: true,
            imageUrl: true,
          },
        },
      },
    });
  });
}
```

---

## 7. Script de Inicialización y Seed (`prisma/seed.ts`)

Este script crea el usuario administrador predeterminado y el catálogo inicial de 6 espacios representativos.

```typescript
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
      description: 'Puesto de trabajo flexible en área abierta, iluminación natural, conexión de alta velocidad y café de especialidad ilimitado.',
      type: SpaceType.DESK,
      capacity: 1,
      pricePerHour: 12.00,
      imageUrl: 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=1200&q=80',
      isActive: true,
    },
    {
      name: 'Hot Desk Quiet Zone 04',
      description: 'Escritorio individual en zona silenciosa con silla ergonómica Herman Miller y monitor 4K disponible.',
      type: SpaceType.DESK,
      capacity: 1,
      pricePerHour: 15.00,
      imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      isActive: true,
    },
    {
      name: 'Sala de Juntas Innovación',
      description: 'Sala de reuniones equipada con pantalla táctil de 75 pulgadas, sistema de videoconferencia Logitech 4K y pizarra de cristal.',
      type: SpaceType.MEETING_ROOM,
      capacity: 8,
      pricePerHour: 45.00,
      imageUrl: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1200&q=80',
      isActive: true,
    },
    {
      name: 'Sala Creativa Workshop',
      description: 'Espacio dinámico con mobiliario modular, proyector láser, rotafolios y ambiente acústicamente aislado.',
      type: SpaceType.MEETING_ROOM,
      capacity: 12,
      pricePerHour: 60.00,
      imageUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80',
      isActive: true,
    },
    {
      name: 'Cabina Acústica Focus Alpha',
      description: 'Cabina insonorizada individual ideal para videollamadas privadas, entrevistas o grabaciones con ventilación activa.',
      type: SpaceType.BOOTH,
      capacity: 1,
      pricePerHour: 18.00,
      imageUrl: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?auto=format&fit=crop&w=1200&q=80',
      isActive: true,
    },
    {
      name: 'Cabina Dúo Podcast / Entrevistas',
      description: 'Cabina acústica para 2 personas con micrófonos Shure MV7 preconfigurados, brazos articulados y aislamiento acústico de 32dB.',
      type: SpaceType.BOOTH,
      capacity: 2,
      pricePerHour: 28.00,
      imageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
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
```

---

## 8. Procedimientos y Comandos de Ejecución

### 8.1 Configuración de Scripts en `package.json`
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:deploy": "prisma migrate deploy",
    "prisma:seed": "prisma db seed",
    "prisma:studio": "prisma studio"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

### 8.2 Secuencia de Configuración de Base de Datos
1. Crear un proyecto en [Supabase](https://supabase.com).
2. Obtener la cadena de conexión del pooler (puerto 6543) y la conexión directa (puerto 5432) en *Project Settings -> Database*.
3. Copiar y completar las variables en el archivo `.env`:
   ```bash
   cp .env.example .env
   ```
4. Ejecutar la migración inicial:
   ```bash
   npx prisma migrate dev --name init_cospace_schema
   ```
5. Poblar el administrador y el catálogo de espacios:
   ```bash
   npx prisma db seed
   ```
6. Inspeccionar visualmente los datos generados:
   ```bash
   npx prisma studio
   ```