"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";
import {
  Box,
  CircularProgress,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Popover,
  Popper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { AddPhotoAlternate, Gif, Send } from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import GiphyPicker from "./GiphyPicker";
import type { CommunityCommentView } from "./types";

// Shared between the actual (invisible-text) textarea and the highlight
// overlay behind it, so both wrap identically and stay pixel-aligned.
const MENTION_FIELD_FONT_SIZE = "0.875rem";
const MENTION_FIELD_LINE_HEIGHT = 1.5;
const MENTION_FIELD_PADDING = "8.5px 14px";

interface MentionTarget {
  id: string;
  username: string;
}

interface CommentComposerProps {
  postId: string;
  eventId: number;
  disabled?: boolean;
  prefillRequest?: { value: string; seq: number; mention?: MentionTarget } | null;
  onCommentCreated: (comment: CommunityCommentView, pending: boolean) => void;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getErrorMessage(raw: unknown, fallback: string) {
  if (!raw || typeof raw !== "object") return fallback;
  const payload = raw as { error?: string | Array<{ message?: string }> };
  if (typeof payload.error === "string") return payload.error;
  if (Array.isArray(payload.error)) return payload.error[0]?.message || fallback;
  return fallback;
}

function renderHighlightedContent(text: string) {
  // Highlights any `@run-of-non-space-chars` as a mention-in-progress while
  // typing, regardless of whether it matches a suggestion or a real user -
  // this is just live visual feedback, not validation (that happens
  // server-side at submit time, see resolvePlainMentions in the comments route).
  const parts = text.split(/(@[^\s@]+)/g);
  let consumed = 0;
  return parts.map(part => {
    const key = `${consumed}-${part}`;
    consumed += part.length;
    return part.startsWith("@") && part.length > 1 ? (
      <Box
        key={key}
        component="span"
        sx={{
          color: "primary.main",
          bgcolor: theme => alpha(theme.palette.primary.main, 0.12),
          borderRadius: "3px",
        }}
      >
        {part}
      </Box>
    ) : (
      <span key={key}>{part}</span>
    );
  });
}

export default function CommentComposer({ postId, eventId, disabled, prefillRequest, onCommentCreated }: CommentComposerProps) {
  const [content, setContent] = useState("");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const textFieldRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Keeps the highlight overlay's scroll position in sync with the real
  // (invisible-text) textarea, so highlighted mentions stay aligned once the
  // content grows past `maxRows` and the textarea starts internally scrolling.
  useEffect(() => {
    const el = inputRef.current;
    const overlay = overlayRef.current;
    if (!el || !overlay) return;
    const sync = () => {
      overlay.scrollTop = el.scrollTop;
      overlay.scrollLeft = el.scrollLeft;
    };
    sync();
    el.addEventListener("scroll", sync);
    return () => el.removeEventListener("scroll", sync);
  // Mount-once: the textarea fires a native "scroll" event any time its
  // scrollTop changes for any reason (including the browser auto-scrolling
  // it as typed content grows past maxRows), so no need to re-run per keystroke.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mention autocomplete
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(0);
  const [suggestions, setSuggestions] = useState<{ id: string; username: string; name: string }[]>([]);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const suggestionsOpen = mentionQuery !== null && suggestions.length > 0;

  // Mentions are inserted as friendly `@username` text (good live UX), but
  // stored as a stable `@[[userId]]` token so they always resolve to the
  // mentioned user's *current* username - tracked here in insertion order so
  // submit-time can swap the visible text for the real token.
  const mentionSpansRef = useRef<MentionTarget[]>([]);

  useEffect(() => {
    if (prefillRequest) {
      setContent(c => prefillRequest.value + c);
      if (prefillRequest.mention) {
        mentionSpansRef.current.push(prefillRequest.mention);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillRequest?.seq]);

  useEffect(() => {
    if (mentionQuery === null) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/community/events/${eventId}/mention-suggestions?q=${encodeURIComponent(mentionQuery)}`);
        if (res.ok) {
          const data = await res.json() as { users?: { id: string; username: string; name: string }[] };
          setSuggestions(data.users ?? []);
          setHighlightIdx(0);
        }
      } catch {
        // ignore
      }
    }, 150);
    return () => clearTimeout(t);
  }, [mentionQuery, eventId]);

  const detectMention = (value: string, cursorPos: number) => {
    const before = value.slice(0, cursorPos);
    const match = before.match(/@([^\s@]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionStart(cursorPos - match[0].length);
    } else {
      setMentionQuery(null);
    }
  };

  const completeMention = (user: { id: string; username: string }) => {
    const queryEnd = mentionStart + 1 + (mentionQuery?.length ?? 0);
    const token = `@${user.username} `;
    const newContent = content.slice(0, mentionStart) + token + content.slice(queryEnd);
    setContent(newContent);
    mentionSpansRef.current.push({ id: user.id, username: user.username });
    setMentionQuery(null);
    setSuggestions([]);
    const newCursorPos = mentionStart + token.length;
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    });
  };

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [gifPreviewUrl, setGifPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [giphyAnchor, setGiphyAnchor] = useState<HTMLElement | null>(null);

  const hasContent = content.trim().length > 0 || imageUrl !== null || gifUrl !== null;
  const submitDisabled = disabled || loading || uploading || !hasContent;

  const handleImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setGifUrl(null);
    setGifPreviewUrl(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("eventId", String(eventId));
      formData.append("file", file);

      const res = await fetch("/api/community/media/upload", { method: "POST", body: formData });
      const payload = (await res.json().catch(() => null)) as { url?: string; error?: unknown } | null;

      if (!res.ok || !payload?.url) {
        throw new Error(getErrorMessage(payload, "Failed to upload image"));
      }

      setImageUrl(payload.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleGifSelect = (full: string, preview: string) => {
    setGifUrl(full);
    setGifPreviewUrl(preview);
    setImageUrl(null);
    setGiphyAnchor(null);
  };

  const handleSubmit = async () => {
    if (submitDisabled) return;
    setError(null);
    setLoading(true);

    try {
      // Swap each tracked mention's friendly `@username` text for the stable
      // `@[[userId]]` token, in insertion order. If the user hand-edited a
      // mention away, its text won't match anymore and it's left as-is
      // (degrades to plain text, no token embedded).
      let tokenizedContent = content;
      for (const mention of mentionSpansRef.current) {
        tokenizedContent = tokenizedContent.replace(
          new RegExp(`@${escapeRegExp(mention.username)}(?=\\s|$)`),
          `@[[${mention.id}]]`,
        );
      }

      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: tokenizedContent.trim() || undefined,
          imageUrls: imageUrl ? [imageUrl] : [],
          gifUrl: gifUrl || undefined,
        }),
      });
      const payload = (await res.json().catch(() => null)) as {
        comment?: CommunityCommentView;
        pending?: boolean;
        error?: unknown;
      } | null;

      if (!res.ok || !payload?.comment) {
        throw new Error(getErrorMessage(payload, "Failed to post comment"));
      }

      onCommentCreated(payload.comment, Boolean(payload.pending));
      setContent("");
      mentionSpansRef.current = [];
      setImageUrl(null);
      setGifUrl(null);
      setGifPreviewUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setLoading(false);
    }
  };

  const attachment = imageUrl ?? gifPreviewUrl;

  return (
    <Box>
      {error ? (
        <Typography variant="caption" color="error" display="block" sx={{ mb: 0.5 }}>
          {error}
        </Typography>
      ) : null}

      {attachment ? (
        <Box
          sx={{
            position: "relative",
            width: 120,
            aspectRatio: "4 / 3",
            mb: 1,
            borderRadius: 1,
            overflow: "hidden",
            bgcolor: "grey.100",
          }}
        >
          <Box
            component="img"
            src={attachment}
            alt="Attachment preview"
            sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <IconButton
            size="small"
            color="error"
            onClick={() => { setImageUrl(null); setGifUrl(null); setGifPreviewUrl(null); }}
            sx={{ position: "absolute", top: 2, right: 2, bgcolor: "background.paper", p: 0.25 }}
            aria-label="Remove attachment"
          >
            ×
          </IconButton>
        </Box>
      ) : null}

      <Stack direction="row" spacing={1} alignItems="center">
        <Box ref={textFieldRef} sx={{ flex: 1, minWidth: 0, position: "relative" }}>
          <Box
            ref={overlayRef}
            aria-hidden
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              overflow: "hidden",
              pointerEvents: "none",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflowWrap: "break-word",
              fontFamily: theme => theme.typography.fontFamily,
              fontSize: MENTION_FIELD_FONT_SIZE,
              lineHeight: MENTION_FIELD_LINE_HEIGHT,
              p: MENTION_FIELD_PADDING,
              color: "text.primary",
            }}
          >
            {renderHighlightedContent(content)}
          </Box>
          <TextField
            fullWidth
            size="small"
            placeholder="Add a comment…"
            value={content}
            inputRef={inputRef}
            onChange={e => {
              const el = e.target as HTMLInputElement | HTMLTextAreaElement;
              setContent(el.value);
              detectMention(el.value, el.selectionStart ?? el.value.length);
            }}
            disabled={disabled}
            sx={{
              position: "relative",
              zIndex: 1,
              "& .MuiOutlinedInput-root": { p: 0 },
              "& .MuiInputBase-input": {
                p: MENTION_FIELD_PADDING,
                fontFamily: theme => theme.typography.fontFamily,
                fontSize: MENTION_FIELD_FONT_SIZE,
                lineHeight: MENTION_FIELD_LINE_HEIGHT,
                color: "transparent",
                caretColor: theme => theme.palette.text.primary,
              },
              "& .MuiInputBase-input::placeholder": {
                color: "text.secondary",
                opacity: 1,
                WebkitTextFillColor: "currentColor",
              },
            }}
            onKeyDown={e => {
              if (suggestionsOpen) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlightIdx(i => Math.min(i + 1, suggestions.length - 1));
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlightIdx(i => Math.max(i - 1, 0));
                  return;
                }
                if ((e.key === "Tab" || e.key === "Enter") && suggestions[highlightIdx]) {
                  e.preventDefault();
                  completeMention(suggestions[highlightIdx]);
                  return;
                }
                if (e.key === "Escape") {
                  setMentionQuery(null);
                  setSuggestions([]);
                  return;
                }
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            multiline
            maxRows={4}
          />
        </Box>

        <Tooltip title={uploading ? "Uploading…" : "Attach image or GIF"}>
          <span>
            <IconButton
              component="label"
              size="small"
              color="primary"
              disabled={disabled || uploading}
              aria-label="Attach image or own GIF"
            >
              {uploading ? <CircularProgress size={18} /> : <AddPhotoAlternate fontSize="small" />}
              <input type="file" hidden accept="image/*,image/gif" onChange={handleImageSelect} />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Search Giphy">
          <span>
            <IconButton
              size="small"
              color="primary"
              disabled={disabled}
              aria-label="Search Giphy"
              onClick={e => setGiphyAnchor(e.currentTarget)}
            >
              <Gif fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Send">
          <span>
            <IconButton
              size="small"
              color="primary"
              disabled={submitDisabled}
              aria-label="Send comment"
              onClick={() => void handleSubmit()}
            >
              {loading ? <CircularProgress size={18} /> : <Send fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <Popper
        open={suggestionsOpen}
        anchorEl={textFieldRef.current}
        placement="top-start"
        style={{ zIndex: 1400 }}
      >
        <Paper elevation={4} sx={{ maxHeight: 220, overflowY: "auto", minWidth: 200 }}>
          <List dense disablePadding>
            {suggestions.map((user, i) => (
              <ListItemButton
                key={user.id}
                selected={i === highlightIdx}
                onMouseDown={e => { e.preventDefault(); completeMention(user); }}
                onMouseEnter={() => setHighlightIdx(i)}
              >
                <ListItemText
                  primary={`@${user.username}`}
                  secondary={user.name !== user.username ? user.name : undefined}
                  slotProps={{ primary: { variant: "body2" }, secondary: { variant: "caption" } }}
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      </Popper>

      <Popover
        open={Boolean(giphyAnchor)}
        anchorEl={giphyAnchor}
        onClose={() => setGiphyAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ p: 1.5 }}>
          <GiphyPicker onSelect={handleGifSelect} />
        </Box>
      </Popover>
    </Box>
  );
}
