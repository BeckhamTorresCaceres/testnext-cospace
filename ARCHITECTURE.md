# Arquitectura por Features (Feature-Driven Architecture) - CoSpace

**Proyecto:** CoSpace - Plataforma de Reservas de Espacios de Coworking  
**Versión:** 1.0.0  
**Enfoque Arquitectónico:** Modular Vertical Slice / Feature-Driven Development  
**Framework:** Next.js 16 (App Router) + TypeScript Strict (sin `any`)  

---

## 1. Fundamentos y Principios del Enfoque por Features

La arquitectura tradicional por capas horizontales (*controllers*, *services*, *repositories*, *models*) dispersa el código de una misma funcionalidad a lo largo de múltiples carpetas alejadas entre sí. 

Para **CoSpace** se adopta una **Arquitectura Basada en Features (Vertical Slice Architecture)**, donde:
1. **Alta Cohesión, Bajo Acoplamiento:** Todo lo que necesita una funcionalidad para operar (componentes visuales, lógica de servidor, esquemas de validación Zod, hooks y llamadas a base de datos) reside agrupado dentro del módulo de esa funcionalidad (`features/<nombre-feature>`).
2. **Encapsulamiento y Fronteras Claras:** Cada *feature* expone únicamente una API pública (`index.ts`) hacia el resto del proyecto. Su lógica interna no se comparte arbitrariamente.
3. **Mapeo Limpio con Next.js 16 App Router:** La carpeta `src/app/` actúa exclusivamente como **capa de enrutamiento y orquestación delgada** (páginas, layouts, proxy y route handlers), delegando toda la lógica de negocio, validaciones y renderizado a los módulos en `src/features/`.
4. **Cero Duplicación de Código Compartido:** Aquellos elementos transversales que no pertenecen a una feature de negocio específica (cliente Prisma, utilidades criptográficas JWT, componentes atómicos UI, layout base) se ubican en `src/core/` y `src/shared/`.

---

## 2. Mapa Estructural de Alto Nivel

```
src/
├── app/                      # Capa de Entrega / Routing (Delgado)
│   ├── (public)/             # Vistas públicas: Home (SSG), Catálogo y Detalle (SSR)
│   ├── (auth)/               # Vistas de autenticación: Login y Registro
│   ├── (private)/            # Vistas privadas: Dashboard de usuario (CSR)
│   ├── (admin)/              # Vistas administrativas: Gestión de espacios (SSR/CSR)
│   ├── api/                  # Route Handlers: Delegan a services de cada feature
│   ├── layout.tsx            # Root Layout global
│   └── proxy.ts              # Interceptor perimetral de seguridad (Next.js 16)
│
├── features/                 # Módulos Verticales de Negocio (Core del dominio)
│   ├── auth/                 # Registro, login, refresh, logout, tokens JWT y hashing
│   ├── spaces/               # Catálogo, detalle, creación, edición y desactivación
│   ├── bookings/             # Motor de reservas por horas, solapes y cancelación
│   └── admin/                # Orquestación y vistas consolidadas del panel admin
│
├── shared/                   # Código transversal reutilizable entre features
│   ├── components/           # UI Kit atómico: Button, Input, Modal, Badge, Card
│   ├── hooks/                # Hooks comunes (e.g., useDisclosure, useDebounce)
│   ├── utils/                # Funciones puras (fechas con date-fns, formato moneda)
│   └── types/                # Tipos genéricos de respuesta HTTP y paginación
│
└── core/                     # Infraestructura técnica transversal
    ├── db/                   # Instancia Singleton de PrismaClient
    ├── env/                  # Validación en arranque de variables de entorno (Zod)
    ├── i18n/                 # Dictionaries (es/en), Cookie Manager y LanguageContext
    ├── timezone/             # Motor de conversión y normalización para America/Bogota
    └── errors/               # Jerarquía de errores tipados (AppError, ConflictError, etc.)
```

---

## 3. Desglose Detallado de Cada Feature

