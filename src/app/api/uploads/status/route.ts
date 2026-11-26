import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/features/auth';
import {
  s3UploadService,
  uploadStatusQuerySchema,
} from '@/features/uploads';
import { handleApiError } from '@/core/errors';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const { key } = uploadStatusQuerySchema.parse({
      key: searchParams.get('key') ?? '',
    });

    const status = await s3UploadService.checkOptimizedImageStatus(key);
    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

