# Especificación de Requisitos de Software (SRS)
## Proyecto: CoSpace - Plataforma de Reserva de Espacios de Coworking

---

### Control del Documento

| Versión | Fecha | Autor / Rol | Descripción del Cambio |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-10-27 | Equipo de Arquitectura y Desarrollo | Versión inicial del SRS conforme a las especificaciones de negocio y técnicas. |
| 1.2.0 | 2026-10-27 | Equipo de Arquitectura y Desarrollo | Integración de decisiones técnicas: zona horaria base (`America/Bogota`), prevención de condiciones de carrera vía `$transaction`, snapshot inmutable de tarifas, i18n sin prefijo mediante cookies y esquema Prisma para Supabase con connection pooling. |

---

## 1. Introducción

### 1.1 Propósito
El propósito de este documento es definir formalmente los requisitos funcionales, no funcionales, reglas de negocio y restricciones arquitectónicas para el desarrollo de **CoSpace**, una plataforma web fullstack orientada a la gestión y reserva por horas de espacios de coworking (escritorios compartidos, salas de reuniones y cabinas acústicas individuales). Este documento sirve como guía técnica vinculante para desarrolladores, evaluadores y administradores del sistema.

### 1.2 Alcance del Sistema
CoSpace es una solución integral desarrollada en **Next.js 16 (App Router)** con **TypeScript** (modo estricto, sin `any`) y **PostgreSQL (Supabase)** gestionado mediante **Prisma ORM**. La plataforma opera de forma autónoma: no consume APIs externas para la gestión de su dominio de datos; toda la lógica de negocio, persistencia, autenticación y autorización reside en el propio sistema mediante Route Handlers y procedimientos en el servidor.

El sistema cubre:
- Registro e inicio de sesión de usuarios con autenticación basada en tokens JWT firmados (`access_token` y `refresh_token`) persistidos exclusivamente en cookies seguras (`httpOnly`).
- Catálogo público y visualización detallada de espacios con imágenes optimizadas (`next/image`).
- Motor transaccional de reservas por horas con validación estricta de solapamientos, límites de usuario y ventanas de tiempo evaluadas sobre la zona horaria operativa.
- Snapshot inmutable de tarifas por reserva para preservar la trazabilidad contable ante futuros cambios en el catálogo.
- Panel de usuario para la consulta y cancelación de reservas (CSR con refresco transparente de sesión).
- Panel administrativo para la gestión del ciclo de vida de los espacios (creación, edición y desactivación controlada sujeta a la ausencia de reservas futuras confirmadas).
- Internacionalización bilingüe (Español / Inglés) sin prefijos en las URLs mediante cookies y contexto tipado.

### 1.3 Definiciones, Acrónimos y Abreviaturas
- **SRS**: Software Requirements Specification (Especificación de Requisitos de Software).
- **JWT**: JSON Web Token.
- **RBAC**: Role-Based Access Control (Control de Acceso Basado en Roles).
- **SSG**: Static Site Generation (Generación de Sitio Estático).
- **SSR**: Server-Side Rendering (Renderizado en Servidor).
- **CSR**: Client-Side Rendering (Renderizado en Cliente).
- **ORM**: Object-Relational Mapping (Mapeo Objeto-Relacional).
- **Route Handler**: Endpoint de backend en Next.js (equivalente a API REST).
- **Seed**: Script automatizado de inicialización de datos para la base de datos.
- **Soft Disable / Desactivación Lógica**: Proceso donde una entidad no se borra físicamente de la base de datos, sino que se marca como inactiva (`isActive = false`) para preservar integridad referencial.
- **Snapshot de Precio**: Copia estática del valor unitario y total al momento exacto de la reserva, inmune a posteriores modificaciones del catálogo.

### 1.4 Referencias
- Estándar IEEE 830-1998 / ISO/IEC/IEEE 29148:2018 para especificación de requisitos.
- Documentación oficial de Next.js 16 (App Router, Route Handlers, Proxy).
- Especificaciones de RFC 7519 (JSON Web Tokens) y RFC 6265 (HTTP State Management Mechanism - Cookies).
- Documentación oficial de Prisma ORM y arquitectura de connection pooling en Supabase.

