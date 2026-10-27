export interface SpaceItem {
  id: string;
  name: string;
  description: string;
  type: 'DESK' | 'MEETING_ROOM' | 'BOOTH';
  capacity: number;
  pricePerHour: number;
  imageUrl: string;
  isActive: boolean;
}

export interface AdminBookingItem {
  id: string;
  spaceId: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  pricePerHourSnapshot: number;
  totalPrice: number;
  status: 'CONFIRMED' | 'CANCELLED';
  space?: {
    name: string;
    type: 'DESK' | 'MEETING_ROOM' | 'BOOTH';
    imageUrl: string;
    capacity: number;
  };
  user?: {
    name: string;
    email: string;
  };
}

export interface SpaceFormState {
  name: string;
  description: string;
  type: 'DESK' | 'MEETING_ROOM' | 'BOOTH';
  capacity: string;
  pricePerHour: string;
  imageUrl: string;
}

export const DEFAULT_SPACE_FORM: SpaceFormState = {
  name: '',
  description: '',
  type: 'DESK',
  capacity: '1',
  pricePerHour: '15',
  imageUrl:
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=85',
};

export type AdminSection = 'SPACES' | 'BOOKINGS';
