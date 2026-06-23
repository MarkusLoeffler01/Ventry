"use client";

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  MenuItem,
  Stack,
  Chip,
  Card,
  CardContent,
  CardActions,
  InputAdornment
} from '@mui/material';
import {
  Save,
  Delete,
  Download,
  Visibility,
  VisibilityOff,
  Telegram,
  Twitter,
  PhotoCamera
} from '@mui/icons-material';
import ProfilePictureGallery from './ProfilePictureGallery';
import LinkedAccounts from './LinkedAccounts';
import MyRegistrations from './MyRegistrations';
import { COUNTRIES } from '@/lib/countries';

interface ProfilePicture {
  id: string;
  signedUrl?: string | null;
  storagePath?: string | null;
  isPrimary: boolean;
  createdAt: Date;
}

interface SocialLinks {
  telegram?: string;
  twitter?: string;
  instagram?: string;
}

interface User {
  id: string;
  name?: string | null;
  email: string;
  country?: string | null;
  legalName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressPostalCode?: string | null;
  addressCountry?: string | null;
  profilePictures: ProfilePicture[];
  accounts: Array<{
    providerId: string;
    password?: string | null;
  }>;
  bio?: string | null;
  dateOfBirth?: Date | null;
  pronouns?: string | null;
  showAge: boolean;
  showExactBirthdate: boolean;
  socialLinks?: SocialLinks | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ProfilePageClientProps {
  user: User;
}

interface ProfileFormData {
  name: string;
  country: string;
  legalName: string;
  addressLine1: string;
  addressLine2: string;
  addressCity: string;
  addressState: string;
  addressPostalCode: string;
  addressCountry: string;
  bio: string;
  dateOfBirth: string;
  pronouns: string;
  showAge: boolean;
  showExactBirthdate: boolean;
  customPronouns?: string;
  socialLinks: {
    telegram: string;
    twitter: string;
    instagram: string;
  };
}

const PRONOUN_OPTIONS = [
  'she/her',
  'he/him',
  'they/them',
  'she/they',
  'he/they',
  'any pronouns',
  'ask me',
  'prefer not to say',
  'choose my own pronouns'
];

export default function ProfilePageClient({ user }: ProfilePageClientProps) {
  const socialLinks = (user.socialLinks as SocialLinks | null | undefined) ?? {};
  const [formData, setFormData] = useState<ProfileFormData>({
    name: user.name || '',
    country: user.country || '',
    legalName: user.legalName || '',
    addressLine1: user.addressLine1 || '',
    addressLine2: user.addressLine2 || '',
    addressCity: user.addressCity || '',
    addressState: user.addressState || '',
    addressPostalCode: user.addressPostalCode || '',
    addressCountry: user.addressCountry || '',
    bio: user.bio || '',
    dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
    pronouns: user.pronouns || '',
    showAge: user.showAge ?? true,
    showExactBirthdate: user.showExactBirthdate ?? false,
    customPronouns: user.pronouns && !PRONOUN_OPTIONS.includes(user.pronouns) ? user.pronouns : undefined,
    socialLinks: {
      telegram: socialLinks.telegram || '',
      twitter: socialLinks.twitter || '',
      instagram: socialLinks.instagram || '',
    }
  });

  const [profilePictures, setProfilePictures] = useState<ProfilePicture[]>(user.profilePictures);

  const refreshProfilePictures = async () => {
    try {
      const response = await fetch(`/api/user/profile-picture?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setProfilePictures(data.profilePictures || []);
      }
    } catch (error) {
      console.error('Failed to refresh profile pictures:', error);
    }
  };

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('linked') === 'success') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- URL param check must run in effect
      setLinkSuccess(true);
      window.history.replaceState({}, '', '/profile');
      setTimeout(() => setLinkSuccess(false), 5000);
    }
  }, []);

  const handleInputChange = (field: keyof ProfileFormData) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.type === 'checkbox' ? (event.target as HTMLInputElement).checked : event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSocialChange = (platform: keyof ProfileFormData['socialLinks']) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/^@/, '');
    setFormData(prev => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [platform]: value }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const socialLinksPayload: SocialLinks = {};
    if (formData.socialLinks.telegram) socialLinksPayload.telegram = formData.socialLinks.telegram;
    if (formData.socialLinks.twitter) socialLinksPayload.twitter = formData.socialLinks.twitter;
    if (formData.socialLinks.instagram) socialLinksPayload.instagram = formData.socialLinks.instagram;

    try {
      const response = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          name: formData.name,
          country: formData.country || null,
          legalName: formData.legalName || null,
          addressLine1: formData.addressLine1 || null,
          addressLine2: formData.addressLine2 || null,
          addressCity: formData.addressCity || null,
          addressState: formData.addressState || null,
          addressPostalCode: formData.addressPostalCode || null,
          addressCountry: formData.addressCountry || null,
          bio: formData.bio,
          dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : undefined,
          pronouns: formData.pronouns,
          showAge: formData.showAge,
          showExactBirthdate: formData.showExactBirthdate,
          socialLinks: socialLinksPayload,
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch(`/api/user?userId=${user.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    }
  };

  const handleDownloadData = async () => {
    try {
      const response = await fetch(`/api/user/export?userId=${user.id}`);

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${user.name || 'user'}-data-export.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    }
  };

  const calculateAge = (birthDate: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  return (
    <Stack spacing={4}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(false)}>
          Profile updated successfully!
        </Alert>
      )}

      {linkSuccess && (
        <Alert severity="success" onClose={() => setLinkSuccess(false)}>
          Account linked successfully!
        </Alert>
      )}

      {/* Profile Picture Section */}
      <Box>
        <Typography variant="h5" gutterBottom>
          Profile Pictures
        </Typography>
        <ProfilePictureGallery
          userId={user.id}
          profilePictures={profilePictures}
          userName={formData.name}
          userEmail={user.email}
          onPicturesUpdate={refreshProfilePictures}
        />
      </Box>

      <Divider />

      {/* Basic Information */}
      <Box>
        <Typography variant="h5" gutterBottom>
          Basic Information
        </Typography>

        <Stack spacing={3}>
          <TextField
            label="Display Name"
            value={formData.name}
            onChange={handleInputChange('name')}
            fullWidth
            helperText="This is how others will see you — also used in your profile URL"
          />

          <TextField
            label="Country"
            value={formData.country}
            onChange={handleInputChange('country')}
            select
            fullWidth
            helperText="Shown on your profile with a flag"
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {COUNTRIES.map((c) => (
              <MenuItem key={c.code} value={c.code}>
                {String.fromCodePoint(0x1f1e6 + c.code.charCodeAt(0) - 65)}{String.fromCodePoint(0x1f1e6 + c.code.charCodeAt(1) - 65)} {c.name}
              </MenuItem>
            ))}
          </TextField>

          <Divider />

          <Typography variant="h6">
            Check-in Identity
          </Typography>

          <TextField
            label="Legal Name"
            value={formData.legalName}
            onChange={handleInputChange('legalName')}
            fullWidth
            helperText="Used by event staff for ID checks."
          />

          <TextField
            label="Address"
            value={formData.addressLine1}
            onChange={handleInputChange('addressLine1')}
            fullWidth
            autoComplete="street-address"
          />

          <TextField
            label="Address line 2"
            value={formData.addressLine2}
            onChange={handleInputChange('addressLine2')}
            fullWidth
            autoComplete="address-line2"
          />

          <TextField
            label="City"
            value={formData.addressCity}
            onChange={handleInputChange('addressCity')}
            fullWidth
            autoComplete="address-level2"
          />

          <TextField
            label="State/Region"
            value={formData.addressState}
            onChange={handleInputChange('addressState')}
            fullWidth
            autoComplete="address-level1"
          />

          <TextField
            label="Postal code"
            value={formData.addressPostalCode}
            onChange={handleInputChange('addressPostalCode')}
            fullWidth
            autoComplete="postal-code"
          />

          <TextField
            label="Address country"
            value={formData.addressCountry}
            onChange={handleInputChange('addressCountry')}
            fullWidth
            autoComplete="country-name"
          />

          <Divider />

          <TextField
            label="Bio"
            value={formData.bio}
            onChange={handleInputChange('bio')}
            multiline
            rows={4}
            fullWidth
            placeholder="Tell us about yourself..."
            inputProps={{ maxLength: 500 }}
            helperText={`${formData.bio.length}/500 characters`}
          />

          <TextField
            label="Date of Birth"
            type="date"
            value={formData.dateOfBirth}
            onChange={handleInputChange('dateOfBirth')}
            fullWidth
            helperText="Your age will only be shown if you enable it in privacy settings"
            InputLabelProps={{ shrink: true }}
          />

          {formData.dateOfBirth && !Number.isNaN(new Date(formData.dateOfBirth).getTime()) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={`Age: ${calculateAge(new Date(formData.dateOfBirth))}`}
                color={formData.showAge ? 'primary' : 'default'}
                icon={formData.showAge ? <Visibility /> : <VisibilityOff />}
              />
              <Typography variant="body2" color="text.secondary">
                {formData.showAge ? 'Visible to others' : 'Hidden from others'}
              </Typography>
            </Box>
          )}

          <TextField
            label="Pronouns"
            value={formData.pronouns}
            onChange={handleInputChange('pronouns')}
            select
            fullWidth
            helperText="Help others know how to refer to you"
          >
            {PRONOUN_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          {formData.pronouns === "choose my own pronouns" && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Custom Pronouns
              </Typography>
              <TextField type='text' value={formData.customPronouns} onChange={handleInputChange('customPronouns')} />
            </Box>
          )}
        </Stack>
      </Box>

      <Divider />

      {/* Social Links */}
      <Box>
        <Typography variant="h5" gutterBottom>
          Social Links
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter your usernames (without @). They will appear as clickable chips on your profile.
        </Typography>

        <Stack spacing={2}>
          <TextField
            label="Telegram"
            value={formData.socialLinks.telegram}
            onChange={handleSocialChange('telegram')}
            fullWidth
            placeholder="username"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Telegram color="action" />
                </InputAdornment>
              )
            }}
            helperText="https://t.me/username"
          />
          <TextField
            label="Twitter / X"
            value={formData.socialLinks.twitter}
            onChange={handleSocialChange('twitter')}
            fullWidth
            placeholder="username"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Twitter color="action" />
                </InputAdornment>
              )
            }}
            helperText="https://x.com/username"
          />
          <TextField
            label="Instagram"
            value={formData.socialLinks.instagram}
            onChange={handleSocialChange('instagram')}
            fullWidth
            placeholder="username"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PhotoCamera color="action" />
                </InputAdornment>
              )
            }}
            helperText="https://instagram.com/username"
          />
        </Stack>
      </Box>

      <Divider />

      {/* Privacy Settings */}
      <Box>
        <Typography variant="h5" gutterBottom>
          Privacy Settings
        </Typography>

        <Stack spacing={2}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.showAge}
                onChange={(e) => setFormData(prev => ({ ...prev, showAge: e.target.checked }))}
              />
            }
            label="Show my age publicly"
          />
          <Typography variant="body2" color="text.secondary">
            When enabled, your age will be visible to other users.
          </Typography>

          {formData.showAge && (
            <>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.showExactBirthdate}
                    onChange={(e) => setFormData(prev => ({ ...prev, showExactBirthdate: e.target.checked }))}
                  />
                }
                label="Show exact birth date (not just age)"
              />
              <Typography variant="body2" color="text.secondary">
                When enabled, your exact birth date is shown in addition to your age.
              </Typography>
            </>
          )}
        </Stack>
      </Box>

      <Divider />

      {/* My Registrations */}
      <Box>
        <Typography variant="h5" gutterBottom>
          My Registrations
        </Typography>
        <MyRegistrations userId={user.id} />
      </Box>

      <Divider />

      {/* Linked Accounts */}
      <Box>
        <LinkedAccounts
          accounts={user.accounts}
          hasPassword={!!user.accounts.find(a => a.providerId === 'credential')?.password}
          hasOAuthProviders={user.accounts.some(a => a.providerId === 'github' || a.providerId === 'google')}
        />
      </Box>

      <Divider />

      {/* Account Actions */}
      <Box>
        <Typography variant="h5" gutterBottom>
          Account Management
        </Typography>

        <Stack spacing={2}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Download Your Data
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Export all your personal data as required by GDPR. This includes your profile, events, and any other data we have stored.
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => setDownloadDialogOpen(true)}
              >
                Download Data
              </Button>
            </CardActions>
          </Card>

          <Card variant="outlined" sx={{ borderColor: 'error.main' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="error">
                Delete Account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Permanently delete your account and all associated data.
              </Typography>
              <Typography variant="h4" color="error" sx={{ mt: 1 }}>
                ⚠️This action cannot be undone⚠️
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete Account
              </Button>
            </CardActions>
          </Card>
        </Stack>
      </Box>

      {/* Save Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<Save />}
          onClick={() => {
            handleSave().catch(err => {
              setError(err instanceof Error ? err.message : 'Failed to update profile');
            });
          }}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>

      <DeleteAccountDialog onClose={() => setDeleteDialogOpen(false)} onDelete={handleDeleteAccount} open={deleteDialogOpen} userEmail={user.email} />

      <Dialog open={downloadDialogOpen} onClose={() => setDownloadDialogOpen(false)}>
        <DialogTitle>Download Your Data</DialogTitle>
        <DialogContent>
          <Typography>
            We will prepare a JSON file containing all your personal data. This includes:
          </Typography>
          <ul>
            <li>Profile information</li>
            <li>Event registrations</li>
            <li>Payment history</li>
            <li>Account settings</li>
          </ul>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDownloadDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              handleDownloadData().catch(err => {
                setError(err instanceof Error ? err.message : 'Failed to export data');
              });
            }}
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function DeleteAccountDialog({
  open,
  userEmail,
  onClose,
  onDelete
}: {
  open: boolean;
  userEmail: string;
  onClose: () => void;
  onDelete: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    const value = inputRef.current?.value.trim();
    if (value !== userEmail) {
      setError('Email does not match');
      return;
    }

    setError(null);
    setIsDeleting(true);

    try {
      await onDelete();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete account';
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby='delete-dialog-title'>
      <DialogTitle>Delete Account</DialogTitle>

      <DialogContent>
        <Typography>
          Are you sure you want to delete your account? This will permanently remove all your data and cannot be undone.
        </Typography>

        <Typography sx={{ mt: 2, fontWeight: 'bold' }}>
          Type &quot;{userEmail}&quot; to confirm:
        </Typography>

        <TextField
          fullWidth
          inputRef={inputRef}
          sx={{ mt: 1 }}
          error={!!error}
          placeholder={userEmail}
          helperText={error || 'This action cannot be undone'}
          disabled={isDeleting}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button
          color="error"
          variant="contained"
          onClick={() => void handleConfirmDelete()}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete Account'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
