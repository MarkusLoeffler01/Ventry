"use client";

import {
  Avatar,
  Box,
  Button,
  IconButton,
  Link as MuiLink,
  Paper,
  Rating,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { Celebration, Delete, Favorite, Lightbulb, Link as LinkIcon, ThumbUp } from "@mui/icons-material";
import Image from "next/image";
import NextLink from "next/link";
import type { ReactNode } from "react";
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

interface CommunityPostCardProps {
  post: CommunityPostView;
  canDelete: boolean;
  deleteDisabled?: boolean;
  reactionDisabled?: boolean;
  onDelete: (postId: string) => void;
  onReact: (postId: string, reaction: CommunityReactionKey) => void;
}

export default function CommunityPostCard({
  post,
  canDelete,
  deleteDisabled,
  reactionDisabled,
  onDelete,
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
        <Stack direction="row" spacing={1.5} alignItems="center">
          <NextLink href={`/profile/${post.author.id}`} style={{ textDecoration: "none" }}>
            <Avatar
              src={post.author.imageUrl || undefined}
              alt={post.author.name}
              sx={{ cursor: "pointer", "&:hover": { opacity: 0.8 } }}
            >
              {post.author.imageUrl ? null : initials(post.author.name) || "?"}
            </Avatar>
          </NextLink>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
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
      </Stack>
    </Paper>
  );
}
