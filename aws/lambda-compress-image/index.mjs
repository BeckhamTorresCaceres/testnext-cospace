import path from 'node:path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';

const s3 = new S3Client({});

function normalizePrefix(value, fallback) {
  const cleaned = (value || fallback).trim().replace(/^\/+/, '').replace(/\/+$/, '');
  return cleaned ? `${cleaned}/` : '';
}

const RAW_PREFIX = normalizePrefix(process.env.RAW_PREFIX, 'raw');
const OPTIMIZED_PREFIX = normalizePrefix(process.env.OPTIMIZED_PREFIX, 'spaces');
const OUTPUT_FORMAT =
  (process.env.OUTPUT_FORMAT || 'webp').trim().toLowerCase() === 'jpeg' ||
  (process.env.OUTPUT_FORMAT || 'webp').trim().toLowerCase() === 'jpg'
    ? 'jpeg'
    : 'webp';
const OUTPUT_QUALITY = Number.parseInt(process.env.OUTPUT_QUALITY || '80', 10);
const MAX_WIDTH = Number.parseInt(process.env.MAX_WIDTH || '1600', 10);
const MAX_HEIGHT = Number.parseInt(process.env.MAX_HEIGHT || '1200', 10);
const DELETE_RAW = process.env.DELETE_RAW === 'true';

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

function decodeS3Key(rawKey) {
  return decodeURIComponent(rawKey.replace(/\+/g, ' '));
}

function buildOptimizedKey(sourceKey) {
  const relative = sourceKey.slice(RAW_PREFIX.length);
  const ext = path.posix.extname(relative);
  const stem = ext ? relative.slice(0, -ext.length) : relative;
  const outputExt = OUTPUT_FORMAT === 'jpeg' ? 'jpg' : 'webp';
  return `${OPTIMIZED_PREFIX}${stem}.${outputExt}`;
}

export const handler = async (event) => {
  const results = [];

  for (const record of event.Records ?? []) {
    const bucket = record.s3?.bucket?.name;
    const rawObjectKey = record.s3?.object?.key;

    if (!bucket || !rawObjectKey) {
      continue;
    }

    const sourceKey = decodeS3Key(rawObjectKey);

    // Evitar bucles infinitos y carpetas vacías
    if (
      sourceKey.endsWith('/') ||
      !sourceKey.startsWith(RAW_PREFIX) ||
      sourceKey.startsWith(OPTIMIZED_PREFIX)
    ) {
      console.log(`Skipping key outside raw prefix: ${sourceKey}`);
      continue;
    }

    const ext = path.posix.extname(sourceKey).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      console.log(`Skipping unsupported extension: ${sourceKey}`);
      continue;
    }

    const destinationKey = buildOptimizedKey(sourceKey);

    const getRes = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: sourceKey,
      })
    );

    if (!getRes.Body) {
      throw new Error(`Empty object body for s3://${bucket}/${sourceKey}`);
    }

    const inputBytes = await getRes.Body.transformToByteArray();
    const inputBuffer = Buffer.from(inputBytes);

    const pipeline = sharp(inputBuffer)
      .rotate()
      .resize({
        width: MAX_WIDTH,
        height: MAX_HEIGHT,
        fit: 'inside',
        withoutEnlargement: true,
      });

    const outputBuffer =
      OUTPUT_FORMAT === 'jpeg'
        ? await pipeline.jpeg({ quality: OUTPUT_QUALITY, mozjpeg: true }).toBuffer()
        : await pipeline.webp({ quality: OUTPUT_QUALITY, effort: 4 }).toBuffer();

    const contentType = OUTPUT_FORMAT === 'jpeg' ? 'image/jpeg' : 'image/webp';

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: destinationKey,
        Body: outputBuffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
        Metadata: {
          'compressed-from': sourceKey,
          'original-bytes': String(inputBuffer.length),
          'compressed-bytes': String(outputBuffer.length),
        },
      })
    );

    if (DELETE_RAW) {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: sourceKey,
        })
      );
    }

    const ratio = (
      ((inputBuffer.length - outputBuffer.length) / Math.max(inputBuffer.length, 1)) *
      100
    ).toFixed(1);

    console.log(
      `Compressed s3://${bucket}/${sourceKey} -> ${destinationKey} (${inputBuffer.length} B -> ${outputBuffer.length} B, ${ratio}% saved)`
    );

    results.push({
      bucket,
      sourceKey,
      destinationKey,
      originalBytes: inputBuffer.length,
      compressedBytes: outputBuffer.length,
    });
  }

  return {
    processed: results.length,
    results,
  };
};

