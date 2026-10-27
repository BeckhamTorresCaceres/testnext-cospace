export const dynamic = 'force-dynamic';

import {
  SpaceDetailClientView,
  type SpaceDetailData,
  spaceService,
} from '@/features/spaces';
import { getAuthenticatedUser } from '@/features/auth';

export default async function SpaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getAuthenticatedUser();
  const isAdmin = user?.role === 'ADMIN';

  let spaceDetail: SpaceDetailData | null = null;

  try {
    const dbSpace = await spaceService.getSpaceById(id, isAdmin);
    spaceDetail = {
      id: dbSpace.id,
      name: dbSpace.name,
      type: dbSpace.type,
      description: dbSpace.description,
      capacity: dbSpace.capacity,
      pricePerHour: Number(dbSpace.pricePerHour),
      imageUrl: dbSpace.imageUrl,
      isActive: dbSpace.isActive,
    };
  } catch {
    spaceDetail = null;
  }

  return <SpaceDetailClientView spaceDetail={spaceDetail} />;
}
