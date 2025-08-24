/**
 * @summary User-specific DTOs (attending, canceling, editing attendance)
 * @remarks
 *  - user may NOT create or update events, only register for them
 *  - Early/Late requested as boolean; Server checks Event.stayPolicy
 */


import { z } from 'zod';
import { EventIdSchema, ParticipationBaseSchema, type StayPolicy } from "./base";


/**
 * Attending (join event)
 * @endpoint POST /api/event/:id/attend
 * @params :id = EventId
 * @body { userId }
 * @who client (user). Server validates and creates attendance record
 */
const registrationSchema = z.object({
    userId: z.uuid(),
    eventId: EventIdSchema
}).strict();
type RegistrationInput = z.infer<typeof registrationSchema>;


/**
 * Canceling (leave event)
 * @endpoint POST /api/event/:id/cancel
 * @params :id = EventId
 * @body { userId }
 * @who client (user). Server validates and marks attendance as canceled
 */
const cancelRegistrationSchema = z.object({
    userId: z.uuid(),
    eventId: EventIdSchema
}).strict();
type CancelRegistrationInput = z.infer<typeof cancelRegistrationSchema>;

/**
 * Raw-Schema for attendance updates (Form-Data)
 * @usage Only fields, that the user can change
 */
const participationUpdateRawSchema = z.object({
    userId: z.uuid(),
    eventId: EventIdSchema,
    updates: z.object({
        needsHotel: z.boolean().optional(),
        early: z.object({ status: z.enum(["NONE", "REQUESTED"])}).strict().optional(),
        late:  z.object({ status: z.enum(["NONE", "REQUESTED"])}).strict().optional(),
    }).strict()
}).strict();
type ParticipationUpdateRawInput = z.infer<typeof participationUpdateRawSchema>;


/**
 * Editing (update attendance)
 * @endpoint PATCH /api/event/:id
 * @params :id = EventId
 * @body Partial<ParticipationBase> + userId
 * @remarks
 *  - Raw-Input without policy-checks (only form-validation)
 *  - For business-validation (Early/Late only when allowed), use `makeParticipationUpdateWithPolicySchema`
 * @who user (client) edits his attendance. Server maps to Participation-Record
 */
const participationUpdateSchema = z.object({
    userId: z.uuid(),
    eventId: EventIdSchema,
    updates: ParticipationBaseSchema.partial(),
}).strict();
type ParticipationUpdateInput = z.infer<typeof participationUpdateSchema>;

/**
 * Fabric schema for participation updates **with** policy checks
 * @param policy Event.stayPolicy (loaded from DB)
 * @returns Zod-Schema, which enforces:
 * - wantsEarlyArrival only allowed, when policy.earlyArrival.enabled is true
 * - wantsLateDeparture only allowed, when policy.lateDeparture.enabled is true
 * - when needsHotel = false => Early/Late MUST BE (implicitly) false
 * 
 * @usage
 *  const event = await.prisma.event.findUnique({ select: { stayPolicy: true, ... }});
 *  const schema = makeParticipationUpdateWithPolicySchema(event.stayPolicy);
 *  const parsed = Schema.safeParse(req.body);
 */
const makeParticipationUpdateWithPolicySchema = (policy: StayPolicy) =>
    participationUpdateRawSchema.superRefine((data, ctx) => {
        const u = data.updates ?? {};
        // if not hotel needed, user should not request early/late arrival
        if(!u.needsHotel) {
            if(u.early?.status === "REQUESTED") {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Early arrival not possible without hotel",
                    path: ["updates", "early", "status"],
                });
            }
            if(u.late?.status === "REQUESTED") {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Late departure not possible without hotel",
                    path: ["updates", "late", "status"],
                });
            }
        }

        // Policy checks
        if(u.early?.status === "REQUESTED" && !policy.earlyArrival.enabled) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["updates", "early", "status"],
                message: "Early arrival not available for this event"
            });
        }
        if (u.late?.status === "REQUESTED" && !policy.lateDeparture.enabled) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["updates", "late", "status"],
                message: "Late departure not available for this event"
            });
        }
});

export {
    cancelRegistrationSchema,
    participationUpdateSchema,
    ParticipationBaseSchema,
    registrationSchema,
    makeParticipationUpdateWithPolicySchema,
}

export type {
    CancelRegistrationInput,
    ParticipationUpdateInput,
    ParticipationUpdateRawInput,
    RegistrationInput,
}