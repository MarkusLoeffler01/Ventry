import type { Prisma } from "@/generated/prisma";
import { CommunityFeedbackType, CommunityPostType, ModerationAction, PostStatus } from "@/generated/prisma";
import { prisma } from "@/lib/prisma/prisma";
import { refreshSignedUrls } from "@/lib/user/profilePicture";
import type { CommunityCommentView } from "@/components/events/community/types";

export const COMMUNITY_REACTIONS = ["LIKE", "LOVE", "CELEBRATE", "HELPFUL"] as const;

export type CommunityReaction = (typeof COMMUNITY_REACTIONS)[number];

const ACTIVE_ATTENDEE_STATUSES = ["PENDING", "APPROVED", "CONFIRMED"] as const;

type CommunityPostTagInput = {
  type: typeof CommunityPostType[keyof typeof CommunityPostType];
  imageUrls?: string[];
  linkUrl?: string | null;
  feedbacks?: CommunityFeedbackTagInput[];
  feedbackRating?: number | null;
  feedbackType?: typeof CommunityFeedbackType[keyof typeof CommunityFeedbackType] | null;
};

type CommunityFeedbackTagInput = {
  content?: string | null;
  feedbackRating?: number | null;
  feedbackType: typeof CommunityFeedbackType[keyof typeof CommunityFeedbackType];
};

type SerializedCommunityFeedback = {
  content: string | null;
  rating: number | null;
  feedbackType: typeof CommunityFeedbackType[keyof typeof CommunityFeedbackType];
};

export class CommunityError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const communityCommentInclude = {
  author: {
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      isAdmin: true,
      profilePictures: {
        orderBy: [
          { isPrimary: "desc" as const },
          { order: "asc" as const },
          { createdAt: "desc" as const },
        ],
        take: 1,
        select: {
          id: true,
          signedUrl: true,
          storagePath: true,
          cachedUntil: true,
          isPrimary: true,
        },
      },
    },
  },
} satisfies Prisma.CommunityCommentInclude;

export type CommunityCommentWithInclude = Prisma.CommunityCommentGetPayload<{
  include: typeof communityCommentInclude;
}>;

export const communityPostInclude = {
  author: {
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      isAdmin: true,
      profilePictures: {
        orderBy: [
          { isPrimary: "desc" as const },
          { order: "asc" as const },
          { createdAt: "desc" as const },
        ],
        take: 1,
        select: {
          id: true,
          signedUrl: true,
          storagePath: true,
          cachedUntil: true,
          isPrimary: true,
        },
      },
    },
  },
  reactions: {
    select: {
      userId: true,
      reaction: true,
    },
  },
  comments: {
    where: { status: PostStatus.APPROVED, deletedAt: null },
    orderBy: { createdAt: "asc" as const },
    take: 2,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          profilePictures: {
            orderBy: [
              { isPrimary: "desc" as const },
              { order: "asc" as const },
              { createdAt: "desc" as const },
            ],
            take: 1,
            select: {
              id: true,
              signedUrl: true,
              storagePath: true,
              cachedUntil: true,
              isPrimary: true,
            },
          },
        },
      },
    },
  },
  _count: {
    select: {
      comments: {
        where: { status: PostStatus.APPROVED, deletedAt: null },
      },
    },
  },
} satisfies Prisma.CommunityPostInclude;

export type CommunityPostWithInclude = Prisma.CommunityPostGetPayload<{
  include: typeof communityPostInclude;
}>;

export type CommunityActor = {
  id: string;
  isAdmin: boolean;
  adminId: string | null;
};

export type CommunityEventAccess = {
  id: number;
  ownerId: string | null;
  endDate: Date;
  communityEnabled: boolean;
  communityOpenAfterEnd: boolean;
  communityModerated: boolean;
  communityModerateComments: boolean;
  communityAttendeesOnly: boolean;
};

type CommunityAuthorWithProfilePictures = {
  profilePictures: {
    id: string;
    signedUrl: string | null;
    storagePath: string;
    cachedUntil: Date | string | null;
    isPrimary: boolean;
  }[];
};

function isCommunityFeedbackType(value: unknown): value is typeof CommunityFeedbackType[keyof typeof CommunityFeedbackType] {
  return typeof value === "string" && value in CommunityFeedbackType;
}

function normalizeCommunityFeedbackEntries(
  feedbackEntries: Prisma.JsonValue | null | undefined,
  fallback: {
    content?: string | null;
    feedbackRating?: number | null;
    feedbackType?: typeof CommunityFeedbackType[keyof typeof CommunityFeedbackType] | null;
  } = {},
): SerializedCommunityFeedback[] {
  if (Array.isArray(feedbackEntries)) {
    const parsedEntries = feedbackEntries
      .map(entry => {
        if (!entry || typeof entry !== "object") {
          return null;
        }

        const candidate = entry as Record<string, unknown>;
        const feedbackType = candidate.feedbackType;
        if (!isCommunityFeedbackType(feedbackType)) {
          return null;
        }

        const content = typeof candidate.content === "string" ? candidate.content : null;
        const rating = typeof candidate.feedbackRating === "number" ? candidate.feedbackRating : null;

        return {
          content,
          rating,
          feedbackType,
        };
      })
      .filter((entry): entry is SerializedCommunityFeedback => Boolean(entry));

    if (parsedEntries.length > 0) {
      return parsedEntries;
    }
  }

  if (fallback.feedbackType) {
    return [
      {
        content: fallback.content ?? null,
        rating: fallback.feedbackRating ?? null,
        feedbackType: fallback.feedbackType,
      },
    ];
  }

  return [];
}

