# AWS Lambda: Compresión automática de imágenes para CoSpace

Esta función Lambda se dispara automáticamente cuando Next.js sube una imagen original al prefijo `raw/` en S3 (vía Presigned URL), la redimensiona y comprime con `sharp` a `.webp` (o `.jpg`) y guarda la versión optimizada en `spaces/`.

---

## 1. Configuración del Bucket S3

1. Crea un bucket en la misma región que tu EC2 (por ejemplo `us-east-1`), ej. `cospace-images-prod`.
2. **CORS del bucket** (Permisos -> Uso compartido de recursos entre orígenes / CORS) para permitir la subida directa `PUT` desde el navegador:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": [
      "https://cospaces.coderhivex.com",
      "http://localhost:3000"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

3. **Acceso público de lectura para `spaces/*`** (si sirves directo desde S3; si usas CloudFront con OAC, mantén el bucket privado y da permiso solo a CloudFront):
   - Desmarca "Bloquear el acceso público a buckets y objetos mediante nuevas políticas de bucket" si usarás política pública directa.
   - Política de bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadOptimizedSpaces",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::TU-BUCKET/spaces/*"
    }
  ]
}
```

---

## 2. Permisos IAM

### A) Rol IAM de la función Lambda
Asigna esta política al Execution Role de la Lambda (además de `AWSLambdaBasicExecutionRole` para logs en CloudWatch):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::TU-BUCKET/raw/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::TU-BUCKET/spaces/*"
    }
  ]
}
```

### B) Permisos para la app Next.js (IAM Role de la EC2 o usuario IAM en `.env`)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::TU-BUCKET/raw/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::TU-BUCKET/spaces/*"
    }
  ]
}
```

---

## 3. Empaquetar y desplegar la Lambda (`sharp` compilado para Linux)

`sharp` usa binarios nativos. Empaqueta especificando la arquitectura de tu Lambda (`arm64` recomendado por costo/velocidad, o `x64`):

```bash
cd aws/lambda-compress-image
npm install --os=linux --cpu=arm64 sharp
npm install
zip -r lambda-compress-image.zip index.mjs package.json node_modules
```

*(Si tu Lambda usa arquitectura `x86_64`, cambia `--cpu=arm64` por `--cpu=x64`).*

### Configuración recomendada en AWS Lambda
- **Runtime:** `Node.js 20.x` o `Node.js 22.x`
- **Handler:** `index.handler`
- **Architecture:** `arm64` (o la misma con la que compilaste `sharp`)
- **Memory:** `512 MB` – `1024 MB`
- **Timeout:** `30` segundos
- **Variables de entorno opcionales:**
  - `RAW_PREFIX=raw/`
  - `OPTIMIZED_PREFIX=spaces/`
  - `OUTPUT_FORMAT=webp` (`webp` o `jpeg`)
  - `OUTPUT_QUALITY=80`
  - `MAX_WIDTH=1600`
  - `MAX_HEIGHT=1200`
  - `DELETE_RAW=false` (pon `true` si quieres borrar el archivo original de `raw/` tras comprimir)

### Trigger de S3
En la Lambda (o en Propiedades -> Notificaciones de eventos del bucket S3):
- **Event types:** `s3:ObjectCreated:*`
- **Prefix:** `raw/` *(obligatorio para que solo procese subidas originales y nunca `spaces/`)*

---

## 4. Variables de entorno en Next.js (`.env`)

```env
AWS_REGION=us-east-1
AWS_S3_BUCKET=TU-BUCKET
AWS_S3_RAW_PREFIX=raw/
AWS_S3_OPTIMIZED_PREFIX=spaces/
AWS_S3_OUTPUT_FORMAT=webp
# Opcional si usas CloudFront:
# AWS_S3_PUBLIC_BASE_URL=https://dxxxxxxxxxxxxx.cloudfront.net
```

