"use client";

import { type ChangeEvent, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Rating,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { AddPhotoAlternate, Delete, RateReview, Send, Videocam } from "@mui/icons-material";
import type { CommunityPostView } from "./types";

type FeedbackType = "VENUE" | "ORGANIZATION" | "EVENTS" | "OVERALL_EXPERIENCE";

type ImageDraft = {
  id: string;
  file: File;
  previewUrl: string;
};

type VideoDraft = {
  id: string;
};

type FeedbackDraft = {
  id: string;
  content: string;
  rating: number | null;
  feedbackType: FeedbackType;
};

const MAX_DRAFTS_PER_KIND = 5;

const feedbackLabels: Record<FeedbackType, string> = {
  VENUE: "Venue",
  ORGANIZATION: "Organization",
  EVENTS: "Events",
  OVERALL_EXPERIENCE: "Overall experience",
};
const feedbackTypes = Object.keys(feedbackLabels) as FeedbackType[];

function createDraftId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

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

interface CommunityComposerProps {
  eventId: number;
  disabledReason?: string | null;
  onPostCreated: (post: CommunityPostView, pending: boolean) => void;
}

export default function CommunityComposer({ eventId, disabledReason, onPostCreated }: CommunityComposerProps) {
  const [content, setContent] = useState("");
  const [imageDrafts, setImageDrafts] = useState<ImageDraft[]>([]);
  const [videoDrafts, setVideoDrafts] = useState<VideoDraft[]>([]);
  const [feedbackDrafts, setFeedbackDrafts] = useState<FeedbackDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const resetDrafts = () => {
    setContent("");
    imageDrafts.forEach(draft => URL.revokeObjectURL(draft.previewUrl));
    setImageDrafts([]);
    setVideoDrafts([]);
    setFeedbackDrafts([]);
  };

  const addVideoDraft = () => {
    if (videoDrafts.length >= MAX_DRAFTS_PER_KIND) return;
    setVideoDrafts(current => [...current, { id: createDraftId("video") }]);
    setNotice(null);
    setError("Video upload is not available yet. Remove video drafts before posting.");
  };

  const addFeedbackDraft = () => {
    const usedFeedbackTypes = new Set(feedbackDrafts.map(draft => draft.feedbackType));
    const nextFeedbackType = feedbackTypes.find(type => !usedFeedbackTypes.has(type));
    if (!nextFeedbackType) return;

    setFeedbackDrafts(current => [...current, {
      id: createDraftId("feedback"),
      content: "",
      rating: 5,
      feedbackType: nextFeedbackType,
    }]);
  };

  const handleImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || imageDrafts.length >= MAX_DRAFTS_PER_KIND) return;

    setError(null);
    setNotice(null);
    setImageDrafts(current => [
      ...current,
      {
        id: createDraftId("image"),
        file,
        previewUrl: URL.createObjectURL(file),
      },
    ]);
  };

  const hasTextPost = content.trim().length > 0;
  const readyFeedbackDrafts = feedbackDrafts.filter(draft => draft.content.trim().length > 0 || draft.rating);
  const hasIncompleteFeedbackDraft = feedbackDrafts.some(draft => draft.content.trim().length === 0 && !draft.rating);
  const hasMainPost = hasTextPost || imageDrafts.length > 0;
  const draftCount = hasMainPost || readyFeedbackDrafts.length > 0 ? 1 : 0;
  const submitDisabled = Boolean(disabledReason)
    || loading
    || uploading
    || draftCount === 0
    || hasIncompleteFeedbackDraft
    || videoDrafts.length > 0;

  const createPost = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/community/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventId,
        ...body,
      }),
    });
    const payload = (await response.json().catch(() => null)) as {
      post?: CommunityPostView;
      pending?: boolean;
      error?: unknown;
    } | null;

    if (!response.ok || !payload?.post) {
      throw new Error(getErrorMessage(payload, "Failed to create community post"));
    }

    onPostCreated(payload.post, Boolean(payload.pending));
    return Boolean(payload.pending);
  };

  const uploadImageDraft = async (draft: ImageDraft) => {
    const formData = new FormData();
    formData.append("eventId", String(eventId));
    formData.append("file", draft.file);

    const response = await fetch("/api/community/media/upload", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json().catch(() => null)) as { url?: string; error?: unknown } | null;

    if (!response.ok || !payload?.url) {
      throw new Error(getErrorMessage(payload, "Failed to upload image"));
    }

    return payload.url;
  };

  const handleSubmit = async () => {
    if (submitDisabled) return;

    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      const feedbacks = readyFeedbackDrafts.map(draft => ({
        content: draft.content,
        feedbackRating: draft.rating ?? undefined,
        feedbackType: draft.feedbackType,
      }));

      let pending = false;
      if (imageDrafts.length > 0) {
        setUploading(true);
        const imageUrls = [];
        for (const draft of imageDrafts) {
          imageUrls.push(await uploadImageDraft(draft));
        }
        pending = await createPost({
          type: "IMAGE",
          content: hasTextPost ? content.trim() : undefined,
          imageUrls,
          feedbacks,
        });
      } else if (hasTextPost) {
        pending = await createPost({
          type: "TEXT",
          content: content.trim(),
          feedbacks,
        });
      } else if (feedbacks.length > 0) {
        pending = await createPost({
          type: "FEEDBACK",
          feedbacks,
        });
      }

      resetDrafts();
      setNotice(pending ? "Post submitted and pending moderation." : "Post submitted.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create community posts");
    } finally {
      setUploading(false);
      setLoading(false);
    }
  };

  return (
    <Box>
      {disabledReason ? <Alert severity="info" sx={{ mb: 2 }}>{disabledReason}</Alert> : null}
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {notice ? <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert> : null}

      <Stack spacing={2}>
        <TextField
          fullWidth
          multiline
          minRows={3}
          label="What's happening?"
          value={content}
          onChange={event => setContent(event.target.value)}
          disabled={Boolean(disabledReason)}
        />

        {imageDrafts.length > 0 ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
              gap: 1.5,
            }}
          >
            {imageDrafts.map((draft, index) => (
              <Paper key={draft.id} variant="outlined" sx={{ p: 1.5 }}>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2">Image {index + 1}</Typography>
                    <IconButton
                      aria-label={`Remove image ${index + 1}`}
                      color="error"
                      size="small"
                onClick={() => {
                  URL.revokeObjectURL(draft.previewUrl);
                  setImageDrafts(current => current.filter(item => item.id !== draft.id));
                }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Stack>
                  <Box
                    sx={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "4 / 3",
                      overflow: "hidden",
                      borderRadius: 1,
                      bgcolor: "grey.100",
                    }}
                  >
                    <Box
                      component="img"
                      src={draft.previewUrl}
                      alt={`Selected community image ${index + 1}`}
                      sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Box>
        ) : null}

        {videoDrafts.map((draft, index) => (
          <Paper key={draft.id} variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Videocam color="disabled" />
                <Box>
                  <Typography variant="subtitle2">Video {index + 1}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Video upload is not available yet.
                  </Typography>
                </Box>
              </Stack>
              <IconButton
                aria-label={`Remove video ${index + 1}`}
                color="error"
                size="small"
                onClick={() => setVideoDrafts(current => current.filter(item => item.id !== draft.id))}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Stack>
          </Paper>
        ))}

        {feedbackDrafts.map((draft, index) => (
          <Paper key={draft.id} variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2">Feedback {index + 1}</Typography>
                <IconButton
                  aria-label={`Remove feedback ${index + 1}`}
                  color="error"
                  size="small"
                  onClick={() => setFeedbackDrafts(current => current.filter(item => item.id !== draft.id))}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                <FormControl sx={{ minWidth: { xs: "100%", sm: 220 } }}>
                  <InputLabel id="community-feedback-type-label">Feedback type</InputLabel>
                  <Select
                    labelId="community-feedback-type-label"
                    label="Feedback type"
                    value={draft.feedbackType}
                    onChange={event =>
                      setFeedbackDrafts(current =>
                        current.map(item =>
                          item.id === draft.id ? { ...item, feedbackType: event.target.value as FeedbackType } : item,
                        ),
                      )
                    }
                  >
                    {Object.entries(feedbackLabels).map(([value, label]) => (
                      <MenuItem
                        key={value}
                        value={value}
                        disabled={feedbackDrafts.some(item => item.id !== draft.id && item.feedbackType === value)}
                      >
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Rating
                  value={draft.rating}
                  onChange={(_, value) =>
                    setFeedbackDrafts(current =>
                      current.map(item => item.id === draft.id ? { ...item, rating: value } : item),
                    )
                  }
                />
              </Stack>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label={`${feedbackLabels[draft.feedbackType]} feedback`}
                value={draft.content}
                onChange={event =>
                  setFeedbackDrafts(current =>
                    current.map(item => item.id === draft.id ? { ...item, content: event.target.value } : item),
                  )
                }
              />
            </Stack>
          </Paper>
        ))}

        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tooltip title="Add image">
              <span>
                <IconButton
                  component="label"
                  color="primary"
                  disabled={Boolean(disabledReason) || uploading || imageDrafts.length >= MAX_DRAFTS_PER_KIND}
                  aria-label="Add image"
                >
                  {uploading ? <CircularProgress size={22} /> : <AddPhotoAlternate />}
                  <input type="file" hidden accept="image/*" onChange={handleImageSelect} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Add video">
              <span>
                <IconButton
                  color="primary"
                  disabled={Boolean(disabledReason) || videoDrafts.length >= MAX_DRAFTS_PER_KIND}
                  aria-label="Add video"
                  onClick={addVideoDraft}
                >
                  <Videocam />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Add feedback">
              <span>
                <IconButton
                  color="primary"
                  disabled={Boolean(disabledReason) || feedbackDrafts.length >= feedbackTypes.length}
                  aria-label="Add feedback"
                  onClick={addFeedbackDraft}
                >
                  <RateReview />
                </IconButton>
              </span>
            </Tooltip>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {draftCount} ready
            </Typography>
          </Stack>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Send />}
            disabled={submitDisabled}
            onClick={() => void handleSubmit()}
          >
            Post
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