export async function loadCommunityActor(userId: string): Promise<CommunityActor | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      isAdmin: true,
      adminProfile: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    isAdmin: user.isAdmin,
    adminId: user.adminProfile?.id || null,
  };
}

export async function loadCommunityEvent(eventId: number): Promise<CommunityEventAccess | null> {
  return prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      ownerId: true,
      endDate: true,
      communityEnabled: true,
      communityOpenAfterEnd: true,
      communityModerated: true,
      communityModerateComments: true,
      communityAttendeesOnly: true,
    },
  });
}

export function assertCommunityEnabled(event: CommunityEventAccess | null): asserts event is CommunityEventAccess {
  if (!event) {
    throw new CommunityError(404, "Event not found");
  }

  if (!event.communityEnabled) {
    throw new CommunityError(403, "Community is disabled for this event");
  }
}

export function isEventOwner(actor: CommunityActor | null, event: Pick<CommunityEventAccess, "ownerId">) {
  return Boolean(actor?.adminId && event.ownerId === actor.adminId);
}

export function canBypassAttendeeOnly(actor: CommunityActor | null, event: Pick<CommunityEventAccess, "ownerId">) {
  return Boolean(actor?.isAdmin || isEventOwner(actor, event));
}

export function assertCommunityOpenForWrites(event: CommunityEventAccess) {
  if (!event.communityOpenAfterEnd && event.endDate.getTime() < Date.now()) {
    throw new CommunityError(403, "Community posting is closed for this event");
  }
}

export async function assertCanWriteInCommunity(actor: CommunityActor, event: CommunityEventAccess) {
  assertCommunityOpenForWrites(event);

  if (!event.communityAttendeesOnly || canBypassAttendeeOnly(actor, event)) {
    return;
  }

  const registration = await prisma.registration.findFirst({
    where: {
      eventId: event.id,
      userId: actor.id,
      status: { in: [...ACTIVE_ATTENDEE_STATUSES] },
    },
    select: { id: true },
  });

  if (!registration) {
    throw new CommunityError(403, "Only attendees can post in this event community");
  }
}

export function assertCanDeletePost(
  actor: CommunityActor,
  post: { authorId: string; event: Pick<CommunityEventAccess, "ownerId"> },
) {
  if (post.authorId === actor.id || actor.isAdmin || isEventOwner(actor, post.event)) {
    return;
  }

  throw new CommunityError(403, "You cannot delete this post");
}

export async function buildMentionMapForPosts(
  posts: { comments: { mentionedUserIds: string[] }[] }[],
): Promise<Map<string, { id: string; name: string; username: string | null }>> {
  const allIds = [...new Set(posts.flatMap(p => p.comments.flatMap(c => c.mentionedUserIds)))];
  if (allIds.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: allIds } },
    select: { id: true, name: true, username: true },
  });
  return new Map(users.map(u => [u.id, { id: u.id, name: u.name ?? "User", username: u.username }]));
}

async function refreshCommunityAuthorsProfilePictures(authors: CommunityAuthorWithProfilePictures[]) {
  const picturesById = new Map<string, CommunityAuthorWithProfilePictures["profilePictures"][number]>();

  for (const author of authors) {
    for (const picture of author.profilePictures) {
      picturesById.set(picture.id, picture);
    }
  }

  if (picturesById.size === 0) {
    return;
  }

  const refreshedPictures = await refreshSignedUrls([...picturesById.values()]);
  const refreshedById = new Map(refreshedPictures.map(picture => [picture.id, picture]));

  for (const author of authors) {
    author.profilePictures = author.profilePictures.map(picture => refreshedById.get(picture.id) ?? picture);
  }
}

export async function refreshCommunityPostsProfilePictures(posts: CommunityPostWithInclude[]) {
  await refreshCommunityAuthorsProfilePictures(
    posts.flatMap(post => [
      post.author,
      ...post.comments.map(comment => comment.author),
    ]),
  );
}

export async function refreshCommunityCommentsProfilePictures(comments: CommunityCommentWithInclude[]) {
  await refreshCommunityAuthorsProfilePictures(comments.map(comment => comment.author));
}

