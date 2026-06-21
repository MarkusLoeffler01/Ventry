"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, CircularProgress, Divider, Paper, Stack, Typography } from "@mui/material";
import { Settings } from "@mui/icons-material";
import NextLink from "next/link";
import CommunityComposer from "./CommunityComposer";
import CommunityPostCard from "./CommunityPostCard";
import type { CommunityPostView, CommunityReactionKey } from "./types";

function getErrorMessage(raw: unknown, fallback: string) {
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const payload = raw as {
    error?: string | Array<{ message?: string }>;
  };

  if (typeof payload.error === "string") {
    return payload.error;
  }

  if (Array.isArray(payload.error)) {
    return payload.error[0]?.message || fallback;
  }

  return fallback;
}

interface CommunitySectionProps {
  eventId: number;
  eventEnded: boolean;
  communityOpenAfterEnd: boolean;
  communityModerated?: boolean;
  currentUserId?: string | null;
  canModerate?: boolean;
}

export default function CommunitySection({
  eventId,
  eventEnded,
  communityOpenAfterEnd,
  communityModerated = true,
  currentUserId,
  canModerate,
}: CommunitySectionProps) {
  const [posts, setPosts] = useState<CommunityPostView[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionPostId, setActionPostId] = useState<string | null>(null);
  const [moderatingPostId, setModeratingPostId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const composerDisabledReason = useMemo(() => {
    if (!currentUserId) {
      return "Sign in to post or react in this community.";
    }

    if (eventEnded && !communityOpenAfterEnd) {
      return "This community is read-only because the event has ended.";
    }

    return null;
  }, [communityOpenAfterEnd, currentUserId, eventEnded]);

  const loadPosts = async (cursor?: string | null) => {
    cursor ? setLoadingMore(true) : setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        eventId: String(eventId),
        limit: "10",
      });
      if (cursor) {
        params.set("cursor", cursor);
      }

      const response = await fetch(`/api/community/posts?${params.toString()}`);
      const payload = (await response.json().catch(() => null)) as {
        posts?: CommunityPostView[];
        nextCursor?: string | null;
        error?: unknown;
      } | null;

      if (!response.ok || !payload?.posts) {
        throw new Error(getErrorMessage(payload, "Failed to load community posts"));
      }

      const loadedPosts = payload.posts;
      setPosts(current => cursor ? [...current, ...loadedPosts] : loadedPosts);
      setNextCursor(payload.nextCursor || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load community posts");
    } finally {
      cursor ? setLoadingMore(false) : setLoading(false);
    }
  };

  useEffect(() => {
    void loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const handlePostCreated = (post: CommunityPostView, pending: boolean) => {
    if (!pending) {
      setPosts(current => [post, ...current]);
    }
  };

  const handleReact = async (postId: string, reaction: CommunityReactionKey) => {
    const snapshot = posts.find(p => p.id === postId);

    setPosts(current =>
      current.map(post => {
        if (post.id !== postId) return post;
        const hasReaction = post.viewerReactions.includes(reaction);
        return {
          ...post,
          reactions: {
            ...post.reactions,
            [reaction]: post.reactions[reaction] + (hasReaction ? -1 : 1),
          },
          viewerReactions: hasReaction
            ? post.viewerReactions.filter(r => r !== reaction)
            : [...post.viewerReactions, reaction],
        };
      }),
    );

    setError(null);

    try {
      const response = await fetch(`/api/community/posts/${postId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction }),
      });
      const payload = (await response.json().catch(() => null)) as {
        reactions?: CommunityPostView["reactions"];
        viewerReactions?: string[];
        error?: unknown;
      } | null;

      if (!response.ok || !payload?.reactions || !payload.viewerReactions) {
        throw new Error(getErrorMessage(payload, "Failed to update reaction"));
      }

      const reactions = payload.reactions;
      const viewerReactions = payload.viewerReactions;
      setPosts(current =>
        current.map(post => (post.id === postId ? { ...post, reactions, viewerReactions } : post)),
      );
    } catch (reactionError) {
      if (snapshot) {
        setPosts(current => current.map(post => (post.id === postId ? snapshot : post)));
      }
      setError(reactionError instanceof Error ? reactionError.message : "Failed to update reaction");
    }
  };

  const handleModerate = async (postId: string, action: "approve" | "reject" | "pin" | "unpin" | "remove") => {
    setModeratingPostId(postId);
    setError(null);

    try {
      const response = await fetch(`/api/community/posts/${postId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json().catch(() => null)) as {
        post?: { id: string; status: string; pinned: boolean };
        action?: string;
        error?: unknown;
      } | null;

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Moderation action failed"));
      }

      if (action === "remove") {
        setPosts(current => current.filter(p => p.id !== postId));
      } else if (payload?.post) {
        const updated = payload.post;
        setPosts(current =>
          current.map(p =>
            p.id !== postId
              ? p
              : {
                  ...p,
                  status: updated.status as CommunityPostView["status"],
                  pinned: updated.pinned,
                },
          ),
        );
      }
    } catch (moderateError) {
      setError(moderateError instanceof Error ? moderateError.message : "Moderation action failed");
    } finally {
      setModeratingPostId(null);
    }
  };

  const handleDelete = async (postId: string) => {
    setActionPostId(postId);
    setError(null);

    try {
      const response = await fetch(`/api/community/posts/${postId}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as { deleted?: boolean; error?: unknown } | null;

      if (!response.ok || !payload?.deleted) {
        throw new Error(getErrorMessage(payload, "Failed to delete post"));
      }

      setPosts(current => current.filter(post => post.id !== postId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete post");
    } finally {
      setActionPostId(null);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            flexWrap="wrap"
            gap={1}
          >
            <Typography variant="h4" fontWeight="bold">
              Community
            </Typography>
            {canModerate ? (
              <Button
                component={NextLink}
                href={`/admin/events/${eventId}/community`}
                size="small"
                variant="outlined"
                startIcon={<Settings fontSize="small" />}
              >
                Manage community
              </Button>
            ) : null}
          </Stack>
          {eventEnded ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              This is the post-event community space for attendees and organizers.
            </Alert>
          ) : null}
        </Box>

        <CommunityComposer
          eventId={eventId}
          disabledReason={composerDisabledReason}
          onPostCreated={handlePostCreated}
        />

        <Divider />

        {error ? <Alert severity="error">{error}</Alert> : null}

        {loading ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <CircularProgress />
          </Box>
        ) : posts.length === 0 ? (
          <Alert severity="info">No community posts yet.</Alert>
        ) : (
          <Stack spacing={2}>
            {posts.map(post => (
              <CommunityPostCard
                key={post.id}
                post={post}
                canDelete={Boolean(canModerate || post.authorId === currentUserId)}
                canModerate={canModerate}
                communityModerated={communityModerated}
                deleteDisabled={!currentUserId || actionPostId === post.id}
                moderateDisabled={Boolean(moderatingPostId)}
                reactionDisabled={!currentUserId || Boolean(composerDisabledReason)}
                currentUserId={currentUserId}
                composerDisabled={Boolean(composerDisabledReason)}
                onDelete={handleDelete}
                onModerate={canModerate ? handleModerate : undefined}
                onReact={handleReact}
              />
            ))}
          </Stack>
        )}

        {nextCursor ? (
          <Button
            variant="outlined"
            onClick={() => void loadPosts(nextCursor)}
            disabled={loadingMore}
            sx={{ alignSelf: "center" }}
          >
            {loadingMore ? <CircularProgress size={20} /> : "Load More"}
          </Button>
        ) : null}
      </Stack>
    </Paper>
  );
}
