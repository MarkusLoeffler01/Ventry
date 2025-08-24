import { z } from "zod";
import { EventBaseSchema, type EventEntitySchema, EventIdSchema, LocationSchema, type StayPolicy } from "./base";


/**
 * Additional Admin-fields, which go over the base event schema
 * @usage only merge in Admin-DTOs 
 */
const AdminOnlySchema = z.object({
    status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]).default("DRAFT"),
}).strict();


/**
 * Admin create event
 * @endpoint POST /api/admin/event/:id
 * @body EventBase + AdminOnly (without id/createdAt/updatedAt)
 * @who server-side, to create a new event
 */
const adminCreateEventSchema = EventBaseSchema.extend(AdminOnlySchema.shape).strict();
type AdminCreateEventInput = z.input<typeof adminCreateEventSchema>;


/**
 * Admin get event
 * @endpoint GET /api/admin/event/:id
 * @params id: UUID
 * @who Server-side for validating route-parameters
 */
const adminGetEventSchema = z.object({
    id: EventIdSchema
}).strict();
type AdminGetEventInput = z.infer<typeof adminGetEventSchema>;


/**
 * Admin update event
 * @endpoint PUT|PATCH /api/admin/event/:id
 * @body Partial<EventBase + AdminOnly>; id comes separately (Param)
 * @remarks
 *  - Stay-Policy adjustments
 * @who server-side for updates. All fields optional
 */
const adminUpdateEventSchema = EventBaseSchema.extend(AdminOnlySchema.shape).partial().strict();
type AdminUpdateEventInput = z.input<typeof adminUpdateEventSchema>;


/**
 * Admin Update Location (Partial-update)
 * @endpoint PATCH /api/admin/event/:id/location
 * @body Partial of Location
 * @who for specific location updates
 */
const locationUpdateSchema = LocationSchema.partial().strict();
type LocationInput = z.input<typeof locationUpdateSchema>;

/**
 * PATCH /api/admin/event/:id/participation/:userId - Admin approves participation
 * @body { status: "APPROVED" | "REJECTED" | "NONE" }
 * @usage Admin can set status to "APPROVED", "REJECTED" or "NONE"
 * @policy checks, if early/late in the policy is respected
 * @deprecated not used for now
 */
const makeParticipationDecisionSchema = (policy: StayPolicy) => 
    z.object({
        userId: z.uuid(),
        eventId: EventIdSchema,
        decisions: z.object({
            early: z.object({ status: z.enum(["NONE", "APPROVED", "DENIED"]) }).strict().optional(),
            late: z.object({ status: z.enum(["NONE", "APPROVED", "DENIED"]) }).strict().optional(),
            // optional: admin-note
            adminNote: z.string().max(1000).optional(),
        }).strict()
    }).strict().superRefine((data, ctx) => {
        const d = data.decisions ?? {};
        if(d.early && !policy.earlyArrival.enabled && d.early.status !== "NONE") {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["decisions", "early", "status"], message: "Early-arrival is disabled for this event" })
        }
        if (d.late && !policy.lateDeparture.enabled && d.late.status !== "NONE") {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["decisions", "late", "status"], message: "Late-departure is disabled for this event" })
        }
});


/**
 * Admin Event Output
 * @usage
 *  - Type for Responses to Admin-UI after successfuly Reads/Mutations
 */
type AdminEvent = z.infer<typeof EventEntitySchema>;


export {
    adminCreateEventSchema,
    adminGetEventSchema,
    adminUpdateEventSchema,
    locationUpdateSchema,
    makeParticipationDecisionSchema
};


export type {
    AdminEvent,
    AdminUpdateEventInput,
    AdminGetEventInput,
    AdminCreateEventInput,
    LocationInput
}