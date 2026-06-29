"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  CheckCircle,
  Delete,
  History as HistoryIcon,
  PushPin,
  PushPinOutlined,
  Refresh,
  ThumbDown,
} from "@mui/icons-material";
import type { CommunityPostView } from "@/components/events/community/types";

type PostStatus = "PENDING" | "APPROVED" | "REJECTED" | "DELETED";

type ModerationLog = {
  id: string;
  postId: string;
  action: string;
  reason: string | null;
  createdAt: string;
  post: { id: string; type: string; content: string | null; status: string };
  actor: { id: string; name: string | null; email: string } | null;
};

interface CommunityModerationPanelProps {
  eventId: number;
  communityModerated: boolean;
}

const STATUS_COLORS: Record<PostStatus, "warning" | "success" | "error" | "default"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
  DELETED: "default",
};

const ACTION_LABELS: Record<string, string> = {
  CREATED: "Created",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  DELETED: "Removed",
  PINNED: "Pinned",
  UNPINNED: "Unpinned",
};

export default function CommunityModerationPanel({
  eventId,
  communityModerated,
}: CommunityModerationPanelProps) {
  const [tab, setTab] = useState(0);
  const [posts, setPosts] = useState<CommunityPostView[]>([]);
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PostStatus | "ALL">("PENDING");
  const [rejectDialog, setRejectDialog] = useState<{ postId: string; bulk: boolean } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelectedIds(new Set());
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      params.set("limit", "50");
      const res = await fetch(`/api/admin/event/${eventId}/community/posts?${params}`);
      const data = await res.json() as { posts?: CommunityPostView[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to load posts");
      setPosts(data.posts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [eventId, statusFilter]);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/admin/event/${eventId}/community/logs?limit=50`);
      const data = await res.json() as { logs?: ModerationLog[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to load logs");
      setLogs(data.logs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setLogsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (tab === 3) {
      void fetchLogs();
    } else {
      void fetchPosts();
    }
  }, [tab, fetchPosts, fetchLogs]);

  const handleTabChange = (_: React.SyntheticEvent, v: number) => {
    setTab(v);
    if (v === 0) setStatusFilter("PENDING");
    else if (v === 1) setStatusFilter("ALL");
    else if (v === 2) setStatusFilter("DELETED");
  };

  const moderate = async (postId: string, action: string, reason?: string) => {
    setActionLoading(postId);
    setError(null);
    try {
      const res = await fetch(`/api/community/posts/${postId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reason || undefined }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error || "Action failed");
      if (action === "remove") {
        setPosts(current => current.filter(p => p.id !== postId));
      } else {
        await fetchPosts();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const bulkModerate = async (action: string, reason?: string) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/community/posts/bulk-moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          postIds: Array.from(selectedIds),
          action,
          reason: reason || undefined,
        }),
      });
      const data = await res.json() as { processed?: number; skipped?: number; error?: string };
      if (!res.ok) throw new Error(data.error || "Bulk action failed");
      await fetchPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk action failed");
    } finally {
      setBulkLoading(false);
      setRejectDialog(null);
      setRejectReason("");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === posts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(posts.map(p => p.id)));
    }
  };

  const openRejectDialog = (postId: string) => {
    setRejectDialog({ postId, bulk: false });
    setRejectReason("");
  };

  const openBulkRejectDialog = () => {
    setRejectDialog({ postId: "", bulk: true });
    setRejectReason("");
  };

  const handleRejectConfirm = async () => {
    if (!rejectDialog) return;
    if (rejectDialog.bulk) {
      await bulkModerate("reject", rejectReason);
    } else {
      await moderate(rejectDialog.postId, "reject", rejectReason);
      setRejectDialog(null);
      setRejectReason("");
    }
  };

  const PostActions = ({ post }: { post: CommunityPostView }) => {
    const busy = actionLoading === post.id;
    return (
      <Stack direction="row" spacing={0.5}>
        {post.status === "PENDING" && (
          <Tooltip title="Approve">
            <span>
              <IconButton
                size="small"
                color="success"
                disabled={busy}
                onClick={() => void moderate(post.id, "approve")}
              >
                {busy ? <CircularProgress size={16} /> : <CheckCircle fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
        )}
        {post.status !== "REJECTED" && post.status !== "DELETED" && (
          <Tooltip title="Reject">
            <span>
              <IconButton
                size="small"
                color="error"
                disabled={busy}
                onClick={() => openRejectDialog(post.id)}
              >
                <ThumbDown fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
        {post.status !== "DELETED" && (
          <>
            <Tooltip title={post.pinned ? "Unpin" : "Pin to top"}>
              <span>
                <IconButton
                  size="small"
                  color={post.pinned ? "primary" : "default"}
                  disabled={busy}
                  onClick={() => void moderate(post.id, post.pinned ? "unpin" : "pin")}
                >
                  {post.pinned ? <PushPin fontSize="small" /> : <PushPinOutlined fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Remove">
              <span>
                <IconButton
                  size="small"
                  color="error"
                  disabled={busy}
                  onClick={() => void moderate(post.id, "remove")}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </>
        )}
      </Stack>
    );
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1} mb={3}>
        <Typography variant="h4">Community Moderation</Typography>
        {!communityModerated && (
          <Alert severity="info" sx={{ py: 0.5 }}>
            Moderation is disabled — posts auto-approve.
          </Alert>
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper>
        <Tabs
          value={tab}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: "divider" }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Pending" />
          <Tab label="All Posts" />
          <Tab label="Deleted" />
          <Tab label="Audit Log" />
        </Tabs>

        <Box sx={{ p: { xs: 1, sm: 2 } }}>
          {tab === 0 && (
            <PostList
              posts={posts}
              loading={loading}
              selectedIds={selectedIds}
              bulkLoading={bulkLoading}
              onToggleSelect={toggleSelect}
              onSelectAll={selectAll}
              onBulkApprove={() => void bulkModerate("approve")}
              onBulkReject={openBulkRejectDialog}
              onBulkRemove={() => void bulkModerate("remove")}
              onRefresh={() => void fetchPosts()}
              PostActions={PostActions}
              showStatusBadge={false}
            />
          )}

          {tab === 1 && (
            <Box>
              <Stack direction="row" spacing={1} mb={2} alignItems="center" flexWrap="wrap" useFlexGap>
                {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map(s => (
                  <Button
                    key={s}
                    size="small"
                    variant={statusFilter === s ? "contained" : "outlined"}
                    onClick={() => { setStatusFilter(s); }}
                  >
                    {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                  </Button>
                ))}
                <IconButton size="small" onClick={() => void fetchPosts()}>
                  <Refresh fontSize="small" />
                </IconButton>
              </Stack>
              <PostList
                posts={posts}
                loading={loading}
                selectedIds={selectedIds}
                bulkLoading={bulkLoading}
                onToggleSelect={toggleSelect}
                onSelectAll={selectAll}
                onBulkApprove={() => void bulkModerate("approve")}
                onBulkReject={openBulkRejectDialog}
                onBulkRemove={() => void bulkModerate("remove")}
                onRefresh={() => void fetchPosts()}
                PostActions={PostActions}
                showStatusBadge
              />
            </Box>
          )}

          {tab === 2 && (
            <PostList
              posts={posts}
              loading={loading}
              selectedIds={selectedIds}
              bulkLoading={bulkLoading}
              onToggleSelect={toggleSelect}
              onSelectAll={selectAll}
              onBulkApprove={() => void bulkModerate("approve")}
              onBulkReject={openBulkRejectDialog}
              onBulkRemove={() => void bulkModerate("remove")}
              onRefresh={() => void fetchPosts()}
              PostActions={PostActions}
              showStatusBadge={false}
            />
          )}

          {tab === 3 && (
            <AuditLogView logs={logs} loading={logsLoading} onRefresh={() => void fetchLogs()} />
          )}
        </Box>
      </Paper>

      <Dialog open={Boolean(rejectDialog)} onClose={() => setRejectDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {rejectDialog?.bulk ? `Reject ${selectedIds.size} post(s)` : "Reject Post"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="Reason (optional)"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            sx={{ mt: 1 }}
            placeholder="Reason visible in audit log..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void handleRejectConfirm()}
            disabled={Boolean(actionLoading) || bulkLoading}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function PostList({
  posts,
  loading,
  selectedIds,
  bulkLoading,
  onToggleSelect,
  onSelectAll,
  onBulkApprove,
  onBulkReject,
  onBulkRemove,
  onRefresh,
  PostActions,
  showStatusBadge,
}: {
  posts: CommunityPostView[];
  loading: boolean;
  selectedIds: Set<string>;
  bulkLoading: boolean;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onBulkApprove: () => void;
  onBulkReject: () => void;
  onBulkRemove: () => void;
  onRefresh: () => void;
  PostActions: React.ComponentType<{ post: CommunityPostView }>;
  showStatusBadge: boolean;
}) {
  if (loading) {
    return (
      <Box sx={{ py: 6, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1} mb={2}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          {selectedIds.size > 0 && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>
                {selectedIds.size} selected
              </Typography>
              <Button size="small" variant="outlined" color="success" disabled={bulkLoading} onClick={onBulkApprove}>
                Approve
              </Button>
              <Button size="small" variant="outlined" color="warning" disabled={bulkLoading} onClick={onBulkReject}>
                Reject
              </Button>
              <Button size="small" variant="outlined" color="error" disabled={bulkLoading} onClick={onBulkRemove}>
                Remove
              </Button>
            </>
          )}
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          {posts.length > 0 && (
            <Button size="small" variant="text" onClick={onSelectAll}>
              {selectedIds.size === posts.length ? "Deselect all" : "Select all"}
            </Button>
          )}
          <IconButton size="small" onClick={onRefresh}>
            <Refresh fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>

      {posts.length === 0 ? (
        <Alert severity="info">No posts.</Alert>
      ) : (
        <Stack spacing={1}>
          {posts.map(post => (
            <PostRow
              key={post.id}
              post={post}
              selected={selectedIds.has(post.id)}
              onToggleSelect={() => onToggleSelect(post.id)}
              PostActions={PostActions}
              showStatusBadge={showStatusBadge}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

function PostRow({
  post,
  selected,
  onToggleSelect,
  PostActions,
  showStatusBadge,
}: {
  post: CommunityPostView;
  selected: boolean;
  onToggleSelect: () => void;
  PostActions: React.ComponentType<{ post: CommunityPostView }>;
  showStatusBadge: boolean;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1.5, sm: 2 },
        cursor: "pointer",
        bgcolor: selected ? "action.selected" : undefined,
        borderColor: selected ? "primary.main" : undefined,
      }}
      onClick={onToggleSelect}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Avatar
          src={post.author.imageUrl || undefined}
          sx={{ width: 32, height: 32, flexShrink: 0, mt: 0.25 }}
        />
        <Box flex={1} minWidth={0}>
          <Stack direction="row" spacing={0.75} alignItems="center" mb={0.5} flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle2" fontWeight="bold">
              {post.author.name}
            </Typography>
            <Chip label={post.type} size="small" variant="outlined" />
            {showStatusBadge && (
              <Chip
                label={post.status}
                size="small"
                color={STATUS_COLORS[post.status as PostStatus] ?? "default"}
              />
            )}
            {post.pinned && <Chip label="Pinned" size="small" color="primary" />}
            <Typography variant="caption" color="text.secondary">
              {new Date(post.createdAt).toLocaleString()}
            </Typography>
          </Stack>
          {post.content && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                wordBreak: "break-word",
              }}
            >
              {post.content}
            </Typography>
          )}
          {post.imageUrls.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              {post.imageUrls.length} image(s)
            </Typography>
          )}
          {post.linkUrl && (
            <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }} display="block">
              {post.linkUrl}
            </Typography>
          )}
          <Box mt={0.5} onClick={e => e.stopPropagation()}>
            <PostActions post={post} />
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
}

function AuditLogView({
  logs,
  loading,
  onRefresh,
}: {
  logs: ModerationLog[];
  loading: boolean;
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <Box sx={{ py: 6, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end" mb={2}>
        <IconButton size="small" onClick={onRefresh}>
          <Refresh fontSize="small" />
        </IconButton>
      </Stack>
      {logs.length === 0 ? (
        <Alert severity="info">No moderation actions recorded.</Alert>
      ) : (
        <Stack spacing={1}>
          {logs.map(log => (
            <Paper key={log.id} variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <HistoryIcon fontSize="small" color="action" />
                  <Chip
                    label={ACTION_LABELS[log.action] ?? log.action}
                    size="small"
                    color={
                      log.action === "APPROVED" ? "success"
                        : log.action === "REJECTED" || log.action === "DELETED" ? "error"
                        : log.action === "PINNED" ? "primary"
                        : "default"
                    }
                  />
                  <Typography variant="body2">
                    post <code>{log.postId.slice(-8)}</code>
                  </Typography>
                  {log.actor && (
                    <Typography variant="caption" color="text.secondary">
                      by {log.actor.name || log.actor.email}
                    </Typography>
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary" flexShrink={0} ml={1}>
                  {new Date(log.createdAt).toLocaleString()}
                </Typography>
              </Stack>
              {log.reason && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" color="text.secondary" fontStyle="italic">
                    &quot;{log.reason}&quot;
                  </Typography>
                </>
              )}
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}