---

## 2. Descripción General y Decisiones Arquitectónicas

### 2.1 Perspectiva del Producto
CoSpace es un sistema autónomo, alojado y autocontenido (monolito modular fullstack). El front-end y el back-end coexisten dentro del mismo proyecto. La persistencia se delega a PostgreSQL alojado en Supabase, utilizando Prisma ORM con separación de cadenas de conexión para entornos serverless (puerto 6543 con PgBouncer) y migraciones directas (puerto 5432).

```
+--------------------------------------------------------------------------+
|                                CLIENTE                                   |
|  (Navegador Web: SSG Home, SSR Catálogo/Detalle, CSR Dashboard Usuario)  |
+------------------------------------+-------------------------------------+
                                     |
                       HTTPS / Cookies (httpOnly)
                                     |
+------------------------------------v-------------------------------------+
|                     NEXT.JS 16 APPLICATION SERVER                        |
|                                                                          |
|  +--------------------------------------------------------------------+  |
|  |                 Routing & Security Layer (proxy.ts)                |  |
|  |     (Control perimetral de acceso /dashboard y /admin)             |  |
|  +---------------------------------+----------------------------------+  |
|                                    |                                     |
|  +---------------------------------v----------------------------------+  |
|  |             Route Handlers (/api/auth, /api/spaces, /api/bookings) |  |
|  |       (Defensa en profundidad: revalidación autónoma de sesión)    |  |
|  +---------------------------------+----------------------------------+  |
|                                    |                                     |
|  +---------------------------------v----------------------------------+  |
|  |                     Business Logic & Services                      |  |
|  |       - Timezone normalizer: America/Bogota (UTC-5)                |  |
|  |       - Validación atómica de las 14 reglas de negocio             |  |
|  |       - Cálculo estricto de precios y snapshot contable            |  |
|  +---------------------------------+----------------------------------+  |
|                                    |                                     |
|  +---------------------------------v----------------------------------+  |
|  |                     Data Access Layer (Prisma ORM)                 |  |
|  |       - Transacciones interactivas ($transaction) anti-race        |  |
|  +---------------------------------+----------------------------------+  |
+------------------------------------+-------------------------------------+
                                     |
                     TCP / SSL (Pooler 6543 / Direct 5432)
                                     |
+------------------------------------v-------------------------------------+
|                  POSTGRESQL DATABASE (SUPABASE)                          |
|             (Users, Spaces, Bookings, Migrations, Seeds)                 |
+--------------------------------------------------------------------------+
```

### 2.2 Decisiones Arquitectónicas Clave

1. **Estandarización de Zona Horaria (Timezone):**
   - La sede física del coworking opera bajo la zona horaria **`America/Bogota` (UTC-5)**.
   - Las reglas de negocio de franja horaria (07:00 a 21:00), duración en horas completas, cálculo de anticipación (máximo 30 días) y límite de cancelación (mínimo 2 horas antes) se computan normalizando las fechas contra esta zona horaria.
   - En PostgreSQL, los campos se persisten como `TIMESTAMPTZ` (UTC normalizado).
2. **Mitigación de Condiciones de Carrera (Race Conditions):**
   - La reserva de espacios se ejecuta dentro de un bloque interactivo `prisma.$transaction`. Se verifica la ausencia de solapamientos bajo el mismo aislamiento antes de efectuar el `create`, impidiendo dobles reservas simultáneas ante peticiones concurrentes.
3. **Inmutabilidad de Tarifas (Snapshot Contable):**
   - La entidad `Booking` almacena los campos `pricePerHourSnapshot` y `totalPrice`. Si un administrador modifica la tarifa por hora de un espacio, el cambio solo surte efecto para reservas futuras.
4. **Internacionalización (i18n) sin Contaminar Rutas:**
   - La plataforma preserva URLs limpias (`/spaces`, `/dashboard`, `/admin`) sin prefijos como `/es/` o `/en/`. El idioma se almacena en la cookie `NEXT_LOCALE` y es consumido por un `LanguageProvider` en el cliente y mediante lectura de cabeceras en componentes de servidor.
