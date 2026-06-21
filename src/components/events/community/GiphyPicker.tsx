"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  CircularProgress,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import type { IGif } from "@giphy/js-types";

interface GiphyPickerProps {
  onSelect: (gifUrl: string, previewUrl: string) => void;
}

export default function GiphyPicker({ onSelect }: GiphyPickerProps) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<IGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setLoading(true);
      setError(null);
      fetch("/api/community/giphy/search?limit=20")
        .then(r => r.json())
        .then((payload: { gifs?: IGif[] }) => { setGifs(payload.gifs ?? []); })
        .catch(() => setGifs([]))
        .finally(() => setLoading(false));
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/community/giphy/search?q=${encodeURIComponent(query)}&limit=20`,
        );
        const payload = (await res.json().catch(() => null)) as { gifs?: IGif[]; error?: string } | null;
        if (!res.ok || !payload?.gifs) {
          throw new Error(payload?.error ?? "Failed to search GIFs");
        }
        setGifs(payload.gifs);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to search GIFs");
        setGifs([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <Box sx={{ width: 320 }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Search Giphy..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              {loading ? <CircularProgress size={16} /> : <Search fontSize="small" />}
            </InputAdornment>
          ),
        }}
        sx={{ mb: 1 }}
      />

      {error ? (
        <Typography variant="caption" color="error" display="block" sx={{ mb: 1 }}>
          {error}
        </Typography>
      ) : null}

      {gifs.length > 0 ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 0.5,
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {gifs.map(gif => {
            const preview = gif.images.fixed_height_small?.url ?? gif.images.fixed_height?.url ?? "";
            const full = gif.images.original?.url ?? preview;
            return (
              <Box
                key={gif.id}
                component="img"
                src={preview}
                alt={gif.title}
                onClick={() => onSelect(full, preview)}
                sx={{
                  width: "100%",
                  aspectRatio: "4 / 3",
                  objectFit: "cover",
                  cursor: "pointer",
                  borderRadius: 1,
                  "&:hover": { opacity: 0.8 },
                }}
              />
            );
          })}
        </Box>
      ) : !loading && query.trim() ? (
        <Typography variant="caption" color="text.secondary">No GIFs found.</Typography>
      ) : null}

      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1, textAlign: "right" }}>
        Powered by GIPHY
      </Typography>
    </Box>
  );
}
