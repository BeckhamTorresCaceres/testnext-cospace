import { Space, SpaceType } from '@prisma/client';

export type { SpaceType };

export interface SpaceDTO {
  id: string;
  name: string;
  description: string;
  type: SpaceType;
  capacity: number;
  pricePerHour: number;
  imageUrl: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toSpaceDTO(space: Space): SpaceDTO {
  return {
    id: space.id,
    name: space.name,
    description: space.description,
    type: space.type,
    capacity: space.capacity,
    pricePerHour: Number(space.pricePerHour),
    imageUrl: space.imageUrl,
    isActive: space.isActive,
    createdAt: space.createdAt,
    updatedAt: space.updatedAt,
  };
}
