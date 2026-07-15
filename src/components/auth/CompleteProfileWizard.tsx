"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  Grid,
  InputAdornment,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowBack,
  ArrowForward,
  Business,
  ConfirmationNumber,
  Person,
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import authClient from "@/lib/auth/client";
import { requiredCountryCodeSchema } from "@/types/schemas/country";
import CountryAutocomplete from "@/components/common/CountryAutocomplete";
import { DISPLAY_NAME_MAX_LENGTH } from "@/lib/user/display-name";
import { notifyProfilePictureChanged } from "@/lib/user/profilePictureEvents";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const personalSchema = z.object({
  legalName: z.string().trim().min(2, "Required"),
  addressLine1: z.string().trim().min(2, "Required"),
  addressLine2: z.string().trim().optional(),
  addressCity: z.string().trim().min(2, "Required"),
  addressState: z.string().trim().optional(),
  addressPostalCode: z.string().trim().min(2, "Required"),
  addressCountry: requiredCountryCodeSchema,
});

const orgSchema = z.object({
  orgName: z.string().trim().min(2, "Min 2 characters").max(100, "Max 100 characters"),
  orgSlug: z
    .string()
    .trim()
    .min(2, "Min 2 characters")
    .max(50, "Max 50 characters")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
  orgDescription: z.string().trim().max(500, "Max 500 characters").optional(),
});

type PersonalData = z.infer<typeof personalSchema>;
type OrgData = z.infer<typeof orgSchema>;
type Path = "ATTENDEE" | "ORGANIZER";
type OrganizerType = "INDIVIDUAL" | "ORGANIZATION";

// ─── Step indices ─────────────────────────────────────────────────────────────

const S_USERNAME = 0;
const S_PATH = 1;
const S_PERSONAL = 2;
const S_ORGANIZER_TYPE = 3;
const S_ORG_DETAILS = 4;

// ─── Selection Card ───────────────────────────────────────────────────────────

function SelectionCard({
  selected,
  onSelect,
  icon,
  title,
  description,
  badge,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <Paper
      variant="outlined"
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
      sx={{
        p: 3,
        cursor: "pointer",
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? "primary.main" : "divider",
        bgcolor: selected
          ? (t) => alpha(t.palette.primary.main, 0.05)
          : "background.paper",
        transition: "all 0.15s ease",
        "&:hover": {
          borderColor: "primary.light",
          bgcolor: (t) => alpha(t.palette.primary.main, 0.03),
        },
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: 2,
        },
        height: "100%",
        minHeight: 160,
      }}
    >
      <Stack alignItems="center" spacing={1.5} textAlign="center">
        <Box sx={{ color: selected ? "primary.main" : "text.secondary", display: "flex" }}>
          {icon}
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h6" fontWeight={700}>
            {title}
          </Typography>
          {badge && <Chip label={badge} size="small" color="secondary" variant="outlined" />}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Stack>
    </Paper>
  );
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