5. **Renovación Transparente de Sesión:**
   - En el cliente (CSR), un helper de consumo HTTP (`fetchWithAuth`) intercepta respuestas `401`, invoca automáticamente a `/api/auth/refresh` y reintenta la petición. En la navegación perimetral, `proxy.ts` valida la vigencia del token.

### 2.3 Características de los Usuarios

El sistema implementa dos roles fundamentales:

1. **Usuario Final (USER):**
   - Capacidad para crear una cuenta mediante el formulario público de registro e iniciar sesión.
   - Explorar el catálogo de espacios activos y ver sus especificaciones técnicas y tarifas.
   - Crear reservas que respeten las 14 reglas de negocio.
   - Consultar su historial de reservas y cancelar reservas vigentes hasta 2 horas antes del inicio programado.
2. **Administrador (ADMIN):**
   - No puede crearse desde el registro público; se inicializa de forma determinista mediante el script `seed.ts`.
   - Posee todas las facultades de un usuario regular.
   - Accede a un panel exclusivo para dar de alta nuevos espacios, editar existentes y desactivar espacios (siempre que no tengan reservas futuras confirmadas).
   - Puede cancelar cualquier reserva del sistema sin restricción de tiempo.

### 2.4 Restricciones Generales
- **Autonomía de Datos:** Prohibido el uso de APIs o CMS de terceros para almacenar la información de negocio.
- **Seguridad de Tokens:** Los tokens de autenticación no deben exponerse al código JavaScript del navegador (prohibido `localStorage`) ni viajar en cuerpos de respuesta JSON.
- **Tipado Estricto:** Código TypeScript con configuración estricta, libre del tipo `any`.
- **Despliegue y Reproducibilidad:** Aplicación empaquetable mediante contenedor Docker multi-stage y desplegable en Vercel conectada a Supabase.

---

## 3. Reglas de Negocio (RN)

Las siguientes 14 reglas son mandatorias y se garantizan y validan en la capa de servicios del servidor, con independencia de las validaciones de interfaz de usuario:

### Reservas
- **RN-01 (Duración Estricta):** Una reserva debe durar entre 1 y 4 horas continuas, computadas únicamente en bloques de horas completas (ejemplo válido: 10:00 a 12:00; ejemplo inválido: 10:30 a 11:45 o 10:00 a 10:30). Los minutos y segundos deben ser estrictamente `:00`.
- **RN-02 (Franja Horaria Operativa):** Las reservas solo pueden llevarse a cabo dentro de la franja de 07:00 a 21:00 horas (hora local `America/Bogota`). La hora mínima de inicio es 07:00; la hora máxima de finalización es 21:00 (inicio máximo a las 20:00 para 1 hora de duración).
- **RN-03 (Ventana de Anticipación):** No se permiten reservas con fecha/hora de inicio en el pasado ($t_{\text{inicio}} \le t_{\text{actual}}$) ni con más de treinta (30) días calendario de anticipación respecto al momento de la solicitud ($t_{\text{inicio}} > t_{\text{actual}} + 30\text{ días}$).
- **RN-04 (Solapamiento en Espacio):** Un espacio no puede tener dos reservas con estado `CONFIRMED` que se solapen cronológicamente. La validación utiliza intervalos semiabiertos $[t_{\text{inicio}}, t_{\text{fin}})$:
  $$\text{Existe solape si: } (\text{reservaExistente.inicio} < t_{\text{finSolicitado}}) \land (\text{reservaExistente.fin} > t_{\text{inicioSolicitado}})$$
  Si una reserva termina a las 12:00, otra puede iniciar a las 12:00.
- **RN-05 (Solapamiento por Usuario):** Un mismo usuario no puede tener dos reservas con estado `CONFIRMED` que se solapen en el tiempo, aun cuando correspondan a espacios físicos distintos.
- **RN-06 (Límite de Reservas Futuras):** Un usuario puede tener como máximo tres (3) reservas confirmadas activas cuya fecha de inicio sea futura respecto al momento de la verificación ($t_{\text{inicio}} > t_{\text{actual}}$).
- **RN-07 (Disponibilidad de Espacio):** Solo pueden reservarse espacios que se encuentren activos (`isActive = true`). Intentar reservar un espacio inactivo es rechazado por el servidor.
- **RN-08 (Cálculo de Precio en Servidor):** El precio total es calculado estrictamente por el servidor:
  $$\text{totalPrice} = \text{totalHours} \times \text{space.pricePerHour}$$
  El servidor descarta cualquier importe económico remitido por el cliente y guarda un snapshot inmutable en `pricePerHourSnapshot` y `totalPrice`.

