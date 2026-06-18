import type {
  SerializedHotel,
  SerializedHotelStayPolicy,
  SerializedProduct,
  SerializedStayPolicy,
} from "@/types/event";

type LegacyStayPolicy = {
  main?: {
    checkIn?: string | Date;
    checkOut?: string | Date;
  };
  earlyArrival?: {
    enabled?: boolean;
    from?: string | Date;
    feePerNight?: number;
  };
  lateDeparture?: {
    enabled?: boolean;
    until?: string | Date;
    feePerNight?: number;
  };
};

export interface ResolvedAccommodationHotel extends SerializedHotel {
  roomTypes: SerializedProduct[];
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function asDate(value: unknown, fallback: Date): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return fallback;
}

function normalizeCheckOut(checkIn: Date, value: unknown, fallback: Date): Date {
  const checkOut = asDate(value, fallback);
  if (checkOut > checkIn) {
    return checkOut;
  }

  return new Date(checkIn.getTime() + DAY_IN_MS);
}

function fallbackStayWindow(startDate?: Date | string, endDate?: Date | string) {
  const checkIn = asDate(startDate, new Date());
  const checkOut = normalizeCheckOut(checkIn, endDate, new Date(checkIn.getTime() + DAY_IN_MS));

  return { checkIn, checkOut };
}

export function createDefaultHotelStayPolicy(
  startDate?: Date | string,
  endDate?: Date | string,
): SerializedHotelStayPolicy {
  const { checkIn, checkOut } = fallbackStayWindow(startDate, endDate);

  return {
    main: {
      checkIn,
      checkOut,
    },
    earlyArrival: {
      enabled: false,
      pricingMode: "AUTO",
    },
    lateDeparture: {
      enabled: false,
      pricingMode: "AUTO",
    },
  };
}

export function cloneHotelStayPolicy(policy: SerializedHotelStayPolicy): SerializedHotelStayPolicy {
  return {
    main: {
      checkIn: policy.main.checkIn,
      checkOut: policy.main.checkOut,
    },
    earlyArrival: {
      enabled: policy.earlyArrival.enabled,
      from: policy.earlyArrival.from,
      pricingMode: policy.earlyArrival.pricingMode,
      feePerNight: policy.earlyArrival.feePerNight,
    },
    lateDeparture: {
      enabled: policy.lateDeparture.enabled,
      until: policy.lateDeparture.until,
      pricingMode: policy.lateDeparture.pricingMode,
      feePerNight: policy.lateDeparture.feePerNight,
    },
  };
}

function normalizeHotelPolicy(
  raw: unknown,
  startDate?: Date | string,
  endDate?: Date | string,
): SerializedHotelStayPolicy {
  const defaults = createDefaultHotelStayPolicy(startDate, endDate);
  const legacy = (raw ?? {}) as LegacyStayPolicy;
  const checkIn = asDate(legacy.main?.checkIn, defaults.main.checkIn as Date);
  const checkOut = normalizeCheckOut(checkIn, legacy.main?.checkOut, defaults.main.checkOut as Date);

  return {
    main: {
      checkIn,
      checkOut,
    },
    earlyArrival: {
      enabled: Boolean(legacy.earlyArrival?.enabled),
      from: legacy.earlyArrival?.from ? asDate(legacy.earlyArrival.from, new Date(checkIn.getTime() - DAY_IN_MS)) : undefined,
      pricingMode: legacy.earlyArrival?.feePerNight !== undefined ? "CUSTOM" : "AUTO",
      feePerNight: legacy.earlyArrival?.feePerNight,
    },
    lateDeparture: {
      enabled: Boolean(legacy.lateDeparture?.enabled),
      until: legacy.lateDeparture?.until ? asDate(legacy.lateDeparture.until, new Date(checkOut.getTime() + DAY_IN_MS)) : undefined,
      pricingMode: legacy.lateDeparture?.feePerNight !== undefined ? "CUSTOM" : "AUTO",
      feePerNight: legacy.lateDeparture?.feePerNight,
    },
  };
}

function normalizeHotel(
  hotel: Partial<SerializedHotel> | undefined,
  fallbackName: string,
  startDate?: Date | string,
  endDate?: Date | string,
): SerializedHotel {
  return {
    id: hotel?.id || `hotel-${Math.random().toString(36).slice(2, 10)}`,
    name: hotel?.name || fallbackName,
    isPrimary: Boolean(hotel?.isPrimary),
    roomTypeProductIds: Array.isArray(hotel?.roomTypeProductIds)
      ? hotel.roomTypeProductIds.filter((value): value is string => typeof value === "string" && value.length > 0)
      : [],
    stayPolicy: normalizeHotelPolicy(hotel?.stayPolicy, startDate, endDate),
  };
}

