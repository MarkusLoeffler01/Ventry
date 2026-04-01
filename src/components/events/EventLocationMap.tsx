"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Link as MuiLink,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Close, OpenInFull } from "@mui/icons-material";
import type { SerializedLocation } from "@/types/event";

interface EventLocationMapProps {
  location: SerializedLocation;
}

interface GeocodeResult {
  lat: string;
  lon: string;
}

function buildDisplayAddress(location: SerializedLocation) {
  return [
    location.name,
    location.address,
    `${location.postalCode} ${location.city}`,
    location.state,
    location.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function buildAddressOnly(location: SerializedLocation) {
  return [
    location.address,
    `${location.postalCode} ${location.city}`,
    location.state,
    location.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function buildGoogleMapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function buildOsmSearchUrl(address: string) {
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`;
}

function buildEmbedUrl(lat: number, lon: number) {
  const latitudeDelta = 0.008;
  const longitudeDelta = 0.012;
  const bbox = [
    lon - longitudeDelta,
    lat - latitudeDelta,
    lon + longitudeDelta,
    lat + latitudeDelta,
  ].join(",");

  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lon}`)}`;
}

export default function EventLocationMap({ location }: EventLocationMapProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [geocodeFailed, setGeocodeFailed] = useState(false);

  const displayAddress = useMemo(() => buildDisplayAddress(location), [location]);
  const addressOnly = useMemo(() => buildAddressOnly(location), [location]);
  const googleMapsUrl = useMemo(() => buildGoogleMapsUrl(displayAddress), [displayAddress]);
  const osmSearchUrl = useMemo(() => buildOsmSearchUrl(addressOnly), [addressOnly]);

  useEffect(() => {
    const controller = new AbortController();

    async function geocode() {
      setLoading(true);
      setGeocodeFailed(false);

      try {
        const baseHeaders = {
          Accept: "application/json",
        };

        const structuredParams = new URLSearchParams({
          format: "jsonv2",
          limit: "1",
          street: location.address,
          city: location.city,
          state: location.state,
          postalcode: location.postalCode,
          country: location.country,
        });

        let response = await fetch(`https://nominatim.openstreetmap.org/search?${structuredParams.toString()}`, {
          signal: controller.signal,
          headers: baseHeaders,
        });

        if (!response.ok) {
          throw new Error("Failed to geocode location");
        }

        let data = (await response.json()) as GeocodeResult[];
        let firstResult = data[0];

        if (!firstResult) {
          const fallbackParams = new URLSearchParams({
            format: "jsonv2",
            limit: "1",
            q: addressOnly,
          });

          response = await fetch(`https://nominatim.openstreetmap.org/search?${fallbackParams.toString()}`, {
            signal: controller.signal,
            headers: baseHeaders,
          });

          if (!response.ok) {
            throw new Error("Failed to geocode location");
          }

          data = (await response.json()) as GeocodeResult[];
          firstResult = data[0];
        }

        if (!firstResult) {
          setGeocodeFailed(true);
          setEmbedUrl(null);
          return;
        }

        const lat = Number(firstResult.lat);
        const lon = Number(firstResult.lon);
        if (Number.isNaN(lat) || Number.isNaN(lon)) {
          setGeocodeFailed(true);
          setEmbedUrl(null);
          return;
        }

        setEmbedUrl(buildEmbedUrl(lat, lon));
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Location geocoding failed:", error);
        setGeocodeFailed(true);
        setEmbedUrl(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void geocode();

    return () => controller.abort();
  }, [addressOnly, location.address, location.city, location.country, location.postalCode, location.state]);

  return (
    <Stack spacing={2} mt={3}>
      <Paper
        variant="outlined"
        sx={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 3,
          minHeight: 280,
          bgcolor: "grey.100",
        }}
      >
        {loading ? (
          <Box
            sx={{
              minHeight: 280,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress />
          </Box>
        ) : embedUrl ? (
          <Box
            role="button"
            tabIndex={0}
            onClick={() => setDialogOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setDialogOpen(true);
              }
            }}
            sx={{
              position: "relative",
              cursor: "pointer",
              minHeight: 280,
              outline: "none",
            }}
          >
            <Box
              component="iframe"
              title={`Map preview for ${location.name}`}
              src={embedUrl}
              loading="lazy"
              sx={{
                width: "100%",
                height: 320,
                border: 0,
                display: "block",
                pointerEvents: "none",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to top, rgba(15,23,42,0.28) 0%, rgba(15,23,42,0.06) 45%, rgba(15,23,42,0.02) 100%)",
              }}
            />
            <Button
              variant="contained"
              startIcon={<OpenInFull />}
              sx={{
                position: "absolute",
                right: 16,
                bottom: 16,
                pointerEvents: "none",
              }}
            >
              Open Fullscreen Map
            </Button>
          </Box>
        ) : (
          <Box sx={{ p: 3 }}>
            <Alert severity="info">
              We couldn&apos;t load the map preview for this address right now.
            </Alert>
          </Box>
        )}
      </Paper>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
        <MuiLink href={googleMapsUrl} target="_blank" rel="noreferrer" underline="hover">
          View in Google Maps
        </MuiLink>
        {(geocodeFailed || !embedUrl) && (
          <MuiLink href={osmSearchUrl} target="_blank" rel="noreferrer" underline="hover">
            Open in OpenStreetMap
          </MuiLink>
        )}
      </Stack>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth={false}
        PaperProps={{
          sx: {
            width: "min(1400px, calc(100vw - 48px))",
            maxWidth: "none",
            height: "calc(100vh - 48px)",
            m: 3,
            borderRadius: 3,
            overflow: "hidden",
          },
        }}
      >
        <DialogContent sx={{ p: 0, display: "flex", flexDirection: "column", height: "100%" }}>
          <Box
            sx={{
              px: 2,
              py: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="h6" fontWeight="bold">
              {location.name}
            </Typography>
            <IconButton onClick={() => setDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>

          {embedUrl && (
            <Box
              component="iframe"
              title={`Expanded map for ${location.name}`}
              src={embedUrl}
              loading="lazy"
              sx={{
                flexGrow: 1,
                width: "100%",
                border: 0,
                minHeight: 0,
              }}
            />
          )}

          <Box
            sx={{
              px: 3,
              py: 2,
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            <MuiLink href={googleMapsUrl} target="_blank" rel="noreferrer" underline="hover">
              View in Google Maps
            </MuiLink>
          </Box>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
