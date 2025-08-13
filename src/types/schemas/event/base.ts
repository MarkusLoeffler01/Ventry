import { z } from "zod";

const EventIdSchema = z.uuid();
type EventId = z.infer<typeof EventIdSchema>;


// ---- Location ------------------------------------------------------------------------

const LocationSchema = z.object({
    name: z.string().min(1, "Venue name is required"),
    address: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    country: z.string().min(1, "Country is required"),
    postalCode: z.string().min(1, "Postal code is required"),
}).strict();
type Location = z.infer<typeof LocationSchema>;


// ---- Product ------------------------------------------------------------------------

/**
 * Product, which can be associated with an event ( Merch, Tickets, etc. )
 */
const ProductSchema = z.object({
  id: z.uuid().optional(), // server should decide on the ID
  name: z.string().min(1, "Product name is required"),
  description: z.string().nullable().optional(),
  price: z.coerce.number().positive("Price must be positive")
}).strict();
type Product = z.infer<typeof ProductSchema>;

/**
 * Hotel/Stay policy of the event:
 *  - Main-Days: Standard Check-in/Check-out
 *  - Early-Arrival: optional early check-in
 *  - Late-Departure: optional late check-out
 */
const StayPolicySchema = z.object({
  main: z.object({
    /** First regular Check-in date */
    checkIn: z.coerce.date(),
    /** Regular Check-out date */
    checkOut: z.coerce.date(),
  }).strict(),

  earlyArrival: z.object({
    /** Does event allow early arrival? */
    enabled: z.boolean().default(false),
    /** Optional early check-in date */
    from: z.coerce.date().optional(),
    /** costs per extra-night (if relevant) */
    feePerNight: z.coerce.number().nonnegative().optional(),
  }).strict(),

  lateDeparture: z.object({
    /** Is late-departure allowed?  */
    enabled: z.boolean().default(false),
    /** Optional late check-out date */
    until: z.coerce.date().optional(),
    /** costs per extra-night (if relevant) */
    feePerNight: z.coerce.number().nonnegative().optional(),
  }).strict()
})
.superRefine((data, ctx) => {
  // Main order
  if(data.main.checkOut <= data.main.checkIn) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["main", "checkOut"],
      message: "Main check-out date must be after check-in date"
    })
  }

  // Early arrival
  if(data.earlyArrival.enabled) {
    if(!data.earlyArrival.from) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["earlyArrival", "from"],
        message: "Early arrival 'from' must be specified when enabled"
      });
    } else if(data.earlyArrival.from >= data.main.checkIn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["earlyArrival", "from"],
        message: "Early arrival 'from' must be before main check-in date"
      });
    }
  }

  // Late departure
  if(data.lateDeparture.enabled) {
    if(!data.lateDeparture.until) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lateDeparture", "until"],
        message: "Late departure 'until' must be specified when enabled"
      });
    } else if(data.lateDeparture.until <= data.main.checkOut) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lateDeparture", "until"],
        message: "Late departure 'until' must be after main check-out date"
      });
    }
  }
}).strict();
type StayPolicy = z.infer<typeof StayPolicySchema>;


// ---- Shared Cross-field refinement -----------------------------------------------

/**
 * Cross-Field-Check: endDate must be past startDate (only when both are present)
 * @internal Only as helper for Event-Base
 */
const checkDateOrder = (data: { startDate?: Date; endDate?: Date }, cxt: z.RefinementCtx) => {
  if(data.startDate && data.endDate && data.startDate > data.endDate) {
    cxt.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Start date must be before end date",
      path: ["startDate"],
    });
  }
}

/**
 * Base schema of an event, only the client-delivered, stable fields
 * Used as base for Admin-Create/Update
 */
const EventBaseSchema = z.object({
  name: z.string().min(1, "Event name is required"),
  description: z.string().min(1, "Description is required"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  location: LocationSchema,
  imageUrl: z.url().nullable().optional(),
  products: z.array(ProductSchema).default([]),

  /** Hotel/Stay-Policy: Main-Days + Early/Late-Options */
  stayPolicy: StayPolicySchema
}).superRefine(checkDateOrder).strict();
type EventBase = z.infer<typeof EventBaseSchema>;


/**
 * Entire Event-Entity incl. serverside fields (DB)
 * @usage
 *   - Server-Output for client (Read-Model)
 *   - Internal Domain-validation for persistence
 */
const EventEntitySchema = EventBaseSchema.extend({
  id: EventIdSchema,
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]).default("DRAFT"),
  createdAt: z.date(),
  updatedAt: z.date()
}).strict();
type EventEntity = z.infer<typeof EventEntitySchema>;

/**
 * Base of attendee-preferences/requests
 * @usage
 *   - Changed by users (e.g. Sponsor-Request or Hotel-Request)
 *   - Can be viewed/changed by admins
 */
const ParticipationBaseSchema = z.object({
  needsHotel: z.boolean().default(false),
  wantsEarlyArrival: z.boolean().default(false),
  wantsLateDeparture: z.boolean().default(false),
  notes: z.string().max(1000).optional()

}).strict();
type ParticipationBase = z.infer<typeof ParticipationBaseSchema>;


const EventCreateBaseSchema = EventBaseSchema.superRefine((data, ctx) => {
  if(data.endDate <= new Date()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End date must be in the future",
      path: ["endDate"],
    });
  }
});

export {
    EventBaseSchema,
    EventCreateBaseSchema,
    EventIdSchema,
    EventEntitySchema,
    LocationSchema,
    ProductSchema,
    ParticipationBaseSchema,
}

export type {
  EventBase,
  EventEntity,
  EventId,
  Location,
  Product,
  ParticipationBase,
  StayPolicy
}