### Cancelaciones
- **RN-09 (Autorización de Cancelación):** Una reserva solo puede ser cancelada por el usuario propietario de la misma o por un usuario con rol `ADMIN`.
- **RN-10 (Límite Temporal de Cancelación para Usuarios):** Un usuario con rol `USER` únicamente puede cancelar su reserva con una antelación mínima de dos (2) horas respecto al inicio:
  $$t_{\text{inicio}} - t_{\text{actual}} \ge 2\text{ horas (7200 segundos)}$$
  El rol `ADMIN` está exento de esta limitación temporal.
- **RN-11 (Persistencia de la Cancelación):** Cancelar una reserva actualiza su estado a `CANCELLED`. El registro nunca se elimina físicamente de la base de datos.

### Gestión de Espacios
- **RN-12 (Borrado Lógico de Espacios):** Los espacios físicos no se eliminan de la base de datos; se desactivan (`isActive = false`). Los espacios inactivos quedan excluidos del catálogo público.
- **RN-13 (Integridad de Desactivación):** Está prohibido desactivar un espacio que cuente con al menos una reserva futura en estado `CONFIRMED`.

### Seguridad y Aislamiento
- **RN-14 (Aislamiento de Recursos):** Ningún usuario puede visualizar, consultar ni modificar reservas pertenecientes a otros usuarios mediante manipulación de parámetros o identificadores en las URLs.

---

## 4. Requisitos del Sistema

### 4.1 Requisitos Funcionales (RF)

#### Módulo de Autenticación y Autorización
- **RF-01 (Registro de Usuario):** El sistema permite el registro de nuevos usuarios mediante nombre, correo electrónico y contraseña. La contraseña se almacena hasheada mediante `bcryptjs` con factor de coste mínimo de 10 salt rounds.
- **RF-02 (Inicio de Sesión y Emisión de Tokens):** Tras verificar credenciales válidas, emite dos tokens firmados mediante `jose`:
  - `access_token`: Vida útil de 15 minutos.
  - `refresh_token`: Vida útil de 7 días.
- **RF-03 (Almacenamiento Seguro de Sesión):** Ambos tokens se envían al navegador exclusivamente mediante cookies con las directivas `httpOnly = true`, `secure = process.env.NODE_ENV === 'production'`, `sameSite = 'lax'` y `path = '/'`. No se autoriza su almacenamiento en `localStorage` ni en el cuerpo de la respuesta.
- **RF-04 (Persistencia y Revocación de Sesión):** El hash del `refresh_token` activo se almacena en `User.refreshTokenHash`. El endpoint de cierre de sesión (`/api/auth/logout`) asigna este valor a `null` en la base de datos y purga las cookies del cliente (`maxAge = 0`).
- **RF-05 (Rotación Silenciosa de Tokens):** El endpoint `/api/auth/refresh` valida la firma del `refresh_token` recibido en cookie, verifica el hash contra la base de datos y expide un nuevo `access_token` rotando simultáneamente el `refresh_token`.

#### Módulo de Espacios
- **RF-06 (Catálogo Público):** Expone la lista de espacios con `isActive = true`, mostrando imagen optimizada, nombre, categoría (`DESK`, `MEETING_ROOM`, `BOOTH`), capacidad y precio por hora.
- **RF-07 (Detalle del Espacio):** Vista individual del espacio con descripción, capacidad, amenidades, cálculo visual del valor estimado y formulario de reserva por bloques de horas completas.
- **RF-08 (Creación de Espacios):** Los usuarios con rol `ADMIN` pueden dar de alta nuevos espacios con sus atributos completos.
- **RF-09 (Edición de Espacios):** El administrador puede actualizar nombre, descripción, capacidad, imagen y tarifa. Las nuevas tarifas aplican solo para reservas generadas a partir de la modificación.
- **RF-10 (Desactivación de Espacios):** El administrador puede marcar un espacio como inactivo, sujeto a la verificación atómica de la regla **RN-13**.