### 3.1 Feature: `auth` (Autenticación y Sesiones)
Responsable del ciclo de vida de la identidad: creación de cuentas, validación de credenciales, emisión de tokens JWT, almacenamiento hasheado del refresh token y rotación sin fricción.

```text
src/features/auth/
├── components/
│   ├── LoginForm.tsx            # Formulario interactivo con feedback de estado
│   └── RegisterForm.tsx         # Formulario de registro público
├── hooks/
│   └── useAuth.ts               # Hook de cliente para consumir estado de sesión
├── schemas/
│   ├── login.schema.ts          # Zod schema: email normalizado y password
│   └── register.schema.ts       # Zod schema: validación de longitud y formato
├── server/
│   ├── auth.service.ts          # Lógica: registerUser, authenticateUser, rotateTokens, revokeSession
│   ├── jwt.ts                   # Utilidades con librería 'jose' (firmar y verificar)
│   ├── password.ts              # Hashing seguro con bcryptjs (10 salt rounds)
│   └── session.cookies.ts       # Configuración de cookies httpOnly, secure, sameSite
├── types/
│   └── index.ts                 # DTOs: AuthResponse, TokenPayload (sub, email, role)
└── index.ts                     # Barril público de exportación
```

**Interacciones Clave:**
* `api/auth/register/route.ts` $\rightarrow$ consume `authService.registerUser(data)`.
* `api/auth/login/route.ts` $\rightarrow$ consume `authService.authenticateUser(data)` y fija cookies seguras.
* `api/auth/refresh/route.ts` $\rightarrow$ consume `authService.rotateTokens(refreshToken)`.
* `api/auth/logout/route.ts` $\rightarrow$ consume `authService.revokeSession(userId)`.
* `src/proxy.ts` $\rightarrow$ consume `jwt.verifyAccessToken()` y `jwt.verifyRefreshToken()`.

---

### 3.2 Feature: `spaces` (Catálogo y Gestión de Espacios)
Gestiona la información de escritorios, salas y cabinas acústicas, sus imágenes optimizadas y el control de disponibilidad física.

```text
src/features/spaces/
├── components/
│   ├── SpaceCard.tsx            # Tarjeta de catálogo con next/image y precio visible
│   ├── SpaceGrid.tsx            # Grilla responsive para la vista de catálogo
│   ├── SpaceDetailHero.tsx      # Galería y ficha técnica detallada
│   ├── SpaceFilter.tsx          # Filtros por tipo (DESK, MEETING_ROOM, BOOTH) y capacidad
│   └── admin/
│       ├── SpaceFormModal.tsx   # Modal de creación y edición (Client Component)
│       ├── SpaceTable.tsx       # Tabla de gestión del catálogo
│       └── DeactivateDialog.tsx # Diálogo de confirmación con alerta de reservas futuras
├── schemas/
│   ├── space.schema.ts          # Zod schema para creación y edición de espacios
│   └── filter.schema.ts         # Zod schema para parámetros de búsqueda en catálogo
├── server/
│   ├── space.service.ts         # Métodos: getActiveSpaces, getAllSpaces, getSpaceById,
│   │                            #          createSpace, updateSpace, deactivateSpace
│   └── space.repository.ts      # Consultas directas vía Prisma Client
├── types/
│   └── index.ts                 # Interfaces: SpaceDTO, SpaceFilterParams, CreateSpaceInput
└── index.ts                     # Barril público de exportación
```

**Reglas aplicadas dentro de esta feature:**
* **RN-07:** Exclusión de espacios inactivos para usuarios no administradores.
* **RN-12:** Desactivación lógica (`isActive = false`) en lugar de borrado físico.
* **RN-13:** Verificación de integridad: antes de desactivar, consulta si existen reservas futuras en estado `CONFIRMED`. Si hay al menos una, dispara un error `409 Conflict`.

---

