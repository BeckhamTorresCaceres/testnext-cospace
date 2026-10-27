# Especificación de Diseño y Experiencia de Usuario (UI/UX) - CoSpace

**Proyecto:** CoSpace - Plataforma de Reserva de Espacios de Coworking  
**Versión:** 1.0.0  
**Alineación Técnica:** Next.js 16 (App Router), TypeScript Estricto, Tailwind CSS v4, `next/image`  
**Alineación Funcional:** [SRS.md](file:///home/cohorte5/Documentos/beckham/testnext-cospace/SRS.md) y [ARCHITECTURE.md](file:///home/cohorte5/Documentos/beckham/testnext-cospace/ARCHITECTURE.md)  

---

## 1. Visión y Principios de Experiencia de Usuario (UX)

CoSpace ofrece una experiencia digital de alto impacto estético y fluidez operativa para profesionales, nómadas digitales y equipos que requieren reservar espacios de trabajo por horas de forma instantánea y confiable.

### 1.1 Principios Rectores
1. **Transparencia y Claridad Inmediata:** Los usuarios comprenden al instante las tarifas, la capacidad de cada espacio y la disponibilidad horaria sin costes ocultos ni cálculos ambiguos.
2. **Eficiencia en la Reserva (0 Fricción):** El proceso de reserva por horas debe completarse en menos de 3 clics desde la ficha del espacio, con validación reactiva en tiempo real de las reglas de negocio (1 a 4 horas completas, franja 07:00 a 21:00 `America/Bogota`).
3. **Protección Perceptiva contra Errores:** La interfaz previene activamente selecciones inválidas (fechas pasadas, solapamientos, duraciones fraccionadas) antes de que el usuario envíe el formulario.
4. **Consistencia Bilingüe Fluida:** La interfaz se adapta naturalmente a Español e Inglés sin saltos de maquetación ni recargas bruscas, manteniendo URLs limpias mediante la cookie `NEXT_LOCALE`.
5. **Estética Premium y Moderna:** Uso de temas oscuros elegantes, efectos de desenfoque y cristal (*glassmorphism* sutil), microinteracciones y tipografía refinada que transmiten profesionalismo y tecnología de vanguardia.

---

## 2. Sistema de Diseño (Design Tokens & Fundamentos Visuales)

### 2.1 Paleta de Colores

La identidad cromática se basa en un esquema moderno de contraste alto con tonalidades pizarra, acentos índigo/violeta y códigos cromáticos de estado semánticos:

```css
:root {
  /* Fondos y Superficies */
  --bg-primary: #090d16;        /* Slate muy profundo para fondo principal */
  --bg-secondary: #0f172a;      /* Slate oscuro para contenedores y tarjetas */
  --bg-card: rgba(15, 23, 42, 0.75); /* Card con soporte de backdrop-filter */
  --bg-elevated: #1e293b;      /* Superficie elevada (modales, dropdowns) */
  --border-subtle: rgba(255, 255, 255, 0.08); /* Bordes suaves y delimitadores */
  --border-hover: rgba(99, 102, 241, 0.4);   /* Borde al hacer hover */

  /* Textos y Contrastes */
  --text-primary: #f8fafc;      /* Blanco perla de máxima legibilidad */
  --text-secondary: #94a3b8;    /* Gris neutro para subtítulos y metadatos */
  --text-muted: #64748b;        /* Gris tenue para textos de apoyo y placeholders */

  /* Acentos de Marca */
  --brand-primary: #6366f1;     /* Índigo vibrante */
  --brand-primary-hover: #4f46e5;
  --brand-glow: rgba(99, 102, 241, 0.25);

  /* Estados Semánticos (Alineados al SRS) */
  --status-confirmed: #10b981;  /* Esmeralda / Verde menta (CONFIRMED) */
  --status-confirmed-bg: rgba(16, 185, 129, 0.12);
  --status-cancelled: #f43f5e;  /* Rosa carmesí (CANCELLED) */
  --status-cancelled-bg: rgba(244, 63, 94, 0.12);
  --status-warning: #f59e0b;    /* Ámbar (Alerta tiempo límite de cancelación < 2h) */
  --status-warning-bg: rgba(245, 158, 11, 0.12);
  --status-info: #0ea5e9;       /* Azul cielo para información de zona horaria */
}
```

### 2.2 Tipografía y Jerarquía

* **Fuente Principal:** Inter / Geist Sans (fuente de alta legibilidad en pantallas retina y tamaños compactos).
* **Escala Tipográfica:**
  * **H1 (Hero Titular):** 40px – 48px | Font-Weight: 700 / Bold | Interletrado: -0.02em.
  * **H2 (Títulos de Sección):** 28px – 32px | Font-Weight: 600 / SemiBold.
  * **H3 (Tarjetas y Modales):** 20px – 24px | Font-Weight: 600.
  * **Body (Párrafos y Contenido):** 15px – 16px | Font-Weight: 400 / Regular | Line-Height: 1.6.
  * **Caption / Metadatos / Badges:** 12px – 13px | Font-Weight: 500 / Medium | Interletrado: +0.01em.

### 2.3 Elevaciones, Bordes y Glassmorphism

* **Radio de Borde Estándar:** `rounded-xl` (12px) para tarjetas y entradas; `rounded-full` para chips y badges.
* **Efecto de Cristal (*Glassmorphism*):**
  * `backdrop-filter: blur(12px);`
  * `background: rgba(15, 23, 42, 0.7);`
  * `border: 1px solid rgba(255, 255, 255, 0.08);`
* **Sombras Suaves:**
  * Card normal: `box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.4);`
  * Card hover: `box-shadow: 0 10px 25px -3px rgba(99, 102, 241, 0.2);` con ligera translación vertical `-2px`.

---

## 3. Arquitectura de Información y Vistas Clave

```
+-------------------------------------------------------------------------------+
|                            ARQUITECTURA DE VISTAS                             |
+-------------------------------------------------------------------------------+
|                                                                               |
|  [ VISTAS PÚBLICAS ]                                                          |
|  ├── Home (/) [SSG]                                                           |
|  │   └── Hero + Propuesta + Categorías + Testimonios + Footer                 |
|  ├── Catálogo (/spaces) [SSR]                                                 |
|  │   └── Filtros (Tipo, Capacidad) + Grid de Espacios + Estados Vacíos        |
|  └── Detalle (/spaces/[id]) [SSR]                                             |
|      └── Galería (next/image) + Ficha Técnica + BookingWidget [CSR]           |
|                                                                               |
|  [ AUTENTICACIÓN ]                                                            |
|  ├── Iniciar Sesión (/login) [Layout Auth Centrado]                           |
|  └── Registro de Usuario (/register) [Layout Auth Centrado]                   |
|                                                                               |
|  [ PRIVADO: USUARIO ]                                                         |
|  └── Dashboard (/dashboard) [CSR]                                             |
|      ├── LocalTimeBanner (Sincronización horaria contra America/Bogota)       |
|      ├── Resumen de Cuota (Máx. 3 futuras activas - RN-06)                   |
|      └── Pestañas: Próximas (Confirmadas) | Historial | Canceladas            |
|          └── CancelBookingButton (Regla RN-10 con cálculo de 2h)              |
|                                                                               |
|  [ ADMINISTRACIÓN ]                                                           |
|  └── Panel Admin (/admin) [SSR + CSR]                                         |
|      ├── Header con Métricas (Espacios activos, Ocupación, Reservas del día)  |
|      └── SpaceTable (Listado global, botón de crear, editar y desactivar)     |
|          └── DeactivateDialog (Verificación de integridad RN-13)              |
+-------------------------------------------------------------------------------+
```

---

## 4. Diseño Detallado de Componentes y Flujos de Usuario

### 4.1 Barra de Navegación Global (`Navbar`)
* **Estado Público:** Logo CoSpace con resplandor sutil, enlaces de navegación (`Inicio`, `Espacios`), selector de idioma interactivo (`ES | EN`) y botones `Iniciar Sesión` y `Registrarse`.
* **Estado Autenticado:** Menú de usuario con avatar / iniciales, badge con rol (`USER` o `ADMIN`), enlace a `Mis Reservas` (`/dashboard`), enlace a `Panel Admin` (si es `ADMIN`) y botón de cierre de sesión seguro.
* **Selector de Idioma (`LanguageSwitcher`):** Toggle accesible que conmuta la cookie `NEXT_LOCALE` entre `es` y `en` sin alterar la URL actual.

### 4.2 Catálogo y Ficha de Espacios (`SpaceCard` y `/spaces/[id]`)
* **Tarjeta de Catálogo (`SpaceCard`):**
  * Contenedor fotográfico con relación de aspecto 16:9 optimizado vía `next/image` con placeholder blur.
  * Tag superior de categoría:
    * `DESK`: Insignia azul (Escritorio Compartido / Hot Desk).
    * `MEETING_ROOM`: Insignia violeta (Sala de Reuniones).
    * `BOOTH`: Insignia ámbar (Cabina Acústica Privada).
  * Indicador de capacidad: Icono de personas + `Hasta X personas`.
  * Tarifa destacada: Importe formateado con etiqueta `/ hora` (por ejemplo, `$15.000 / hora` o `$15.00 / hour`).
  * Botón de acción: `Reservar Espacio` o `Ver Detalles`.

### 4.3 Motor Transaccional de Reserva (`BookingWidget`)
Ubicado en la vista de detalle `/spaces/[id]`, es el componente central de conversión:
1. **Selector de Fecha:**
   * Restricción calendarizada: No permite fechas pasadas ni fechas superiores a 30 días calendario futuros (**RN-03**).
2. **Selector de Bloque Horario:**
   * Selector de hora de inicio (07:00 a 20:00).
   * Selector de hora de finalización (08:00 a 21:00).
   * Restricción estricta de minutos: Fijados siempre a `:00` (**RN-01**).
   * Restricción de duración: Solo permite seleccionar bloques continuos de **1, 2, 3 o 4 horas** (**RN-01**).
3. **Desglose en Vivo (`BookingSummary`):**
   * Muestra la duración calculada: ej. `2 horas seleccionadas`.
   * Muestra el cálculo transparente: `$25.00 / hora × 2 horas = $50.00 Total`.
   * Nota informativa de zona horaria: `Horarios sincronizados con America/Bogota (UTC-5)`.
4. **Estados del Botón de Reserva:**
   * *Deshabilitado:* Si los campos están incompletos o la duración no cumple entre 1 y 4 horas.
   * *Cargando (Loading Spinner):* Durante el procesamiento de la transacción.
   * *Éxito / Redirección:* Al confirmar, muestra toast de éxito y redirige a `/dashboard`.
   * *Error de Conflicto (409):* Alerta visual clara si otro usuario confirmó la misma franja o se superó el límite de 3 reservas futuras (**RN-04**, **RN-06**).

### 4.4 Panel de Reservas del Usuario (`/dashboard`)
* **Banner de Sincronización Horaria (`<LocalTimeBanner />`):**
  * Muestra al usuario su hora local comparada con la hora oficial de la sede física (`America/Bogota`).
  * Implementado con montaje diferido (`useEffect`) para **garantizar 0 errores de hidratación** (*hydration mismatch*).
* **Contador de Límite Activo:**
  * Indicador visual: `Reservas activas: X de 3 permitidas` (**RN-06**).
* **Listado de Tarjetas de Reserva (`BookingCard`):**
  * Información completa: Nombre del espacio, foto miniatura, fecha, rango de horas y desglose económico guardado en el snapshot (`pricePerHourSnapshot`, `totalPrice`).
  * Insignia de estado:
    * Verde pulsante para `CONFIRMED`.
    * Gris tachado para reservas `CONCLUIDAS`.
    * Rojo suave para `CANCELLED`.
* **Botón de Cancelación Inteligente (`CancelBookingButton`):**
  * Evalúa en tiempo real: $t_{\text{inicio}} - t_{\text{actual}}$.
  * **Si faltan $\ge 2$ horas (o el usuario es `ADMIN`):** Botón activo `Cancelar Reserva` con variante de peligro. Al hacer clic, abre un modal accesible de confirmación advirtiendo que la acción es irreversible (**RN-10**, **RN-11**).
  * **Si faltan $< 2$ horas y es usuario normal:** Botón deshabilitado con un tooltip explicativo: *"No es posible cancelar con menos de 2 horas de anticipación conforme a la política del coworking"* (**RN-10**).

### 4.5 Panel Administrativo (`/admin`)
* **Métricas Rápidas (`StatsOverview`):**
  * Tarjetas de resumen: Total de espacios activos, total de reservas para el día de hoy, ingresos proyectados de la semana.
* **Tabla de Espacios (`SpaceTable`):**
  * Columnas: Imagen, Nombre, Categoría, Capacidad, Precio/Hora, Estado (`Activo` / `Inactivo`), Acciones.
* **Modal de Creación y Edición (`SpaceFormModal`):**
  * Formulario reactivo con preview instantáneo de la URL de la imagen.
  * Validación Zod en cliente y servidor con feedback inline de errores.
* **Diálogo de Desactivación Segura (`DeactivateDialog`):**
  * Al pulsar "Desactivar", el sistema realiza una precomprobación de integridad (**RN-13**).
  * Si existen reservas futuras confirmadas asociadas al espacio, el botón se bloquea y se muestra una alerta: *"Este espacio no puede desactivarse porque cuenta con X reservas futuras confirmadas"*.

---

## 5. Directrices de Accesibilidad (a11y) y Responsividad

### 5.1 Estándar WCAG 2.1 Nivel AA
1. **Contraste de Color:**
   * Textos normales (`#f8fafc` sobre `#090d16` y `#0f172a`): Ratio superior a 12:1 (excede ampliamente el mínimo de 4.5:1).
   * Textos secundarios (`#94a3b8`): Ratio superior a 5.5:1.
   * Badges de estado: Diseñados con borde y texto de alto contraste sin depender únicamente del color para transmitir el estado (incluye icono + texto explícito).
2. **Navegación por Teclado:**
   * Todos los controles interactivos (botones, enlaces, selectores, modales) tienen estados `:focus-visible` notorios con anillo de enfoque índigo (`focus:ring-2 focus:ring-indigo-500 focus:outline-none`).
   * Los modales atrapan el foco (*focus trap*) y se cierran al presionar `Escape`.
3. **Lectores de Pantalla:**
   * Formularios con etiquetas semánticas (`<label htmlFor="...">`) y `aria-describedby` para mensajes de error.
   * Botones de iconos con atributos `aria-label`.

### 5.2 Estrategia Responsiva (Breakpoints)
* **Mobile (< 640px):**
  * Menú de navegación colapsable en drawer lateral.
  * Grilla de catálogo en 1 sola columna.
  * El `BookingWidget` se ubica como panel inferior o pestaña deslizante para optimizar el alcance del pulgar (*thumb-zone*).
* **Tablet (640px – 1024px):**
  * Grilla de catálogo en 2 columnas.
  * Dashboard con distribución optimizada de reservas.
* **Desktop (> 1024px):**
  * Grilla de catálogo en 3 columnas.
  * Vista de detalle del espacio con disposición a 2 columnas: Columna izquierda ancha (Galería + Ficha técnica) y Columna derecha fija (*sticky*) con el `BookingWidget`.

---

## 6. Estados de Carga, Error y Vacíos (*Feedback States*)

1. **Skeletons de Carga:** En lugar de spinners a pantalla completa, se utilizan placeholders animados con efecto de onda pulsante (`animate-pulse`) que replican la forma de las tarjetas `SpaceCard` y `BookingCard`.
2. **Estados Vacíos (*Empty States*):**
   * Cuando el catálogo no tiene resultados para un filtro: Ilustración minimalista + texto *"No encontramos espacios con estos criterios"* + botón *"Restablecer filtros"*.
   * Cuando el usuario no tiene reservas en el Dashboard: Ilustración + mensaje motivador *"Aún no tienes reservas programadas"* + botón destacado *"Explorar Espacios"*.
3. **Manejo de Notificaciones (Toasts):**
   * Sistema de toasts no intrusivos en la esquina superior derecha (`top-right`) para confirmar acciones (ej. *"Reserva confirmada con éxito"*, *"Sesión iniciada"*, *"Reserva cancelada"*).