#### Módulo de Reservas
- **RF-11 (Creación de Reserva):** El usuario autenticado selecciona un espacio activo, fecha y franja de horas completas (1 a 4 horas). El sistema valida las reglas **RN-01** a **RN-08** en una transacción interactiva y responde con código `201 Created` o el error correspondiente.
- **RF-12 (Consulta de Reservas Propias):** El usuario consulta sus reservas en su panel personal (`/dashboard`), distinguiendo entre confirmadas, concluidas y canceladas.
- **RF-13 (Cancelación de Reserva):** El usuario o administrador cancela una reserva cumpliendo **RN-09**, **RN-10** y **RN-11**.

---

### 4.2 Requisitos No Funcionales (RNF)

#### Arquitectura de Software y Renderizado
- **RNF-01 (Estructura de Route Groups en Next.js 16):** Organización física modular sin impacto en URLs públicas:
  - `(public)`: Rutas públicas con layout general, navbar y selector de idioma.
  - `(auth)`: Rutas de registro y login con layout limpio y centrado.
  - `(private)`: Rutas privadas protegidas con layout y menú contextual de usuario.
  - `(admin)`: Panel de administración con sidebar ejecutivo de gestión.
- **RNF-02 (Matriz de Estrategias de Renderizado):**
  - **Página de Inicio (`/`)**: Renderizado estático (**SSG**).
  - **Catálogo (`/spaces`) y Detalle (`/spaces/[id]`)**: Renderizado dinámico en servidor (**SSR**) para reflejar disponibilidad en tiempo real.
  - **Dashboard de Usuario (`/dashboard`)**: Renderizado del lado del cliente (**CSR**) para actualización reactiva del estado de reservas y auto-refresh de sesión.
- **RNF-03 (Optimización de Imágenes):** Renderizado de fotografías mediante `next/image` con dominios remotos configurados en `next.config.ts`.
- **RNF-04 (Control de Hidratación):** Inclusión de al menos un componente sensible al cliente (`<LocalTimeBanner />`) que sincroniza fecha y hora local tras el montaje inicial (`useEffect`), evitando discrepancias de hidratación (*hydration mismatch*).

#### Seguridad e Integridad
- **RNF-05 (Protección Perimetral vía `proxy.ts`):** En Next.js 16, el archivo `src/proxy.ts` intercepta peticiones a `/dashboard/:path*` y `/admin/:path*`, redirigiendo al login a usuarios sin sesión o bloqueando a usuarios sin rol de administrador.
- **RNF-06 (Defensa en Profundidad en Backend):** Cada Route Handler comprueba de forma autónoma la sesión y el rol del usuario antes de ejecutar la lógica de negocio, sin suponer la invulnerabilidad del proxy.
- **RNF-07 (Respuestas y Códigos HTTP Uniformes):** Respuestas de error estructuradas bajo un esquema común con códigos HTTP semánticos:
  - `400 Bad Request`: Datos de entrada inválidos, violaciones de horas enteras o rangos horarios.
  - `401 Unauthorized`: Token ausente, firma inválida o sesión expirada.
  - `403 Forbidden`: Intento de acceder o cancelar reservas de terceros sin privilegios de administrador.
  - `404 Not Found`: Espacio o reserva inexistente.
  - `409 Conflict`: Solapamientos de horarios, superación de cuota máxima de reservas o intento de desactivar un espacio con reservas futuras.

#### Internacionalización
- **RNF-08 (Soporte Multilingüe ES/EN):** Soporte bilingüe sin alterar las rutas base mediante la cookie `NEXT_LOCALE`, con persistencia de preferencia de usuario y selector accesible en el layout público y privado.

