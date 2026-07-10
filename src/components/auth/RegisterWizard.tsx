"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
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
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { z } from "zod";
import authClient from "@/lib/auth/client";
import PasswordStrengthMeter from "./PasswordStrengthMeter";
import { DISPLAY_NAME_MAX_LENGTH } from "@/lib/user/display-name";
import { requiredCountryCodeSchema } from "@/types/schemas/country";
import CountryAutocomplete from "@/components/common/CountryAutocomplete";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const accountSchema = z
  .object({
    email: z.string().trim().email("Invalid email address"),
    username: z
      .string()
      .trim()
      .min(3, "Min 3 characters")
      .max(DISPLAY_NAME_MAX_LENGTH, `Max ${DISPLAY_NAME_MAX_LENGTH} characters`),
    password: z
      .string()
      .min(8, "Min 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

const personalSchema = z.object({
  legalName: z.string().trim().min(2, "Required").max(200, "Max 200 characters"),
  addressLine1: z.string().trim().min(2, "Required").max(200, "Max 200 characters"),
  addressLine2: z.string().trim().max(200, "Max 200 characters").optional(),
  addressCity: z.string().trim().min(2, "Required").max(120, "Max 120 characters"),
  addressState: z.string().trim().max(120, "Max 120 characters").optional(),
  addressPostalCode: z.string().trim().min(2, "Required").max(40, "Max 40 characters"),
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

type AccountData = z.infer<typeof accountSchema>;
type PersonalData = z.infer<typeof personalSchema>;
type OrgData = z.infer<typeof orgSchema>;
type Path = "ATTENDEE" | "ORGANIZER";
type OrganizerType = "INDIVIDUAL" | "ORGANIZATION";

// ─── Step indices ─────────────────────────────────────────────────────────────

const S_ACCOUNT = 0;
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
        <Box
          sx={{
            color: selected ? "primary.main" : "text.secondary",
            display: "flex",
          }}
        >
          {icon}
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h6" fontWeight={700}>
            {title}
          </Typography>
          {badge && (
            <Chip label={badge} size="small" color="secondary" variant="outlined" />
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Stack>
    </Paper>
  );
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

export default function RegisterWizard({
  callbackUrl,
}: {
  callbackUrl?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(S_ACCOUNT);
  const [path, setPath] = useState<Path | null>(null);
  const [organizerType, setOrganizerType] = useState<OrganizerType | null>(null);
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [personalData, setPersonalData] = useState<PersonalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pwWarning, setPwWarning] = useState<{
    message: string | null;
    suggestions: string[];
  } | null>(null);

  // Per-step forms
  const accountForm = useForm<AccountData>({
    resolver: zodResolver(accountSchema),
    mode: "onBlur",
  });
  const personalForm = useForm<PersonalData>({
    resolver: zodResolver(personalSchema),
    mode: "onBlur",
  });
  const orgForm = useForm<OrgData>({
    resolver: zodResolver(orgSchema),
    mode: "onBlur",
  });

  const password = accountForm.watch("password");
  const username = accountForm.watch("username") || "";
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

  // Auto-fill slug from org name
  useEffect(() => {
    if (!slugManuallyEdited.current && orgNameValue) {
      orgForm.setValue("orgSlug", generateSlug(orgNameValue), {
        shouldValidate: step === S_ORG_DETAILS,
      });
    }
  }, [orgNameValue, orgForm, generateSlug, step]);

  // Dynamic stepper labels
  const steps = [
    "Account",
    "Your path",
    "Personal details",
    ...(path === "ORGANIZER" ? ["Organizer type"] : []),
    ...(path === "ORGANIZER" && organizerType === "ORGANIZATION"
      ? ["Organization"]
      : []),
  ];

  const go = (n: number) => {
    setError(null);
    setStep(n);
  };

  // ── Step handlers ──────────────────────────────────────────────────────────

  const onAccountNext = accountForm.handleSubmit(async (data) => {
    setError(null);
    try {
      const res = await fetch("/api/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      const { exists } = (await res.json()) as { exists: boolean };
      if (exists) {
        accountForm.setError("email", {
          message: "An account with this email already exists.",
        });
        return;
      }
    } catch {
      // non-blocking
    }
    setAccountData(data);
    go(S_PATH);
  });

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
      void submitAttendee(data);
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
      void submitOrganizer(null);
    } else {
      go(S_ORG_DETAILS);
    }
  };

  const onOrgDetailsNext = orgForm.handleSubmit((data) => {
    void submitOrganizer(data);
  });

  // ── Submit helpers ─────────────────────────────────────────────────────────

  const redirectUrl = callbackUrl
    ? `/login?registered=true&callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/login?registered=true";

  const submitAttendee = async (personal: PersonalData) => {
    if (!accountData) return;
    setSubmitting(true);
    setError(null);
    try {
      const { confirmPassword: _, ...payload } = accountData;
      const { error } = await authClient.signUp.email({
        email: payload.email,
        name: payload.username,
        password: payload.password,
        legalName: personal.legalName,
        addressLine1: personal.addressLine1,
        addressLine2: personal.addressLine2 || null,
        addressCity: personal.addressCity,
        addressState: personal.addressState || null,
        addressPostalCode: personal.addressPostalCode,
        addressCountry: personal.addressCountry,
      });
      if (error) {
        setError(error.message || "Registration failed");
        return;
      }
      router.push(redirectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const submitOrganizer = async (org: OrgData | null) => {
    if (!accountData || !personalData || !organizerType) return;
    setSubmitting(true);
    setError(null);
    try {
      const { confirmPassword: _, ...account } = accountData;
      const res = await fetch("/api/auth/register-organizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: account.email,
          username: account.username,
          password: account.password,
          ...personalData,
          organizerType,
          ...(org
            ? {
                orgName: org.orgName,
                orgSlug: org.orgSlug,
                orgDescription: org.orgDescription,
              }
            : {}),
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error || "Registration failed");
        return;
      }
      router.push(redirectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

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

      {/* ── Step 0: Account ─────────────────────────────────────────────── */}
      {step === S_ACCOUNT && (
        <Box
          component="form"
          onSubmit={(e) => void onAccountNext(e)}
          noValidate
        >
          <TextField
            margin="normal"
            required
            fullWidth
            label="Email"
            autoComplete="email"
            {...accountForm.register("email")}
            error={!!accountForm.formState.errors.email}
            helperText={accountForm.formState.errors.email?.message || " "}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            label="Username"
            autoComplete="username"
            inputProps={{ maxLength: DISPLAY_NAME_MAX_LENGTH }}
            {...accountForm.register("username")}
            error={!!accountForm.formState.errors.username}
            helperText={
              accountForm.formState.errors.username?.message ||
              `${username.length}/${DISPLAY_NAME_MAX_LENGTH}`
            }
          />

          <TextField
            margin="normal"
            required
            fullWidth
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            {...accountForm.register("password")}
            error={!!accountForm.formState.errors.password}
            helperText={accountForm.formState.errors.password?.message || " "}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword((s) => !s)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <PasswordStrengthMeter
            password={password}
            setWarning={setPwWarning}
          />

          {pwWarning?.message && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              <Typography variant="body2">{pwWarning.message}</Typography>
              {pwWarning.suggestions.length > 0 && (
                <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                  {pwWarning.suggestions.map((s) => (
                    <Typography component="li" variant="body2" key={s}>
                      {s}
                    </Typography>
                  ))}
                </Box>
              )}
            </Alert>
          )}

          <TextField
            margin="normal"
            required
            fullWidth
            label="Confirm password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            {...accountForm.register("confirmPassword")}
            error={!!accountForm.formState.errors.confirmPassword}
            helperText={
              accountForm.formState.errors.confirmPassword?.message || " "
            }
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={!!pwWarning}
            endIcon={<ArrowForward />}
            sx={{ mt: 3, mb: 1, py: 1.5 }}
          >
            Continue
          </Button>
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

          <Stack
            direction="row"
            justifyContent="space-between"
            sx={{ mt: 3 }}
          >
            <Button
              onClick={() => go(S_ACCOUNT)}
              startIcon={<ArrowBack />}
              variant="text"
            >
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
        <Box
          component="form"
          onSubmit={(e) => void onPersonalNext(e)}
          noValidate
        >
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
            inputProps={{ maxLength: 200 }}
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
            inputProps={{ maxLength: 200 }}
            {...personalForm.register("addressLine1")}
            error={!!personalForm.formState.errors.addressLine1}
            helperText={
              personalForm.formState.errors.addressLine1?.message || " "
            }
          />

          <TextField
            margin="normal"
            fullWidth
            label="Address line 2"
            autoComplete="address-line2"
            inputProps={{ maxLength: 200 }}
            {...personalForm.register("addressLine2")}
            error={!!personalForm.formState.errors.addressLine2}
            helperText={
              personalForm.formState.errors.addressLine2?.message || " "
            }
          />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                label="City"
                autoComplete="address-level2"
                inputProps={{ maxLength: 120 }}
                {...personalForm.register("addressCity")}
                error={!!personalForm.formState.errors.addressCity}
                helperText={
                  personalForm.formState.errors.addressCity?.message || " "
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                margin="normal"
                fullWidth
                label="State / Region"
                autoComplete="address-level1"
                inputProps={{ maxLength: 120 }}
                {...personalForm.register("addressState")}
                error={!!personalForm.formState.errors.addressState}
                helperText={
                  personalForm.formState.errors.addressState?.message || " "
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Postal code"
                autoComplete="postal-code"
                inputProps={{ maxLength: 40 }}
                {...personalForm.register("addressPostalCode")}
                error={!!personalForm.formState.errors.addressPostalCode}
                helperText={
                  personalForm.formState.errors.addressPostalCode?.message ||
                  " "
                }
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
                    helperText={
                      personalForm.formState.errors.addressCountry?.message || " "
                    }
                  />
                )}
              />
            </Grid>
          </Grid>

          <Stack
            direction="row"
            justifyContent="space-between"
            sx={{ mt: 3 }}
          >
            <Button
              onClick={() => go(S_PATH)}
              startIcon={<ArrowBack />}
              variant="text"
              disabled={submitting}
            >
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
                  ? "Creating account…"
                  : "Create account"
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

          <Stack
            direction="row"
            justifyContent="space-between"
            sx={{ mt: 3 }}
          >
            <Button
              onClick={() => go(S_PERSONAL)}
              startIcon={<ArrowBack />}
              variant="text"
              disabled={submitting}
            >
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
                  ? "Creating account…"
                  : "Create account"
                : "Continue"}
            </Button>
          </Stack>
        </Box>
      )}

      {/* ── Step 4: Organization details ────────────────────────────────── */}
      {step === S_ORG_DETAILS && (
        <Box
          component="form"
          onSubmit={(e) => void onOrgDetailsNext(e)}
          noValidate
        >
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

          <Stack
            direction="row"
            justifyContent="space-between"
            sx={{ mt: 3 }}
          >
            <Button
              onClick={() => go(S_ORGANIZER_TYPE)}
              startIcon={<ArrowBack />}
              variant="text"
              disabled={submitting}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              endIcon={
                submitting ? <CircularProgress size={18} /> : undefined
              }
              sx={{ py: 1.25 }}
            >
              {submitting ? "Creating account…" : "Create account"}
            </Button>
          </Stack>
        </Box>
      )}

      <Box sx={{ mt: 3, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          Already have an account?{" "}
          <Box
            component="a"
            href="/login"
            sx={{ color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
          >
            Sign in
          </Box>
        </Typography>
      </Box>
    </Box>
  );
}
