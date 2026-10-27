# CoSpace - Plataforma de Reserva de Espacios de Coworking

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-316192?style=flat&logo=postgresql)](https://supabase.com/)
[![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ED?style=flat&logo=docker)](https://www.docker.com/)

---

## 1. Descripción del Proyecto

**CoSpace** es una plataforma web fullstack moderna orientada a la gestión y reserva por horas de espacios de coworking físicos: puestos flexibles (`DESK`), salas de conferencias (`MEETING_ROOM`) y cabinas acústicas individuales/dobles (`BOOTH`).

Diseñada bajo una arquitectura limpia por características (*Feature-Driven Architecture*) sobre **Next.js 16 (App Router)** con **TypeScript estricto**, **Tailwind CSS v4** y persistencia en **PostgreSQL (Supabase)** mediante **Prisma ORM**.

### Características Destacadas
* **Autonomía total de datos:** Autenticación JWT y motor transaccional resueltos internamente sin dependencias de servicios externos ni CMS.
* **Motor transaccional anti-colisiones:** Prevención garantizada de reservas duplicadas o solapadas mediante transacciones atómicas interactivas (`prisma.$transaction`) sincronizadas con la zona horaria `America/Bogota` (UTC-5).
* **Autenticación Modal y Seguridad en Profundidad:** Registro e inicio de sesión integrados mediante modales dinámicos (`<AuthModal />`), tokens de acceso (15m) y renovación (7d) almacenados en cookies `httpOnly`, con perímetro de seguridad en `src/proxy.ts`.
* **Inmutabilidad contable (Snapshot):** Conservación del precio por hora histórico (`pricePerHourSnapshot`) al momento de confirmarse cada reserva (RN-08).
* **Layout Unificado y Experiencia Fluida:** Interfaz homogénea con un único diseño raíz, navegación dinámica, animaciones suaves (`fade-up`, `scale-in`, `shimmer`) y soporte de renderizado con React Portals para evitar cortes de apilamiento visual.
* **Panel de Gestión Integral (`/gestion`):** Centro de administración integrado para supervisar métricas de facturación, crear, editar, activar y desactivar espacios, y gestionar reservas globales.
* **Comprobante Detallado de Reserva:** Modal de voucher (`<BookingDetailModal />`) con desglose de horas, costos, políticas de cancelación e impresión directa.
* **Internacionalización Bilingüe (ES / EN):** Soporte contextual de idioma mediante cookie `NEXT_LOCALE` sin alteración de URLs.

---

## 2. Requisitos Previos

* **Node.js:** Versión `v20.x` LTS o superior (`node -v`).
* **Gestor de paquetes:** `npm` v10+ (incluido con Node.js) o `pnpm`.
* **Docker & Docker Compose:** Docker Engine o Docker Desktop activo.
* **Cuenta en Supabase:** Proyecto con base de datos PostgreSQL activa.
* **Git:** Para control de versiones.

---

## 3. Variables de Entorno

El proyecto incluye el archivo de plantilla [`.env.example`](file:///.env.example). Crea tu archivo local `.env`:

```bash
cp .env.example .env
```

### Tabla de Variables

| Variable | Descripción | Ejemplo / Formato |
| :--- | :--- | :--- |
| `DATABASE_URL` | Cadena de conexión al **Transaction Pooler** de Supabase (puerto `6543`, modo PgBouncer) para optimizar pools en Next.js. | `postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Cadena de conexión directa por sesión a PostgreSQL (puerto `5432`). **Requerida para migraciones y seeds** con Prisma. | `postgresql://postgres:[pass]@db.[ref].supabase.co:5432/postgres` |
| `JWT_ACCESS_SECRET` | Secreto criptográfico (mín. 32 caracteres) para firmar tokens de acceso (15m). | `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | Secreto criptográfico independiente para tokens de renovación (7d). | `openssl rand -base64 32` |
| `ACCESS_TOKEN_EXPIRES_IN` | Tiempo de vida del `access_token`. | `15m` |
| `REFRESH_TOKEN_EXPIRES_IN`| Tiempo de vida del `refresh_token`. | `7d` |
| `NEXT_PUBLIC_TIMEZONE` | Zona horaria oficial del coworking para validación de horarios y reglas de negocio. | `America/Bogota` |
| `NEXT_PUBLIC_APP_URL` | URL base de la aplicación. | `http://localhost:3000` |

---

## 4. Instalación y Ejecución en Desarrollo

Sigue los pasos a continuación para arrancar la aplicación localmente:

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Configura tus credenciales en .env

# 3. Generar tipos de Prisma y sincronizar base de datos
npx prisma generate
npx prisma migrate dev --name init

# 4. Poblar la base de datos con el seed inicial (usuarios y catálogo)
npx prisma db seed

# 5. Iniciar el servidor de desarrollo
npm run dev
```

Abre tu navegador en [http://localhost:3000](http://localhost:3000).

---

## 5. Credenciales de Demostración (Seed)

El script determinista de inicialización (`prisma/seed.ts`) crea las siguientes cuentas de prueba:

### Usuario Administrador (Gestión Total en `/gestion`)
* **Correo:** `admin@cospace.dev`
* **Contraseña:** `AdminCoSpace2026!`
* **Rol:** `ADMIN`
* **Capacidades:**
  * Crear nuevos espacios con validación de tipos e imagen en vivo.
  * Editar datos, precios y categorías.
  * **Activar** espacios inactivados y **Desactivar** espacios seguros (RN-12 / RN-13).
  * Supervisar todas las reservas del coworking y cancelaciones administrativas.
  * Ver métricas de ocupación y facturación confirmada.

### Usuario Regular (Cliente)
* **Correo:** `carlos@ejemplo.com`
* **Contraseña:** `UserCoSpace2026!`
* **Rol:** `USER`
* **Capacidades:**
  * Explorar espacios en el catálogo público (`/spaces`).
  * Reservar slots por horas (07:00 a 21:00 UTC-5, de 1 a 4 horas).
  * Consultar su historial y reservas futuras en `/dashboard`.
  * Ver el voucher con detalle completo (`<BookingDetailModal />`).
  * Cancelar reservas con al menos 2 horas de antelación (RN-10).

---

## 6. Reglas de Negocio Implementadas

| Regla | Descripción | Estado de Cumplimiento |
| :--- | :--- | :--- |
| **RN-01** | **Ventana de Operación:** Horario permitido de reservas entre las 07:00 y las 21:00 horas (zona horaria `America/Bogota`). | Validado en backend (`booking.service.ts`) y selector de UI. |
| **RN-02** | **Granularidad:** Reservas en bloques de horas en punto continuas (ej. 09:00 a 11:00). | Cumplido vía selectores y Zod schema. |
| **RN-03** | **Duración permitida:** Mínimo 1 hora, máximo 4 horas por reserva. | Validado estrictamente en servidor y cliente. |
| **RN-04** | **Anticipación:** Reservas con fecha y hora estrictamente futuras respecto al tiempo real de Bogotá. | Verificado al milisegundo antes de persistir. |
| **RN-05** | **Anti-Colisión Transaccional:** Imposibilidad de reservas solapadas en el mismo espacio con estado `CONFIRMED`. | `prisma.$transaction` interactiva con chequeo atómico. |
| **RN-06** | **Límite de Ocupación por Usuario:** Máximo 3 reservas confirmadas activas simultáneamente por cliente. | Contador validado antes de autorizar nueva reserva. |
| **RN-07** | **Estado inicial:** Toda reserva creada con éxito queda en estado `CONFIRMED`. | Implementado en base de datos (`BookingStatus`). |
| **RN-08** | **Snapshot Contable:** Inmutabilidad del precio unitario y total al momento de la reserva. | Almacenado en `pricePerHourSnapshot` y `totalPrice`. |
| **RN-10** | **Política de Cancelación:** El usuario puede cancelar con al menos 2 horas de anticipación. El admin puede cancelar sin restricción de tiempo. | Evaluado en endpoint `/api/bookings/[id]/cancel`. |
| **RN-12** | **Desactivación de Espacios:** Ocultamiento inmediato del catálogo público sin borrar registros históricos. | Campo `isActive: false` respetado por `/spaces`. |
| **RN-13** | **Protección de Reservas Futuras:** No se puede desactivar un espacio si tiene reservas futuras confirmadas. | Verificación en `/api/spaces/[id]/deactivate`. |
| **RN-14** | **Reactivación de Espacios:** El administrador puede volver a poner disponible un espacio inactivo. | Endpoint `PATCH /api/spaces/[id]/activate` y toggle en modal. |

---

## 7. Arquitectura de Rutas y Endpoints

### Rutas Frontend (App Router)
* `/`: Página de inicio con propuesta de valor, espacios destacados y llamados a la acción.
* `/spaces`: Catálogo público con buscador y filtros por categoría (`DESK`, `MEETING_ROOM`, `BOOTH`).
* `/spaces/[id]`: Ficha detallada del espacio con selector de fecha, horario y cotizador en tiempo real.
* `/dashboard`: Panel privado del cliente con contador de reservas activas, pestañas (*Próximas*, *Completadas*, *Canceladas*) y modal de detalle.
* `/gestion`: Panel administrativo unificado con métricas ejecutivas, catálogo de espacios y supervisión de reservas globales.
* `/admin`: Redirección automática a `/gestion`.

### Endpoints de API REST (`/api`)

#### Autenticación (`/api/auth`)
* `POST /api/auth/login`: Autentica credenciales y genera cookies `httpOnly` (`access_token`, `refresh_token`).
* `POST /api/auth/register`: Registra un nuevo usuario con contraseña hasheada en bcrypt.
* `GET /api/auth/me`: Retorna la sesión del usuario actual verificando el JWT.
* `POST /api/auth/refresh`: Renueva el token de acceso mediante el refresh token.
* `POST /api/auth/logout`: Invalida y elimina las cookies de autenticación.

#### Espacios (`/api/spaces`)
* `GET /api/spaces`: Lista espacios activos (o todos si se provee `all=true` y rol `ADMIN`).
* `POST /api/spaces`: Crea un nuevo espacio (exclusivo `ADMIN`).
* `GET /api/spaces/[id]`: Obtiene el detalle de un espacio específico.
* `PATCH /api/spaces/[id]`: Actualiza información de un espacio (exclusivo `ADMIN`).
* `PATCH /api/spaces/[id]/activate`: Reactiva un espacio inactivo (exclusivo `ADMIN`).
* `PATCH /api/spaces/[id]/deactivate`: Desactiva un espacio verificando que no existan reservas futuras (exclusivo `ADMIN`).

#### Reservas (`/api/bookings`)
* `GET /api/bookings`: Retorna las reservas del usuario autenticado (o todas si es `ADMIN` con `all=true`).
* `POST /api/bookings`: Crea una reserva mediante transacción atómica validando todas las reglas RN-01 a RN-08.
* `PATCH /api/bookings/[id]/cancel`: Cancela una reserva validando la política de anticipación (RN-10).

---

## 8. Ejecución con Docker

El proyecto incluye un `Dockerfile` multi-etapa optimizado para producción (`standalone` output):

```bash
# Levantar el entorno contenerizado con Docker Compose
npm run docker:up

# Ver logs del contenedor en tiempo real
npm run docker:logs

# Detener los contenedores
npm run docker:down
```

---

## 9. Scripts Disponibles

| Script | Acción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo con Turbopack en el puerto 3000. |
| `npm run build` | Compila la aplicación para producción en modo standalone. |
| `npm run start` | Arranca la build de producción. |
| `npm run lint` | Ejecuta el análisis estático de código con ESLint. |
| `npx tsc --noEmit` | Valida los tipos de TypeScript sin emitir archivos. |
| `npm run docker:build` | Construye la imagen Docker de la aplicación. |
| `npm run docker:up` | Levanta el contenedor con Docker Compose. |
| `npm run docker:down` | Detiene el contenedor de Docker Compose. |
| `npm run docker:logs` | Sigue en tiempo real los registros de ejecución de Docker. |

---

## 10. Despliegue en Vercel

La aplicación está completamente optimizada para su despliegue continuo en **Vercel** conectada a la base de datos PostgreSQL en **Supabase**:

* **URL de Producción:** [https://cospace-app.vercel.app](https://cospace-app.vercel.app) *(o la URL asignada al importar el repositorio en Vercel)*
* **Variables de Entorno Requeridas en el panel de Vercel (Settings -> Environment Variables):**
  * `DATABASE_URL`: URL del Transaction Pooler de Supabase (`postgresql://...:5432/postgres` o `:6543/postgres?pgbouncer=true`).
  * `DIRECT_URL`: Conexión directa a Supabase para migraciones.
  * `JWT_ACCESS_SECRET`: Clave de cifrado de al menos 32 caracteres generada con `openssl rand -base64 32`.
  * `JWT_REFRESH_SECRET`: Clave de cifrado de al menos 32 caracteres.
  * `ACCESS_TOKEN_EXPIRES_IN`: `15m`
  * `REFRESH_TOKEN_EXPIRES_IN`: `7d`
  * `NEXT_PUBLIC_TIMEZONE`: `America/Bogota`
  * `NEXT_PUBLIC_APP_URL`: Dominio público de Vercel (e.g. `https://tu-proyecto.vercel.app`).

* **Comando de Compilación Automático:** `prisma generate && next build` (configurado en `npm run build` y `postinstall`).