#### Calidad del Código y DevOps
- **RNF-09 (Calidad y Tipado Estricto):** TypeScript sin uso del tipo `any`. Esquemas de validación Zod con tipos inferidos para payloads de entrada.
- **RNF-10 (Dockerización Multi-Etapa):** `Dockerfile` multi-stage con compilación optimizada bajo `output: 'standalone'`, reduciendo el peso de la imagen y ejecutando bajo usuario sin privilegios.
- **RNF-11 (Documentación Evaluable README.md):** Manual de despliegue que describe de forma exhaustiva los 9 puntos exigidos para reproducción local y en producción desde cero.

---

## 5. Diseño del Modelo de Datos (Prisma Schema)

```prisma
// prisma/schema.prisma

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
  DESK
  MEETING_ROOM
  BOOTH
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
}
```

### Relaciones e Integridad Referencial
- **User $\rightarrow$ Booking ($1:N$):** La eliminación física de usuarios está restringida (`onDelete: Restrict`) si poseen reservas asociadas.
- **Space $\rightarrow$ Booking ($1:N$):** La eliminación física de espacios está restringida (`onDelete: Restrict`). Se preserva el histórico mediante desactivación lógica (`isActive = false`).
- **Índices de Rendimiento:**
  - `Booking(spaceId, status, startTime, endTime)`: Optimiza la consulta de detección de solapamientos por espacio dentro de la transacción interactiva.
  - `Booking(userId, status, startTime, endTime)`: Optimiza la validación de solapamientos de un usuario en espacios simultáneos.
  - `Booking(status, startTime)`: Acelera el conteo de reservas futuras activas tanto de usuario como de espacio.

---

## 6. Especificación de la API (Route Handlers)

Esquema uniforme de error HTTP:
```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "El espacio seleccionado ya cuenta con una reserva confirmada en la franja horaria solicitada.",
  "timestamp": "2026-10-27T12:00:00.000Z"
}
```

### 6.1 Módulo de Autenticación (`/api/auth`)
| Método | Endpoint | Roles | Código Éxito | Errores | Descripción y Reglas Aplicadas |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Público | `201 Created` | `400`, `409` | Valida con Zod, comprueba unicidad de correo y genera usuario con hash de contraseña. |
| `POST` | `/api/auth/login` | Público | `200 OK` | `400`, `401` | Verifica credenciales, genera `access_token` y `refresh_token`, hashea el refresh token en base de datos y adjunta cookies `httpOnly`. |
| `POST` | `/api/auth/refresh` | Público (Cookie) | `200 OK` | `401` | Lee la cookie de refresh token, verifica la firma con `jose`, comprueba el hash en base de datos y rota el par de tokens. |
| `POST` | `/api/auth/logout` | Autenticado | `200 OK` | `401` | Anula `refreshTokenHash` en base de datos y purga las cookies del cliente (`maxAge: 0`). |

### 6.2 Módulo de Espacios (`/api/spaces`)
| Método | Endpoint | Roles | Código Éxito | Errores | Descripción y Reglas Aplicadas |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/spaces` | Público | `200 OK` | `500` | Retorna espacios con `isActive: true`. Si la petición proviene de un `ADMIN`, permite listar el catálogo completo. |
| `POST` | `/api/spaces` | ADMIN | `201 Created` | `400`, `401`, `403` | Valida datos y crea un nuevo espacio de coworking. |
| `GET` | `/api/spaces/[id]` | Público | `200 OK` | `404` | Retorna la ficha técnica del espacio por ID si se encuentra activo. |
| `PATCH` | `/api/spaces/[id]` | ADMIN | `200 OK` | `400`, `401`, `403`, `404` | Modifica atributos del espacio. Si cambia `pricePerHour`, aplica solo a reservas creadas con posterioridad. |
| `PATCH` | `/api/spaces/[id]/deactivate` | ADMIN | `200 OK` | `401`, `403`, `404`, `409` | Aplica **RN-12** y **RN-13**: verifica que el espacio no tenga reservas futuras confirmadas antes de marcar `isActive = false`. |

### 6.3 Módulo de Reservas (`/api/bookings`)
| Método | Endpoint | Roles | Código Éxito | Errores | Descripción y Reglas Aplicadas |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/bookings` | USER, ADMIN | `200 OK` | `401` | Si es `USER`, lista únicamente sus reservas propias (**RN-14**). Si es `ADMIN`, permite consultar reservas globales. |
| `POST` | `/api/bookings` | USER, ADMIN | `201 Created` | `400`, `401`, `404`, `409` | Ejecuta transacción interactiva: valida **RN-01** (horas completas), **RN-02** (07:00 a 21:00 en `America/Bogota`), **RN-03** (anticipación $\le$ 30 días), **RN-04** (solape en espacio), **RN-05** (solape de usuario), **RN-06** (máx. 3 futuras), **RN-07** (espacio activo) y **RN-08** (cálculo en servidor y snapshot). |
| `PATCH` | `/api/bookings/[id]/cancel` | USER, ADMIN | `200 OK` | `400`, `401`, `403`, `404` | Valida titularidad (**RN-09**, **RN-14**), límite de 2 horas si es usuario común (**RN-10**) y actualiza el estado a `CANCELLED` (**RN-11**). |