export function serializeCommunityComment(
  comment: CommunityCommentWithInclude,
  mentionedUsersById?: Map<string, { id: string; name: string; username: string | null }>,
): CommunityCommentView {
  return {
    id: comment.id,
    postId: comment.postId,
    authorId: comment.authorId,
    content: comment.content,
    imageUrls: comment.imageUrls,
    gifUrl: comment.gifUrl,
    status: comment.status,
    createdAt: comment.createdAt.toISOString(),
    author: {
      id: comment.author.id,
      name: comment.author.name || "Attendee",
      username: comment.author.username,
      imageUrl: comment.author.profilePictures[0]?.signedUrl || comment.author.image || null,
      isAdmin: comment.author.isAdmin,
    },
    mentionedUsers: comment.mentionedUserIds
      .map(id => mentionedUsersById?.get(id))
      .filter((u): u is { id: string; name: string; username: string | null } => u !== undefined),
  };
}

export function serializeCommunityPost(
  post: CommunityPostWithInclude,
  viewerUserId?: string | null,
  mentionedUsersById?: Map<string, { id: string; name: string; username: string | null }>,
) {
  const feedbacks = normalizeCommunityFeedbackEntries(post.feedbackEntries, {
    content: post.content,
    feedbackRating: post.feedbackRating,
    feedbackType: post.feedbackType,
  });
  const primaryFeedback = feedbacks.find(feedback => feedback.rating !== null) || feedbacks[0] || null;
  const reactionCounts = COMMUNITY_REACTIONS.reduce<Record<CommunityReaction, number>>((counts, reaction) => {
    counts[reaction] = 0;
    return counts;
  }, {} as Record<CommunityReaction, number>);
  const viewerReactions: string[] = [];

  for (const reaction of post.reactions) {
    if (reaction.reaction in reactionCounts) {
      reactionCounts[reaction.reaction as CommunityReaction] += 1;
    }
    if (viewerUserId && reaction.userId === viewerUserId) {
      viewerReactions.push(reaction.reaction);
    }
  }

  return {
    id: post.id,
    eventId: post.eventId,
    authorId: post.authorId,
    type: post.type,
    tags: post.tags,
    content: post.content,
    imageUrls: post.imageUrls,
    linkUrl: post.linkUrl,
    feedbackRating: primaryFeedback?.rating ?? post.feedbackRating,
    feedbackType: primaryFeedback?.feedbackType ?? post.feedbackType,
    feedbacks,
    status: post.status,
    pinned: post.pinned,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    author: {
      id: post.author.id,
      name: post.author.name || "Attendee",
      username: post.author.username,
      imageUrl: post.author.profilePictures[0]?.signedUrl || post.author.image || null,
      isAdmin: post.author.isAdmin,
    },
    reactions: reactionCounts,
    viewerReactions,
    commentCount: post._count.comments,
    comments: post.comments.map(c => serializeCommunityComment(c as CommunityCommentWithInclude, mentionedUsersById)),
  };
}

export function deriveCommunityPostTags(input: CommunityPostTagInput) {
  const tags = new Set<string>([input.type.toLowerCase()]);

  if (input.type === CommunityPostType.IMAGE || input.type === CommunityPostType.VIDEO) {
    tags.add("media");
  }

  if (input.imageUrls && input.imageUrls.length > 0) {
    tags.add("image");
    tags.add("media");
  }

  if (input.linkUrl) {
    tags.add("link");
  }

  const feedbacks = input.feedbacks || [];

  if (input.type === CommunityPostType.FEEDBACK || feedbacks.length > 0 || input.feedbackRating !== null && input.feedbackRating !== undefined) {
    tags.add("feedback");
  }

  for (const feedback of feedbacks) {
    tags.add(`feedback:${feedback.feedbackType.toLowerCase().replaceAll("_", "-")}`);
    if (feedback.feedbackRating !== null && feedback.feedbackRating !== undefined) {
      tags.add("rating");
    }
  }

  if (feedbacks.length === 0) {
    if (input.feedbackType) {
      tags.add(`feedback:${input.feedbackType.toLowerCase().replaceAll("_", "-")}`);
    }

    if (input.feedbackRating !== null && input.feedbackRating !== undefined) {
      tags.add("rating");
    }
  }

  return Array.from(tags).sort();
}

export async function writeModerationLog(input: {
  postId: string;
  actor: CommunityActor;
  action: typeof ModerationAction[keyof typeof ModerationAction];
  reason?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.postModerationLog.create({
    data: {
      postId: input.postId,
      actorUserId: input.actor.id,
      actorAdminId: input.actor.adminId,
      action: input.action,
      reason: input.reason,
      metadata: input.metadata || {},
    },
  });
}

export async function softDeletePost(input: {
  postId: string;
  actor: CommunityActor;
}) {
  await prisma.$transaction([
    prisma.postReaction.deleteMany({
      where: { postId: input.postId },
    }),
    prisma.communityPost.update({
      where: { id: input.postId },
      data: {
        status: PostStatus.DELETED,
        content: null,
        tags: [],
        imageUrls: [],
        linkUrl: null,
        feedbackRating: null,
        feedbackType: null,
        feedbackEntries: [],
        muxAssetId: null,
        muxPlaybackId: null,
        deletedAt: new Date(),
        moderationLogs: {
          create: {
            actorUserId: input.actor.id,
            actorAdminId: input.actor.adminId,
            action: ModerationAction.DELETED,
            reason: "Deleted by authorized user",
            metadata: {},
          },
        },
      },
    }),
  ]);
}
