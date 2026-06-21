"use client";

import { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Link as MuiLink,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { Delete, Reply } from "@mui/icons-material";
import NextLink from "next/link";
import CommentComposer from "./CommentComposer";
import type { CommunityCommentView } from "./types";

const INITIAL_VISIBLE = 2;
const LOAD_MORE_STEP = 5;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map(part => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function renderCommentText(text: string, mentionedUsers: { id: string; name: string }[]) {
  const parts = text.split(/(@\S+)/g);
  return parts.map((part, i) => {
    if (!part.startsWith("@")) return part;
    const token = part.slice(1);
    const nameToMatch = token.replace(/_/g, " ");
    const user = mentionedUsers.find(u => u.name === nameToMatch || u.name.replace(/ /g, "_") === token);
    if (user) {
      return (
        <MuiLink
          key={i}
          component={NextLink}
          href={`/profile/${user.id}`}
          fontWeight={700}
          underline="hover"
        >
          @{user.name}
        </MuiLink>
      );
    }
    return <strong key={i}>{part}</strong>;
  });
}

interface CommentListProps {
  postId: string;
  eventId: number;
  initialComments: CommunityCommentView[];
  totalCount: number;
  currentUserId?: string | null;
  canDelete: boolean;
  composerDisabled?: boolean;
}

export default function CommentList({
  postId,
  eventId,
  initialComments,
  totalCount,
  currentUserId,
  canDelete,
  composerDisabled,
}: CommentListProps) {
  const [comments, setComments] = useState<CommunityCommentView[]>(initialComments);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [nextCursor, setNextCursor] = useState<string | null>(
    totalCount > INITIAL_VISIBLE ? (initialComments[initialComments.length - 1]?.id ?? null) : null,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [displayedTotal, setDisplayedTotal] = useState(totalCount);
  const [prefillRequest, setPrefillRequest] = useState<{ value: string; seq: number } | null>(null);

  const handleCommentCreated = (comment: CommunityCommentView, pending: boolean) => {
    if (!pending) {
      setComments(current => [...current, comment]);
      setVisibleCount(v => v + 1);
      setDisplayedTotal(t => t + 1);
    }
  };

  const handleReply = (authorName: string) => {
    const mention = `@${authorName.replace(/ /g, "_")} `;
    setPrefillRequest(prev => ({ value: mention, seq: (prev?.seq ?? 0) + 1 }));
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: String(LOAD_MORE_STEP) });
      if (nextCursor) params.set("cursor", nextCursor);

      const res = await fetch(`/api/community/posts/${postId}/comments?${params.toString()}`);
      const payload = (await res.json().catch(() => null)) as {
        comments?: CommunityCommentView[];
        nextCursor?: string | null;
      } | null;

      if (!res.ok || !payload?.comments) return;

      const existingIds = new Set(comments.map(c => c.id));
      const fresh = payload.comments.filter(c => !existingIds.has(c.id));
      setComments(current => [...current, ...fresh]);
      setVisibleCount(v => v + fresh.length);
      setNextCursor(payload.nextCursor ?? null);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setDeletingId(commentId);
    try {
      const res = await fetch(`/api/community/comments/${commentId}`, { method: "DELETE" });
      if (res.ok) {
        setComments(current => current.filter(c => c.id !== commentId));
        setVisibleCount(v => Math.max(0, v - 1));
        setDisplayedTotal(t => Math.max(0, t - 1));
      }
    } finally {
      setDeletingId(null);
    }
  };

  const visible = comments.slice(0, visibleCount);
  const remaining = displayedTotal - visibleCount;
  const canShowMore = remaining > 0 || (nextCursor !== null && visibleCount >= comments.length);

  return (
    <Box>
      <Divider sx={{ mb: 1.5 }} />

      {visible.length > 0 ? (
        <Stack spacing={1.5} sx={{ mb: 1.5 }}>
          {visible.map(comment => {
            const createdAt = new Intl.DateTimeFormat("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(comment.createdAt));

            return (
              <Stack key={comment.id} direction="row" spacing={1} alignItems="flex-start">
                <NextLink href={`/profile/${comment.author.id}`} style={{ textDecoration: "none", flexShrink: 0 }}>
                  <Avatar
                    src={comment.author.imageUrl || undefined}
                    alt={comment.author.name}
                    sx={{ width: 28, height: 28, fontSize: "0.7rem", cursor: "pointer", "&:hover": { opacity: 0.8 } }}
                  >
                    {comment.author.imageUrl ? null : initials(comment.author.name) || "?"}
                  </Avatar>
                </NextLink>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={0.5} alignItems="baseline" flexWrap="wrap" useFlexGap>
                    <MuiLink
                      component={NextLink}
                      href={`/profile/${comment.author.id}`}
                      underline="hover"
                      color="text.primary"
                    >
                      <Typography variant="caption" fontWeight={700}>
                        {comment.author.name}
                      </Typography>
                    </MuiLink>
                    <Typography variant="caption" color="text.secondary">
                      {createdAt}
                    </Typography>
                  </Stack>
                  {comment.content ? (
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                      {renderCommentText(comment.content, comment.mentionedUsers)}
                    </Typography>
                  ) : null}
                  {comment.imageUrls.length > 0 ? (
                    <Box
                      component="img"
                      src={comment.imageUrls[0]}
                      alt="Comment attachment"
                      sx={{ mt: 0.5, maxWidth: 200, maxHeight: 200, borderRadius: 1, display: "block" }}
                    />
                  ) : null}
                  {comment.gifUrl ? (
                    <Box
                      component="img"
                      src={comment.gifUrl}
                      alt="GIF"
                      sx={{ mt: 0.5, maxWidth: 200, maxHeight: 200, borderRadius: 1, display: "block" }}
                    />
                  ) : null}
                  {!composerDisabled ? (
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<Reply sx={{ fontSize: "0.85rem" }} />}
                      onClick={() => handleReply(comment.author.name)}
                      sx={{ mt: 0.25, minWidth: 0, p: "2px 6px", fontSize: "0.7rem", textTransform: "none", color: "text.secondary" }}
                    >
                      Reply
                    </Button>
                  ) : null}
                </Box>
                {canDelete ? (
                  <Tooltip title="Delete comment">
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        disabled={deletingId === comment.id}
                        onClick={() => void handleDelete(comment.id)}
                        aria-label="Delete comment"
                        sx={{ flexShrink: 0 }}
                      >
                        {deletingId === comment.id
                          ? <CircularProgress size={14} />
                          : <Delete sx={{ fontSize: "0.9rem" }} />}
                      </IconButton>
                    </span>
                  </Tooltip>
                ) : null}
              </Stack>
            );
          })}
        </Stack>
      ) : null}

      {canShowMore ? (
        <Button
          size="small"
          variant="text"
          disabled={loadingMore}
          onClick={() => void handleLoadMore()}
          sx={{ mb: 1, textTransform: "none" }}
        >
          {loadingMore
            ? <CircularProgress size={14} />
            : `more comments (${remaining})`}
        </Button>
      ) : null}

      {!composerDisabled ? (
        <CommentComposer
          postId={postId}
          eventId={eventId}
          disabled={composerDisabled}
          prefillRequest={prefillRequest}
          onCommentCreated={handleCommentCreated}
        />
      ) : null}
    </Box>
  );
}