export default function CompleteProfileWizard({
  callbackUrl,
  defaultLegalName,
  defaultUsername,
  avatarUrl,
}: {
  callbackUrl?: string;
  defaultLegalName?: string;
  defaultUsername?: string;
  avatarUrl?: string;
}) {
  const [step, setStep] = useState(S_USERNAME);
  const [username, setUsername] = useState(defaultUsername || "");
  const [importProfilePicture, setImportProfilePicture] = useState(true);
  const [path, setPath] = useState<Path | null>(null);
  const [organizerType, setOrganizerType] = useState<OrganizerType | null>(null);
  const [personalData, setPersonalData] = useState<PersonalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const personalForm = useForm<PersonalData>({
    resolver: zodResolver(personalSchema),
    mode: "onBlur",
    defaultValues: { legalName: defaultLegalName || "" },
  });
  const orgForm = useForm<OrgData>({
    resolver: zodResolver(orgSchema),
    mode: "onBlur",
  });

  const orgNameValue = orgForm.watch("orgName") || "";
  const slugManuallyEdited = useRef(false);

  const generateSlug = useCallback(
    (name: string) =>
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    [],
  );

  useEffect(() => {
    if (!slugManuallyEdited.current && orgNameValue) {
      orgForm.setValue("orgSlug", generateSlug(orgNameValue), {
        shouldValidate: step === S_ORG_DETAILS,
      });
    }
  }, [orgNameValue, orgForm, generateSlug, step]);

  const steps = [
    "Username",
    "Your path",
    "Personal details",
    ...(path === "ORGANIZER" ? ["Organizer type"] : []),
    ...(path === "ORGANIZER" && organizerType === "ORGANIZATION" ? ["Organization"] : []),
  ];

  const go = (n: number) => {
    setError(null);
    setStep(n);
  };

  const onUsernameNext = () => {
    const trimmed = username.trim();
    if (trimmed.length < 2) {
      setError("Username must be at least 2 characters.");
      return;
    }
    if (trimmed.length > DISPLAY_NAME_MAX_LENGTH) {
      setError(`Username must be ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`);
      return;
    }
    if (/\s/.test(trimmed)) {
      setError("Username cannot contain spaces - use hyphens or underscores instead.");
      return;
    }
    setUsername(trimmed);
    go(S_PATH);
  };

  const onPathNext = () => {
    if (!path) {
      setError("Please choose a path to continue.");
      return;
    }
    go(S_PERSONAL);
  };

  const onPersonalNext = personalForm.handleSubmit((data) => {
    setPersonalData(data);
    if (path === "ATTENDEE") {
      void submit(data, null, null);
    } else {
      go(S_ORGANIZER_TYPE);
    }
  });

  const onOrganizerTypeNext = () => {
    if (!organizerType) {
      setError("Please choose your organizer type.");
      return;
    }
    if (organizerType === "INDIVIDUAL") {
      void submit(personalData, "INDIVIDUAL", null);
    } else {
      go(S_ORG_DETAILS);
    }
  };

  const onOrgDetailsNext = orgForm.handleSubmit((data) => {
    void submit(personalData, "ORGANIZATION", data);
  });

  const submit = async (
    personal: PersonalData | null,
    resolvedOrganizerType: OrganizerType | null,
    org: OrgData | null,
  ) => {
    if (!personal || !path) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...personal,
          username,
          importProfilePicture,
          path,
          organizerType: resolvedOrganizerType ?? undefined,
          ...(org
            ? { orgName: org.orgName, orgSlug: org.orgSlug, orgDescription: org.orgDescription }
            : {}),
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error || "Something went wrong");
        return;
      }
      const body = (await res.json()) as { pictureImported?: boolean };
      // isAdmin (and other fields) changed server-side via a raw fetch, not
      // through an authClient action — the reactive session store that
      // useSession() (AppHeader etc.) reads from only refetches when
      // $sessionSignal fires. A plain getSession() call bypasses that store
      // entirely, so it never reaches useSession() until something else
      // (next login, tab focus) happens to trigger a refetch. Flip the
      // signal directly to force it now.
      authClient.$store.notify("$sessionSignal");
      if (body.pictureImported) {
        notifyProfilePictureChanged();
      }
      // Hard navigation, not router.push(): a client-side transition here can
      // race the profileCompletion middleware's own getSession() read (still
      // pre-update) into a redirect back to /complete-profile, which then
      // blank-renders instead of resolving - a known interaction between
      // redirect() inside a Suspense boundary and soft navigation under this
      // app's cacheComponents config. A full navigation always re-reads the
      // now-committed session server-side, so it can't hit that race.
      window.location.href = callbackUrl || "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* ── Step 0: Username ─────────────────────────────────────────────── */}
      {step === S_USERNAME && (
        <Box>
          <Typography variant="h6" gutterBottom fontWeight={600}>
            Choose your username
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This is shown on your public profile. We suggested one based on your account name — feel free to change it.
          </Typography>

          <TextField
            margin="normal"
            required
            fullWidth
            label="Username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            inputProps={{ maxLength: DISPLAY_NAME_MAX_LENGTH }}
            helperText="No spaces - use hyphens or underscores instead."
          />

          {avatarUrl && (
            <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar src={avatarUrl} sx={{ width: 56, height: 56 }} />
                <Box sx={{ flex: 1 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={importProfilePicture}
                        onChange={(e) => setImportProfilePicture(e.target.checked)}
                      />
                    }
                    label="Import this as my profile picture"
                  />
                  <Typography variant="body2" color="text.secondary">
                    You can always change or remove it later.
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          )}

          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
            <Button
              onClick={onUsernameNext}
              variant="contained"
              size="large"
              endIcon={<ArrowForward />}
              sx={{ py: 1.25 }}
            >
              Continue
            </Button>
          </Stack>
        </Box>
      )}

      {/* ── Step 1: Path selection ───────────────────────────────────────── */}
      {step === S_PATH && (
        <Box>
          <Typography variant="h6" gutterBottom fontWeight={600}>
            How will you use Ventry?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            You can always change this later.
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <SelectionCard
                selected={path === "ATTENDEE"}
                onSelect={() => setPath("ATTENDEE")}
                icon={<ConfirmationNumber sx={{ fontSize: 40 }} />}
                title="Attendee"
                description="Discover events, register, and connect with the community."
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <SelectionCard
                selected={path === "ORGANIZER"}
                onSelect={() => setPath("ORGANIZER")}
                icon={<Business sx={{ fontSize: 40 }} />}
                title="Organizer"
                description="Create and manage your own events, sell tickets, and build your audience."
                badge="Pro"
              />
            </Grid>
          </Grid>

          <Stack direction="row" justifyContent="space-between" sx={{ mt: 3 }}>
            <Button onClick={() => go(S_USERNAME)} startIcon={<ArrowBack />} variant="text">
              Back
            </Button>
            <Button
              onClick={onPathNext}
              variant="contained"
              size="large"
              endIcon={<ArrowForward />}
              sx={{ py: 1.25 }}
            >
              Continue
            </Button>
          </Stack>
        </Box>
      )}

      {/* ── Step 2: Personal details ─────────────────────────────────────── */}
      {step === S_PERSONAL && (
        <Box component="form" onSubmit={(e) => void onPersonalNext(e)} noValidate>
          <Alert severity="info" sx={{ mb: 2 }}>
            {path === "ATTENDEE"
              ? "Your legal name and address are protected personal data. They are not shown publicly; check-in staff may see your legal name when verifying ID at the door."
              : "Your legal details are used for billing and compliance purposes and are not shown publicly."}
          </Alert>

          <TextField
            margin="normal"
            required
            fullWidth
            label={path === "ORGANIZER" ? "Legal / Organization name" : "Legal name"}
            autoComplete="name"
            {...personalForm.register("legalName")}
            error={!!personalForm.formState.errors.legalName}
            helperText={personalForm.formState.errors.legalName?.message || " "}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            label="Address"
            autoComplete="street-address"
            {...personalForm.register("addressLine1")}
            error={!!personalForm.formState.errors.addressLine1}
            helperText={personalForm.formState.errors.addressLine1?.message || " "}
          />

          <TextField
            margin="normal"
            fullWidth
            label="Address line 2"
            autoComplete="address-line2"
            {...personalForm.register("addressLine2")}
            error={!!personalForm.formState.errors.addressLine2}
            helperText={personalForm.formState.errors.addressLine2?.message || " "}
          />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                label="City"
                autoComplete="address-level2"
                {...personalForm.register("addressCity")}
                error={!!personalForm.formState.errors.addressCity}
                helperText={personalForm.formState.errors.addressCity?.message || " "}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                margin="normal"
                fullWidth
                label="State / Region"
                autoComplete="address-level1"
                {...personalForm.register("addressState")}
                error={!!personalForm.formState.errors.addressState}
                helperText={personalForm.formState.errors.addressState?.message || " "}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Postal code"
                autoComplete="postal-code"
                {...personalForm.register("addressPostalCode")}
                error={!!personalForm.formState.errors.addressPostalCode}
                helperText={personalForm.formState.errors.addressPostalCode?.message || " "}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                control={personalForm.control}
                name="addressCountry"
                defaultValue=""
                render={({ field }) => (
                  <CountryAutocomplete
                    required
                    margin="normal"
                    value={field.value || ""}
                    onChange={field.onChange}
                    error={!!personalForm.formState.errors.addressCountry}
                    helperText={personalForm.formState.errors.addressCountry?.message || " "}
                  />
                )}
              />
            </Grid>
          </Grid>

          <Stack direction="row" justifyContent="space-between" sx={{ mt: 3 }}>
            <Button onClick={() => go(S_PATH)} startIcon={<ArrowBack />} variant="text" disabled={submitting}>
              Back
            </Button>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              endIcon={
                submitting ? (
                  <CircularProgress size={18} />
                ) : path === "ATTENDEE" ? undefined : (
                  <ArrowForward />
                )
              }
              sx={{ py: 1.25 }}
            >
              {path === "ATTENDEE"
                ? submitting
                  ? "Finishing up…"
                  : "Finish"
                : "Continue"}
            </Button>
          </Stack>
        </Box>
      )}

      {/* ── Step 3: Organizer type ───────────────────────────────────────── */}
      {step === S_ORGANIZER_TYPE && (
        <Box>
          <Typography variant="h6" gutterBottom fontWeight={600}>
            How would you like to organize?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Individual organizers manage events on their own. Organizations let
            you build a team with scoped permissions.
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <SelectionCard
                selected={organizerType === "INDIVIDUAL"}
                onSelect={() => setOrganizerType("INDIVIDUAL")}
                icon={<Person sx={{ fontSize: 40 }} />}
                title="Individual"
                description="Perfect for solo organizers. You own and manage all your events."
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <SelectionCard
                selected={organizerType === "ORGANIZATION"}
                onSelect={() => setOrganizerType("ORGANIZATION")}
                icon={<Business sx={{ fontSize: 40 }} />}
                title="Organization"
                description="Invite team members, assign roles, and manage events together."
              />
            </Grid>
          </Grid>

          <Stack direction="row" justifyContent="space-between" sx={{ mt: 3 }}>
            <Button onClick={() => go(S_PERSONAL)} startIcon={<ArrowBack />} variant="text" disabled={submitting}>
              Back
            </Button>
            <Button
              onClick={onOrganizerTypeNext}
              variant="contained"
              size="large"
              disabled={submitting}
              endIcon={
                submitting ? (
                  <CircularProgress size={18} />
                ) : organizerType === "INDIVIDUAL" ? undefined : (
                  <ArrowForward />
                )
              }
              sx={{ py: 1.25 }}
            >
              {organizerType === "INDIVIDUAL"
                ? submitting
                  ? "Finishing up…"
                  : "Finish"
                : "Continue"}
            </Button>
          </Stack>
        </Box>
      )}

      {/* ── Step 4: Organization details ────────────────────────────────── */}
      {step === S_ORG_DETAILS && (
        <Box component="form" onSubmit={(e) => void onOrgDetailsNext(e)} noValidate>
          <Typography variant="h6" gutterBottom fontWeight={600}>
            Tell us about your organization
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            You can update these details later from your organizer dashboard.
          </Typography>

          <TextField
            margin="normal"
            required
            fullWidth
            label="Organization name"
            {...orgForm.register("orgName")}
            error={!!orgForm.formState.errors.orgName}
            helperText={orgForm.formState.errors.orgName?.message || " "}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            label="URL slug"
            placeholder="my-organization"
            {...orgForm.register("orgSlug", {
              onChange: () => {
                slugManuallyEdited.current = true;
              },
            })}
            error={!!orgForm.formState.errors.orgSlug}
            helperText={
              orgForm.formState.errors.orgSlug?.message ||
              "Unique identifier used in URLs — lowercase, numbers and hyphens"
            }
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography variant="body2" color="text.secondary">
                      ventry.io/org/
                    </Typography>
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            margin="normal"
            fullWidth
            label="Description"
            multiline
            rows={3}
            {...orgForm.register("orgDescription")}
            error={!!orgForm.formState.errors.orgDescription}
            helperText={orgForm.formState.errors.orgDescription?.message || " "}
          />

          <Stack direction="row" justifyContent="space-between" sx={{ mt: 3 }}>
            <Button onClick={() => go(S_ORGANIZER_TYPE)} startIcon={<ArrowBack />} variant="text" disabled={submitting}>
              Back
            </Button>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              endIcon={submitting ? <CircularProgress size={18} /> : undefined}
              sx={{ py: 1.25 }}
            >
              {submitting ? "Finishing up…" : "Finish"}
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
