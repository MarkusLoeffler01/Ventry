"use client";

import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Link as MuiLink,
  Paper,
  Rating,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { Celebration, CheckCircle, Delete, Favorite, Lightbulb, Link as LinkIcon, PushPin, PushPinOutlined, ThumbDown, ThumbUp } from "@mui/icons-material";
import Image from "next/image";
import NextLink from "next/link";
import type { ReactNode } from "react";
import CommentList from "./CommentList";
import type { CommunityPostView, CommunityReactionKey } from "./types";

const reactionConfig: Array<{
  key: CommunityReactionKey;
  label: string;
  icon: ReactNode;
}> = [
  { key: "LIKE", label: "Like", icon: <ThumbUp fontSize="small" /> },
  { key: "LOVE", label: "Love", icon: <Favorite fontSize="small" /> },
  { key: "CELEBRATE", label: "Celebrate", icon: <Celebration fontSize="small" /> },
  { key: "HELPFUL", label: "Helpful", icon: <Lightbulb fontSize="small" /> },
];

const feedbackLabels: Record<NonNullable<CommunityPostView["feedbackType"]>, string> = {
  VENUE: "Venue",
  ORGANIZATION: "Organization",
  EVENTS: "Events",
  OVERALL_EXPERIENCE: "Overall experience",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map(part => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type ModerateAction = "approve" | "reject" | "pin" | "unpin" | "remove";

const STATUS_CHIP_COLOR = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
  DELETED: "default",
} as const;

interface CommunityPostCardProps {
  post: CommunityPostView;
  canDelete: boolean;
  canModerate?: boolean;
  communityModerated?: boolean;
  deleteDisabled?: boolean;
  moderateDisabled?: boolean;
  reactionDisabled?: boolean;
  currentUserId?: string | null;
  composerDisabled?: boolean;
  onDelete: (postId: string) => void;
  onModerate?: (postId: string, action: ModerateAction) => void;
  onReact: (postId: string, reaction: CommunityReactionKey) => void;
}

export default function CommunityPostCard({
  post,
  canDelete,
  canModerate,
  communityModerated = true,
  deleteDisabled,
  moderateDisabled,
  reactionDisabled,
  currentUserId,
  composerDisabled,
  onDelete,
  onModerate,
  onReact,
}: CommunityPostCardProps) {
  const createdAt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(post.createdAt));
  const showMainContent = Boolean(post.content && !(post.type === "FEEDBACK" && post.feedbacks.length > 0));

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <NextLink href={`/profile/${post.author.id}`} style={{ textDecoration: "none", flexShrink: 0 }}>
            <Avatar
              src={post.author.imageUrl || undefined}
              alt={post.author.name}
              sx={{ cursor: "pointer", "&:hover": { opacity: 0.8 } }}
            >
              {post.author.imageUrl ? null : initials(post.author.name) || "?"}
            </Avatar>
          </NextLink>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
              <MuiLink
                component={NextLink}
                href={`/profile/${post.author.id}`}
                underline="hover"
                color="text.primary"
              >
                <Typography variant="subtitle2" fontWeight={700}>
                  {post.author.name}
                </Typography>
              </MuiLink>
              {post.pinned ? (
                <Tooltip title="Pinned post">
                  <PushPin sx={{ fontSize: "0.95rem" }} color="primary" />
                </Tooltip>
              ) : null}
              {canModerate ? (
                <Chip
                  label={post.status}
                  size="small"
                  color={STATUS_CHIP_COLOR[post.status] ?? "default"}
                  variant="outlined"
                  sx={{ fontSize: "0.65rem", height: 20 }}
                />
              ) : null}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {createdAt}
            </Typography>
          </Box>
          {canDelete ? (
            <Tooltip title="Delete post">
              <span>
                <IconButton
                  aria-label="Delete post"
                  size="small"
                  color="error"
                  disabled={deleteDisabled}
                  onClick={() => onDelete(post.id)}
                  sx={{ flexShrink: 0 }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          ) : null}
        </Stack>

        {post.feedbacks.length > 0 ? (
          <Stack spacing={1.5}>
            {post.feedbacks.map((feedback, index) => (
              <Box key={`${feedback.feedbackType}-${index}`}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                  {feedbackLabels[feedback.feedbackType]}
                </Typography>
                {feedback.rating ? <Rating value={feedback.rating} readOnly size="small" /> : null}
                {feedback.content ? (
                  <Typography variant="body2" sx={{ mt: feedback.rating ? 0.5 : 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                    {feedback.content}
                  </Typography>
                ) : null}
              </Box>
            ))}
          </Stack>
        ) : post.feedbackRating ? (
          <Box>
            {post.feedbackType ? (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                {feedbackLabels[post.feedbackType]}
              </Typography>
            ) : null}
            <Rating value={post.feedbackRating} readOnly size="small" />
          </Box>
        ) : null}

        {showMainContent ? (
          <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {post.content}
          </Typography>
        ) : null}

        {post.linkUrl ? (
          <Button
            variant="outlined"
            startIcon={<LinkIcon />}
            component={MuiLink}
            href={post.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ alignSelf: "flex-start", textTransform: "none", maxWidth: "100%" }}
          >
            <Typography component="span" noWrap>
              {post.linkUrl}
            </Typography>
          </Button>
        ) : null}

        {post.imageUrls.length > 0 ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: post.imageUrls.length > 1 ? "1fr 1fr" : "1fr" },
              gap: 1,
            }}
          >
            {post.imageUrls.map(url => (
              <Box
                key={url}
                sx={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "4 / 3",
                  overflow: "hidden",
                  borderRadius: 2,
                  bgcolor: "grey.100",
                }}
              >
                <Image src={url} alt="" fill sizes="(min-width: 900px) 420px, 100vw" style={{ objectFit: "cover" }} />
              </Box>
            ))}
          </Box>
        ) : null}

        {canModerate && onModerate ? (
          <>
            <Divider />
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
              {post.status === "PENDING" ? (
                <Tooltip title="Approve">
                  <span>
                    <IconButton size="small" color="success" disabled={moderateDisabled} onClick={() => onModerate(post.id, "approve")}>
                      <CheckCircle fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              ) : null}
              {communityModerated && post.status !== "REJECTED" && post.status !== "DELETED" ? (
                <Tooltip title="Reject">
                  <span>
                    <IconButton size="small" color="error" disabled={moderateDisabled} onClick={() => onModerate(post.id, "reject")}>
                      <ThumbDown fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              ) : null}
              {post.status !== "DELETED" ? (
                <Tooltip title={post.pinned ? "Unpin" : "Pin to top"}>
                  <span>
                    <IconButton size="small" color={post.pinned ? "primary" : "default"} disabled={moderateDisabled} onClick={() => onModerate(post.id, post.pinned ? "unpin" : "pin")}>
                      {post.pinned ? <PushPin fontSize="small" /> : <PushPinOutlined fontSize="small" />}
                    </IconButton>
                  </span>
                </Tooltip>
              ) : null}
              {post.status !== "DELETED" ? (
                <Tooltip title="Remove post">
                  <span>
                    <IconButton size="small" color="error" disabled={moderateDisabled} onClick={() => onModerate(post.id, "remove")}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              ) : null}
            </Stack>
          </>
        ) : null}

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {reactionConfig.map(reaction => {
            const active = post.viewerReactions.includes(reaction.key);
            return (
              <Tooltip title={reaction.label} key={reaction.key}>
                <span>
                  <Button
                    size="small"
                    variant={active ? "contained" : "outlined"}
                    startIcon={reaction.icon}
                    disabled={reactionDisabled}
                    onClick={() => onReact(post.id, reaction.key)}
                  >
                    {post.reactions[reaction.key]}
                  </Button>
                </span>
              </Tooltip>
            );
          })}
        </Stack>

        <CommentList
          postId={post.id}
          eventId={post.eventId}
          initialComments={post.comments}
          totalCount={post.commentCount}
          currentUserId={currentUserId}
          canDelete={canDelete}
          composerDisabled={composerDisabled}
        />
      </Stack>
    </Paper>
  );
}