### 3.3 Feature: `bookings` (Motor Transaccional de Reservas)
El núcleo transaccional de CoSpace. Resuelve la validación temporal, la prevención de solapamientos, las cancelaciones y el cálculo inmutable de precios.

```text
src/features/bookings/
├── components/
│   ├── BookingWidget.tsx        # Selector interactivo de fecha y horas en [id]
│   ├── BookingCard.tsx          # Tarjeta de reserva para el Dashboard
│   ├── BookingList.tsx          # Listado agrupado (Confirmadas / Canceladas / Pasadas)
│   ├── CancelBookingButton.tsx  # Botón con confirmación y cálculo de 2h de antelación
│   └── BookingSummary.tsx       # Desglose en tiempo real: horas calculadas × tarifa
├── hooks/
│   ├── useBookingForm.ts        # Manejo de estado del widget (validación 1 a 4h)
│   └── useUserBookings.ts       # Consumo del endpoint GET /api/bookings con auto-refresh
├── schemas/
│   └── create-booking.schema.ts # Zod schema: spaceId, startTime, endTime ISO strings
├── server/
│   ├── booking.service.ts       # Métodos: createBooking, cancelBooking, getUserBookings
│   ├── booking.validator.ts     # Verificación matemática de horas, 7:00 a 21:00 y límites
│   └── booking.repository.ts    # Transacciones interactivas ($transaction) en Prisma
├── types/
│   └── index.ts                 # Interfaces: BookingDTO, CreateBookingInput, TimeSlot
└── index.ts                     # Barril público de exportación
```

**Garantías del Motor Transaccional (`booking.service.ts` + `booking.repository.ts`):**
1. **Normalización:** Convierte las fechas solicitadas al huso horario oficial `America/Bogota` (UTC-5).
2. **Validación Previa:**
   * **RN-01:** Minutos/segundos en `:00` y duración $\in [1, 4]$ horas completas.
   * **RN-02:** $07:00 \le \text{inicio}$ y $\text{fin} \le 21:00$.
   * **RN-03:** $\text{inicio} > \text{ahora}$ y $\text{inicio} \le \text{ahora} + 30\text{ días}$.
3. **Aislamiento Atómico (`prisma.$transaction`):**
   * **RN-06:** Verifica que el usuario tenga $< 3$ reservas futuras confirmadas.
   * **RN-05:** Verifica ausencia de reservas del usuario que solapen con el intervalo $[t_{\text{inicio}}, t_{\text{fin}})$.
   * **RN-04:** Verifica ausencia de reservas confirmadas en el espacio en el mismo intervalo.
   * **RN-08:** Lee la tarifa del espacio y calcula $\text{totalPrice} = \text{totalHours} \times \text{pricePerHour}$.
   * **RN-08 (Snapshot):** Persiste `pricePerHourSnapshot` y `totalPrice` inmutables.
4. **Cancelación (`cancelBooking`):**
   * **RN-09 & RN-14:** Valida propiedad del recurso o rol `ADMIN`.
   * **RN-10:** Si es usuario regular, exige $\Delta t \ge 2\text{ horas}$.
   * **RN-11:** Actualiza estado a `CANCELLED`.

---

### 3.4 Feature: `admin` (Panel de Administración)
Agrupa las vistas ejecutivas, métricas rápidas de reservas del coworking y orquesta las operaciones del catálogo para usuarios con rol `ADMIN`.

```text
src/features/admin/
├── components/
│   ├── AdminHeader.tsx          # Barra superior con métricas e indicador de rol
│   ├── AdminSidebar.tsx         # Navegación del panel administrativo
│   └── StatsOverview.tsx        # Indicadores: espacios activos, reservas del día
├── server/
│   └── admin.service.ts         # Consultas globales y agregaciones para el dashboard admin
└── index.ts                     # Barril público de exportación
```

---

## 4. Módulos Transversales (`core/` y `shared/`)

