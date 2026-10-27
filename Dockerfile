# ==========================================
# Multi-Stage Dockerfile for CoSpace Next.js
# ==========================================

# 1. Dependencias (deps)
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copiar manifiestos de paquetes y schema de Prisma
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Instalación limpia de dependencias de producción y desarrollo
RUN npm ci

# 2. Compilación (builder)
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Desactivar telemetría en compilación
ENV NEXT_TELEMETRY_DISABLED=1

# Generar cliente de Prisma para Linux Musl y compilar en modo standalone
RUN npx prisma generate
RUN npm run build

# 3. Runner de Producción
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Crear grupo y usuario sin privilegios por seguridad (RNF-10)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar assets estáticos y bundle standalone optimizado
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Asignar permisos y cambiar a usuario no-root
USER nextjs

EXPOSE 3000

# Iniciar servidor Node.js standalone
CMD ["node", "server.js"]
