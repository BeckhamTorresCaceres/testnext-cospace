import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/features/auth';
import { presignUploadSchema, s3UploadService } from '@/features/uploads';
import { handleApiError } from '@/core/errors';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const validated = presignUploadSchema.parse(body);
    const result = await s3UploadService.createPresignedUpload(validated);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