### 4.1 Infraestructura Central (`src/core/`)
```text
src/core/
├── db/
│   └── prisma.ts                # Instancia Singleton de PrismaClient con logs en desarrollo
├── env/
│   └── env.mjs                  # Validación de DATABASE_URL, JWT secrets con @t3-oss/env-nextjs o Zod
├── errors/
│   ├── AppError.ts              # Clase base con statusCode (400, 401, 403, 404, 409)
│   ├── ConflictError.ts         # Código HTTP 409 (solapamientos y desactivaciones fallidas)
│   ├── ForbiddenError.ts        # Código HTTP 403 (violación de rol o propiedad de reserva)
│   ├── NotFoundError.ts         # Código HTTP 404
│   ├── UnauthorizedError.ts     # Código HTTP 401
│   └── handleApiError.ts        # Formateador uniforme de respuestas JSON de error
├── i18n/
│   ├── dictionaries/
│   │   ├── es.json              # Textos en español
│   │   └── en.json              # Textos en inglés
│   ├── LanguageContext.tsx      # Contexto reactivo de cliente con hook useTranslation()
│   ├── getDictionary.ts         # Lector de diccionario en servidor basado en la cookie NEXT_LOCALE
│   └── config.ts                # Constantes: defaultLocale = 'es', supportedLocales = ['es', 'en']
└── timezone/
    └── index.ts                 # Utilidades basadas en date-fns-tz:
                                 # - toBogotaTime(date)
                                 # - getBogotaNow()
                                 # - isWithinWorkingHours(start, end)
```

### 4.2 Elementos Compartidos (`src/shared/`)
```text
src/shared/
├── components/
│   ├── ui/
│   │   ├── Button.tsx           # Botón estándar con variantes (primary, secondary, danger, ghost)
│   │   ├── Input.tsx            # Input accesible con estados de error tipados
│   │   ├── Select.tsx           # Selector estilizado
│   │   ├── Modal.tsx            # Modal accesible (portal)
│   │   ├── Badge.tsx            # Insignias de estado (CONFIRMED: verde, CANCELLED: rojo)
│   │   ├── Card.tsx             # Contenedor con efecto glassmorphism sutil
│   │   └── Skeleton.tsx         # Placeholders para estados de carga
│   ├── layout/
│   │   ├── PublicNavbar.tsx     # Barra pública con logo, links y selector de idioma
│   │   ├── PrivateNavbar.tsx    # Barra privada con menú de usuario y botón de logout
│   │   ├── Footer.tsx           # Pie de página general
│   │   └── LanguageSwitcher.tsx # Toggle bilingüe (ES / EN) que actualiza la cookie NEXT_LOCALE
│   └── feedback/
│       └── LocalTimeBanner.tsx  # Componente sin fallos de hidratación (muestra hora del cliente)
├── hooks/
│   └── useFetchWithAuth.ts      # Cliente HTTP que maneja renovación automática de tokens ante 401
└── types/
    └── api.types.ts             # ApiResponse<T>, ApiErrorResponse
```

---

## 5. Mapeo entre Capa de Rutas (`app/`) y Features

La carpeta `src/app` no implementa consultas a la base de datos ni validaciones pesadas; actúa como **pegamento** entre la URL solicitada y la feature correspondiente:

| Ruta en `src/app/` | Estrategia | Feature que consume | Responsabilidad delegada |
|---|---|---|---|
| `(public)/page.tsx` | **SSG** | `spaces` + `shared` | Muestra el Hero y previsualización estática del catálogo. |
| `(public)/spaces/page.tsx` | **SSR** | `spaces` | Llama a `spaceService.getActiveSpaces()` y renderiza `SpaceGrid`. |
| `(public)/spaces/[id]/page.tsx` | **SSR** | `spaces` + `bookings` | Renderiza `SpaceDetailHero` y monta `BookingWidget`. |
| `(auth)/login/page.tsx` | **SSR/Client** | `auth` | Renderiza `LoginForm`. |
| `(auth)/register/page.tsx` | **SSR/Client** | `auth` | Renderiza `RegisterForm`. |
| `(private)/dashboard/page.tsx` | **CSR** | `bookings` | Monta `BookingList` con consumo interactivo de la API. |
| `(admin)/admin/page.tsx` | **SSR + CSR** | `admin` + `spaces` | Monta `SpaceTable` y diálogos de edición/desactivación. |
| `api/auth/[...]/route.ts` | **API** | `auth` | Delega a `authService`. |
| `api/spaces/[...]/route.ts` | **API** | `spaces` | Delega a `spaceService`. |
| `api/bookings/[...]/route.ts` | **API** | `bookings` | Delega a `bookingService`. |
| `proxy.ts` | **Perímetro** | `auth` | Valida sesión perimetral con `jwt.verifyAccessToken()`. |

