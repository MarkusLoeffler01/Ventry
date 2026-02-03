export interface SerializedLocation {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface SerializedProduct {
  id: string;
  name: string;
  price: number;
  description: string | null;
}

export interface SerializedStayPolicy {
  main: {
    checkIn: string | Date;
    checkOut: string | Date;
  };
  earlyArrival: {
    enabled: boolean;
    from?: string | Date;
    feePerNight?: number;
  };
  lateDeparture: {
    enabled: boolean;
    until?: string | Date;
    feePerNight?: number;
  };
}

export interface SerializedEvent {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  imageUrl: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
  stayPolicy: SerializedStayPolicy;
  location?: SerializedLocation | null;
  products: SerializedProduct[];
  _count?: {
    registrations: number;
  };
}