---

## 7. Requerimientos de Entorno, Docker y Despliegue

### 7.1 Variables de Entorno Requeridas (`.env.example`)
```env
# Conexión a Base de Datos PostgreSQL en Supabase
# Puerto 6543 (Transaction Pooler - Conexión principal para runtime en Vercel)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Puerto 5432 (Conexión directa por sesión - Exclusiva para Prisma Migrate y Seed)
DIRECT_URL="postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"

# Secretos criptográficos para tokens JWT (generados con openssl rand -base64 32)
JWT_ACCESS_SECRET="clave_secreta_minimo_32_caracteres_aleatorios"
JWT_REFRESH_SECRET="otra_clave_secreta_minimo_32_caracteres_aleatorios"

# Tiempos de expiración de tokens
ACCESS_TOKEN_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Zona horaria del Coworking
NEXT_PUBLIC_TIMEZONE="America/Bogota"

# URL pública de la aplicación
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 7.2 Dockerfile Multi-Etapa
El archivo `Dockerfile` debe optimizar el tamaño de la imagen mediante tres etapas:
1. **Deps:** Instalación limpia de dependencias con `npm ci`.
2. **Builder:** Generación del cliente Prisma (`prisma generate`) y compilación de Next.js (`npm run build`) con la propiedad `output: 'standalone'` en `next.config.ts`.
3. **Runner:** Imagen base `node:20-alpine` ligera que copia únicamente los artefactos generados en `.next/standalone`, `.next/static` y `public`, ejecutando el proceso con un usuario de sistema sin privilegios.

### 7.3 Criterios de Evaluación del README.md
El archivo `README.md` es un entregable mandatorio que debe permitir a cualquier evaluador reproducir el proyecto desde cero conteniendo con precisión los siguientes 9 puntos:
1. **Descripción breve del proyecto:** Objetivo y funcionalidades principales de CoSpace.
2. **Requisitos previos:** Versión requerida de Node.js (v20+), gestor de paquetes, Docker Desktop y cuenta en Supabase.
3. **Variables de entorno:** Explicación detallada de cada variable de `.env.example`, cómo obtener las URLs de Supabase (Pooler vs Direct) y cómo generar los secretos JWT.
4. **Ejecución en desarrollo:** Comandos secuenciales: clonar repositorio, instalar dependencias, configurar `.env`, ejecutar migraciones (`npx prisma migrate dev`), ejecutar el seed (`npx prisma db seed`) y levantar el servidor (`npm run dev`).
5. **Credenciales del Administrador:** Credenciales de prueba creadas por el seed para acceder al panel `/admin`.
6. **Ejecución con Docker:** Comandos exactos para construir la imagen y correr el contenedor pasando las variables de entorno:
   ```bash
   docker build -t cospace-app .
   docker run -p 3000:3000 --env-file .env cospace-app
   ```
7. **Scripts disponibles en el `package.json`:** Descripción funcional de `dev`, `build`, `start`, `lint`, `prisma:migrate` y `prisma:seed`.
8. **Estructura de carpetas:** Explicación del árbol de directorios y la función de los Route Groups.
9. **URL de despliegue:** Enlace funcional a la aplicación desplegada en Vercel conectada a la base de datos de Supabase.