export function normalizeStayPolicy(
  raw: unknown,
  products: SerializedProduct[] = [],
  fallbackHotelName = "Main Hotel",
  startDate?: Date | string,
  endDate?: Date | string,
): SerializedStayPolicy {
  const record = (raw ?? {}) as Record<string, unknown>;

  if (Array.isArray(record.hotels)) {
    const hotels = record.hotels.map((hotel, index) =>
      normalizeHotel(
        hotel as Partial<SerializedHotel>,
        index === 0 ? fallbackHotelName : `Overflow Hotel ${index}`,
        startDate,
        endDate,
      ),
    );

    const withPrimary = hotels.map((hotel, index) => ({
      ...hotel,
      isPrimary: hotels.some(item => item.isPrimary) ? hotel.isPrimary : index === 0,
    }));

    return {
      version: 2,
      mainLocationIsAccommodation: Boolean(record.mainLocationIsAccommodation),
      allowOverflowHotels: Boolean(record.allowOverflowHotels),
      samePolicyAcrossHotels: Boolean(record.samePolicyAcrossHotels),
      hotels: withPrimary,
    };
  }

  const accommodationProductIds = products
    .filter(product => product.type === "ACCOMMODATION")
    .map(product => product.id);

  if (accommodationProductIds.length === 0) {
    return {
      version: 2,
      mainLocationIsAccommodation: false,
      allowOverflowHotels: false,
      samePolicyAcrossHotels: false,
      hotels: [],
    };
  }

  return {
    version: 2,
    mainLocationIsAccommodation: true,
    allowOverflowHotels: false,
    samePolicyAcrossHotels: true,
    hotels: [
      {
        id: "main-hotel",
        name: fallbackHotelName,
        isPrimary: true,
        roomTypeProductIds: accommodationProductIds,
        stayPolicy: normalizeHotelPolicy(raw, startDate, endDate),
      },
    ],
  };
}

export function resolveAccommodationHotels(
  stayPolicy: unknown,
  products: SerializedProduct[],
  fallbackHotelName = "Main Hotel",
  startDate?: Date | string,
  endDate?: Date | string,
): ResolvedAccommodationHotel[] {
  const normalized = normalizeStayPolicy(stayPolicy, products, fallbackHotelName, startDate, endDate);

  return normalized.hotels.map(hotel => ({
    ...hotel,
    roomTypes: hotel.roomTypeProductIds
      .map(productId => products.find(product => product.id === productId))
      .filter((product): product is SerializedProduct => Boolean(product)),
  }));
}

export function findHotelByRoomProductId(
  stayPolicy: unknown,
  roomProductId: string | null | undefined,
  products: SerializedProduct[] = [],
  fallbackHotelName = "Main Hotel",
  startDate?: Date | string,
  endDate?: Date | string,
): ResolvedAccommodationHotel | null {
  if (!roomProductId) {
    return null;
  }

  return (
    resolveAccommodationHotels(stayPolicy, products, fallbackHotelName, startDate, endDate).find(hotel =>
      hotel.roomTypeProductIds.includes(roomProductId),
    ) || null
  );
}

export function resolveStayFee(
  policy:
    | SerializedHotelStayPolicy["earlyArrival"]
    | SerializedHotelStayPolicy["lateDeparture"]
    | null
    | undefined,
  roomPrice: number,
): number {
  if (!policy?.enabled) {
    return 0;
  }

  if (policy.pricingMode === "CUSTOM") {
    return Number(policy.feePerNight || 0);
  }

  return Number(roomPrice || 0);
}

export function calculateMaximumStaySurcharge(
  stayPolicy: unknown,
  products: SerializedProduct[],
  fallbackHotelName = "Main Hotel",
  startDate?: Date | string,
  endDate?: Date | string,
): number {
  return resolveAccommodationHotels(stayPolicy, products, fallbackHotelName, startDate, endDate).reduce((maxValue, hotel) => {
    const highestRoomPrice = Math.max(0, ...hotel.roomTypes.map(room => room.price));
    const total =
      resolveStayFee(hotel.stayPolicy.earlyArrival, highestRoomPrice) +
      resolveStayFee(hotel.stayPolicy.lateDeparture, highestRoomPrice);

    return Math.max(maxValue, total);
  }, 0);
}
