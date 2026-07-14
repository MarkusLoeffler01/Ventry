export type CommunityPostType = "TEXT" | "IMAGE" | "LINK" | "FEEDBACK" | "VIDEO";
export type CommunityFeedbackType = "VENUE" | "ORGANIZATION" | "EVENTS" | "OVERALL_EXPERIENCE";

export type CommunityFeedbackItem = {
  content: string | null;
  rating: number | null;
  feedbackType: CommunityFeedbackType;
};

export type CommunityReactionKey = "LIKE" | "LOVE" | "CELEBRATE" | "HELPFUL";

export type CommunityCommentView = {
  id: string;
  postId: string;
  authorId: string;
  content: string | null;
  imageUrls: string[];
  gifUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DELETED";
  createdAt: string;
  author: {
    id: string;
    name: string;
    username: string | null;
    imageUrl: string | null;
    isAdmin: boolean;
  };
  mentionedUsers: { id: string; name: string; username: string | null }[];
};

export type CommunityPostView = {
  id: string;
  eventId: number;
  authorId: string;
  type: CommunityPostType;
  tags: string[];
  content: string | null;
  imageUrls: string[];
  linkUrl: string | null;
  feedbackRating: number | null;
  feedbackType: CommunityFeedbackType | null;
  feedbacks: CommunityFeedbackItem[];
  status: "PENDING" | "APPROVED" | "REJECTED" | "DELETED";
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    username: string | null;
    imageUrl: string | null;
    isAdmin: boolean;
  };
  reactions: Record<CommunityReactionKey, number>;
  viewerReactions: string[];
  commentCount: number;
  comments: CommunityCommentView[];
};
