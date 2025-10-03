"use client";

import { useState } from 'react';
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
  CardActions
} from '@mui/material';
import {
  Save,
  Delete,
  Download,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import ProfilePictureGallery from './ProfilePictureGallery';

interface ProfilePicture {
  id: string;
  signedUrl?: string | null;
  storagePath?: string | null;
  isPrimary: boolean;
  createdAt: Date;
}

interface User {
  id: string;
  name?: string | null;
  email: string;
  profilePictures: ProfilePicture[];
  bio?: string | null;
  dateOfBirth?: Date | null;
  pronouns?: string | null;
  showAge?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ProfilePageClientProps {
  user: User;
}

interface ProfileFormData {
  name: string;
  bio: string;
  dateOfBirth: string;
  pronouns: string;
  showAge: boolean;
}

const PRONOUN_OPTIONS = [
  'she/her',
  'he/him', 
  'they/them',
  'she/they',
  'he/they',
  'any pronouns',
  'ask me',
  'prefer not to say'
];

export default function ProfilePageClient({ user }: ProfilePageClientProps) {
  const [formData, setFormData] = useState<ProfileFormData>({
    name: user.name || '',
    bio: user.bio || '',
    dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
    pronouns: user.pronouns || '',
    showAge: user.showAge ?? true
  });

  // Manage profile pictures state locally
  const [profilePictures, setProfilePictures] = useState<ProfilePicture[]>(user.profilePictures);

  // Function to refresh profile pictures from API
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);

  const handleInputChange = (field: keyof ProfileFormData) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.type === 'checkbox' ? (event.target as HTMLInputElement).checked : event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          name: formData.name,
          bio: formData.bio,
          dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null,
          pronouns: formData.pronouns,
          showAge: formData.showAge
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

      // Redirect to home page after successful deletion
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
        {/* Alerts */}
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
              helperText="This is how others will see you on the platform"
            />

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

            {formData.dateOfBirth && (
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
              When enabled, your age will be visible to other users. When disabled, only you can see your age.
            </Typography>
          </Stack>
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
                  Permanently delete your account and all associated data. This action cannot be undone.
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

        {/* Confirmation Dialogs */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Account</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete your account? This will permanently remove all your data and cannot be undone.
            </Typography>
            <Typography sx={{ mt: 2, fontWeight: 'bold' }}>
              Type &quot;{user.email}&quot; to confirm:
            </Typography>
            <TextField
              fullWidth
              sx={{ mt: 1 }}
              id="delete-confirmation"
              placeholder={user.email}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button 
              color="error" 
              variant="contained"
              onClick={() => {
                const input = document.getElementById('delete-confirmation') as HTMLInputElement;
                if (input?.value === user.email) {
                  try {
                    handleDeleteAccount()
                      .catch(err => {
                        setError(err instanceof Error ? err.message : 'Failed to delete account');
                      });
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to delete account');
                  }
                }
              }}
            >
              Delete Account
            </Button>
          </DialogActions>
        </Dialog>

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