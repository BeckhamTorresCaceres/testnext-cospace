export const dynamic = 'force-dynamic';

import {
  SpacesCatalogView,
  type SpaceData,
  spaceService,
  spaceFilterSchema,
} from '@/features/spaces';

export default async function SpacesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; minCapacity?: string }>;
}) {
  const params = await searchParams;
  const parsed = spaceFilterSchema.safeParse({
    type: params.type || undefined,
    minCapacity: params.minCapacity || undefined,
  });

  const filters = parsed.success ? parsed.data : {};
  let spaces: SpaceData[] = [];

  try {
    spaces = await spaceService.getActiveSpaces(filters);
  } catch {
    spaces = [];
  }

  const currentType = filters.type ?? '';
  const currentCap = filters.minCapacity ? String(filters.minCapacity) : '';

  return (
    <SpacesCatalogView
      spaces={spaces}
      currentType={currentType}
      currentCap={currentCap}
    />
  );
}
