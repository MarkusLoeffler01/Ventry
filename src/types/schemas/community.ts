import { z } from "zod";

export const communityPostTypeSchema = z.enum(["TEXT", "IMAGE", "LINK", "FEEDBACK", "VIDEO"]);
const communityReactionSchemaValues = ["LIKE", "LOVE", "CELEBRATE", "HELPFUL"] as const;
export const communityFeedbackTypeSchema = z.enum(["VENUE", "ORGANIZATION", "EVENTS", "OVERALL_EXPERIENCE"]);

export const communityFeedbackEntrySchema = z.object({
  content: z.string().trim().max(5000).optional(),
  feedbackRating: z.coerce.number().int().min(1).max(5).optional(),
  feedbackType: communityFeedbackTypeSchema,
});

export const createCommunityPostSchema = z
  .object({
    eventId: z.coerce.number().int().positive(),
    type: communityPostTypeSchema,
    content: z.string().trim().max(5000).optional(),
    imageUrls: z.array(z.url()).max(5).default([]),
    linkUrl: z.url().optional(),
    feedbackRating: z.coerce.number().int().min(1).max(5).optional(),
    feedbackType: communityFeedbackTypeSchema.optional(),
    feedbacks: z.array(communityFeedbackEntrySchema).max(5).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.type === "VIDEO") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["type"],
        message: "Video posts are not supported yet",
      });
    }

    if (data.type === "TEXT" && !data.content?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["content"],
        message: "Text posts need content",
      });
    }

    if (data.type === "IMAGE" && data.imageUrls.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["imageUrls"],
        message: "Image posts need at least one image",
      });
    }

    if (data.type === "LINK" && !data.linkUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["linkUrl"],
        message: "Link posts need a URL",
      });
    }

    if (data.feedbacks.some(feedback => !feedback.content?.trim() && feedback.feedbackRating === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["feedbacks"],
        message: "Each feedback item needs a rating or message",
      });
    }

    const feedbackTypes = new Set<string>();
    for (const feedback of data.feedbacks) {
      if (feedbackTypes.has(feedback.feedbackType)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["feedbacks"],
          message: "Each feedback type can only be added once per post",
        });
        break;
      }
      feedbackTypes.add(feedback.feedbackType);
    }

    if (data.type === "FEEDBACK" && data.feedbacks.length === 0 && data.feedbackRating === undefined && !data.content?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["feedbacks"],
        message: "Feedback posts need a rating or message",
      });
    }

    if (data.type === "FEEDBACK" && data.feedbacks.length === 0 && !data.feedbackType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["feedbackType"],
        message: "Feedback posts need a feedback type",
      });
    }
  });

export const listCommunityPostsSchema = z.object({
  eventId: z.coerce.number().int().positive(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const reactToCommunityPostSchema = z.object({
  reaction: z.enum(communityReactionSchemaValues),
});

export const moderateCommunityPostSchema = z.object({
  action: z.enum(["approve", "reject", "remove", "pin", "unpin"]),
  reason: z.string().trim().max(500).optional(),
});

export const bulkModerateCommunityPostsSchema = z.object({
  eventId: z.number().int().positive(),
  postIds: z.array(z.string().min(1)).min(1).max(100),
  action: z.enum(["remove", "approve", "reject"]),
  reason: z.string().trim().max(500).optional(),
});

export type CreateCommunityPostInput = z.infer<typeof createCommunityPostSchema>;
export type CommunityFeedbackInput = z.infer<typeof communityFeedbackEntrySchema>;
export type ModerateCommunityPostInput = z.infer<typeof moderateCommunityPostSchema>;
export type BulkModerateCommunityPostsInput = z.infer<typeof bulkModerateCommunityPostsSchema>;
