import { randomUUID } from 'node:crypto';
import path from 'node:path';
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppError, BadRequestError } from '@/core/errors';
import {
  MIME_TO_EXTENSION,
  type PresignUploadInput,
} from '../schemas/upload.schema';

export interface PresignedUploadResult {
  uploadUrl: string;
  rawKey: string;
  optimizedKey: string;
  optimizedUrl: string;
  expiresInSeconds: number;
}

export interface OptimizedImageStatusResult {
  ready: boolean;
  key: string;
  url: string;
  contentType: string | null;
  contentLength: number | null;
}

interface S3UploadConfig {
  region: string;
  bucket: string;
  rawPrefix: string;
  optimizedPrefix: string;
  publicBaseUrl: string;
  outputExtension: 'webp' | 'jpg';
}

const PRESIGN_EXPIRES_IN_SECONDS = 120;

let cachedClient: S3Client | null = null;
let cachedRegion: string | null = null;

function normalizePrefix(value: string | undefined, fallback: string): string {
  const cleaned = (value || fallback).trim().replace(/^\/+/, '').replace(/\/+$/, '');
  return cleaned ? `${cleaned}/` : '';
}

function getS3Config(): S3UploadConfig {
  const bucket = process.env.AWS_S3_BUCKET?.trim();
  if (!bucket) {
    throw new AppError(
      'AWS S3 no está configurado en el servidor (falta AWS_S3_BUCKET).',
      500,
      'S3NotConfigured'
    );
  }

  const region =
    process.env.AWS_REGION?.trim() ||
    process.env.AWS_DEFAULT_REGION?.trim() ||
    'us-east-1';

  const rawPrefix = normalizePrefix(process.env.AWS_S3_RAW_PREFIX, 'raw');
  const optimizedPrefix = normalizePrefix(
    process.env.AWS_S3_OPTIMIZED_PREFIX,
    'spaces'
  );

  if (rawPrefix === optimizedPrefix) {
    throw new AppError(
      'AWS_S3_RAW_PREFIX y AWS_S3_OPTIMIZED_PREFIX deben ser distintos para evitar bucles en Lambda.',
      500,
      'S3ConfigError'
    );
  }

  const configuredBaseUrl =
    process.env.AWS_S3_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL?.trim();

  const publicBaseUrl = (
    configuredBaseUrl || `https://${bucket}.s3.${region}.amazonaws.com`
  ).replace(/\/+$/, '');

  const outputExtension =
    process.env.AWS_S3_OUTPUT_FORMAT?.trim().toLowerCase() === 'jpeg' ||
    process.env.AWS_S3_OUTPUT_FORMAT?.trim().toLowerCase() === 'jpg'
      ? 'jpg'
      : 'webp';

  return {
    region,
    bucket,
    rawPrefix,
    optimizedPrefix,
    publicBaseUrl,
    outputExtension,
  };
}

function getS3Client(region: string): S3Client {
  if (cachedClient && cachedRegion === region) {
    return cachedClient;
  }

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();

  // En EC2 con IAM Instance Role no es necesario definir credenciales explícitas.
  cachedClient = new S3Client({
    region,
    ...(accessKeyId && secretAccessKey
      ? {
          credentials: {
            accessKeyId,
            secretAccessKey,
            ...(process.env.AWS_SESSION_TOKEN?.trim()
              ? { sessionToken: process.env.AWS_SESSION_TOKEN.trim() }
              : {}),
          },
        }
      : {}),
  });
  cachedRegion = region;

  return cachedClient;
}

function buildSafeSlug(fileName: string): string {
  const baseName = path.basename(fileName, path.extname(fileName));
  const normalized = baseName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);

  return normalized || 'space';
}

function isS3NotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as {
    name?: string;
    Code?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    err.$metadata?.httpStatusCode === 404 ||
    err.name === 'NotFound' ||
    err.name === 'NoSuchKey' ||
    err.Code === 'NotFound' ||
    err.Code === 'NoSuchKey'
  );
}

export class S3UploadService {
  async createPresignedUpload(
    input: PresignUploadInput
  ): Promise<PresignedUploadResult> {
    const config = getS3Config();
    const client = getS3Client(config.region);

    const slug = buildSafeSlug(input.fileName);
    const uniqueStem = `${slug}-${randomUUID()}`;
    const rawExtension = MIME_TO_EXTENSION[input.contentType];

    const rawKey = `${config.rawPrefix}${uniqueStem}.${rawExtension}`;
    const optimizedKey = `${config.optimizedPrefix}${uniqueStem}.${config.outputExtension}`;
    const optimizedUrl = `${config.publicBaseUrl}/${optimizedKey}`;

    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: rawKey,
      ContentType: input.contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: PRESIGN_EXPIRES_IN_SECONDS,
    });

    return {
      uploadUrl,
      rawKey,
      optimizedKey,
      optimizedUrl,
      expiresInSeconds: PRESIGN_EXPIRES_IN_SECONDS,
    };
  }

  async checkOptimizedImageStatus(
    key: string
  ): Promise<OptimizedImageStatusResult> {
    const config = getS3Config();
    const normalizedKey = key.replace(/^\/+/, '');

    if (
      !normalizedKey.startsWith(config.optimizedPrefix) ||
      normalizedKey.includes('..')
    ) {
      throw new BadRequestError(
        `La clave debe pertenecer al prefijo '${config.optimizedPrefix}'.`
      );
    }

    const client = getS3Client(config.region);
    const url = `${config.publicBaseUrl}/${normalizedKey}`;

    try {
      const head = await client.send(
        new HeadObjectCommand({
          Bucket: config.bucket,
          Key: normalizedKey,
        })
      );

      return {
        ready: true,
        key: normalizedKey,
        url,
        contentType: head.ContentType ?? null,
        contentLength: head.ContentLength ?? null,
      };
    } catch (error) {
      if (isS3NotFoundError(error)) {
        return {
          ready: false,
          key: normalizedKey,
          url,
          contentType: null,
          contentLength: null,
        };
      }
      throw error;
    }
  }
}

export const s3UploadService = new S3UploadService();