---

## 6. Diagrama de Flujo de una Petición Típica (Creación de Reserva)

```
[ Cliente: BookingWidget ]
           |
           | 1. POST /api/bookings { spaceId, startTime, endTime }
           v
[ src/app/api/bookings/route.ts ]
           |
           | 2. Valida sesión del usuario (requireAuth)
           | 3. Valida payload con Zod (createBookingSchema)
           v
[ src/features/bookings/server/booking.service.ts ]
           |
           | 4. Convierte y valida franja horaria contra America/Bogota (07:00 a 21:00)
           | 5. Verifica horas enteras (1 a 4 horas) y anticipación (<= 30 días)
           v
[ src/features/bookings/server/booking.repository.ts ]
           |
           | 6. Inicia prisma.$transaction:
           |    a. SELECT count(*) WHERE userId = :id AND startTime > now() AND status = 'CONFIRMED'
           |       --> ¿Es >= 3? Lanza ConflictError (RN-06)
           |    b. SELECT space WHERE id = :spaceId AND isActive = true
           |       --> ¿Inactivo/No existe? Lanza NotFound/ConflictError (RN-07)
           |    c. SELECT count(*) solapes usuario WHERE userId = :id
           |       --> ¿Existe solape? Lanza ConflictError (RN-05)
           |    d. SELECT count(*) solapes espacio WHERE spaceId = :spaceId
           |       --> ¿Existe solape? Lanza ConflictError (RN-04)
           |    e. Calcula totalPrice = horas * precioPorHora
           |    f. INSERT INTO Booking (..., pricePerHourSnapshot, totalPrice, status: 'CONFIRMED')
           v
[ Base de Datos PostgreSQL (Supabase) ]
           |
           | 7. Commit exitoso de la transacción
           v
[ Respuesta HTTP 201 Created ]
           |
           v
[ Cliente: Actualiza estado / Redirige al Dashboard ]
```

---

## 7. Directrices de Codificación y Calidad

1. **Dependencias entre Features:**
   * Una feature puede importar utilidades de `core/` o componentes de `shared/`.
   * Una feature **no debe importar archivos internos de otra feature** directamente (ejemplo prohibido: `import ... from '@/features/spaces/server/space.repository'`).
   * Si una feature necesita interactuar con otra (por ejemplo, `bookings` consultando datos de `spaces`), debe hacerlo a través del barril público exportado (`@/features/spaces`) o delegarlo al servicio transaccional correspondiente.
2. **Eliminación Absoluta de `any`:**
   * Todas las entidades de base de datos aprovechan los tipos autogenerados por Prisma (`Space`, `Booking`, `User`, `Role`, `SpaceType`, `BookingStatus`).
   * Los formularios utilizan tipos inferidos de los esquemas Zod (`z.infer<typeof createBookingSchema>`).
3. **Manejo Estandarizado de Errores:**
   * Toda ruta o servicio arroja subclases de `AppError` con mensajes descriptivos.
   * La función utilitaria `handleApiError(error)` intercepta excepciones y asegura que la respuesta al cliente mantenga la estructura uniforme con códigos de estado HTTP precisos (`400`, `401`, `403`, `404`, `409`).