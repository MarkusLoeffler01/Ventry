"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Box,
  IconButton,
  Avatar,
  Typography,
  Alert,
  Card,
  CardMedia,
  Chip,
  Stack
} from '@mui/material';
import {
  Close,
  CloudUpload,
  Edit,
  Delete,
  Star,
  StarBorder
} from '@mui/icons-material';
import Image from 'next/image';

interface ProfilePicture {
  id: string;
  signedUrl?: string | null;
  storagePath?: string | null;
  isPrimary: boolean;
  createdAt: Date;
}

interface ProfilePictureGalleryProps {
  userId: string;
  profilePictures: ProfilePicture[];
  userName?: string;
  userEmail?: string;
  onPicturesUpdate: () => void | Promise<void>;
}

export default function ProfilePictureGallery({ 
  userId: _userId,
  profilePictures,
  userName, 
  userEmail, 
  onPicturesUpdate 
}: ProfilePictureGalleryProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPictureId, setSelectedPictureId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [settingPrimary, setSettingPrimary] = useState(false);

  const primaryPicture = profilePictures.find(pic => pic.isPrimary) || profilePictures[0];
  const selectedPicture = selectedPictureId ? profilePictures.find(pic => pic.id === selectedPictureId) : null;

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setError(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('isPrimary', profilePictures.length === 0 ? 'true' : 'false');

      const response = await fetch('/api/user/profile-picture', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      if (!data.url) {
        throw new Error('No image URL returned');
      }

      await onPicturesUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSetPrimary = async (pictureId?: string) => {
    const id = pictureId || selectedPictureId;
    if (!id) return;

    setSettingPrimary(true);
    setError(null);

    try {
      const response = await fetch('/api/user/profile-picture', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profilePictureId: id }),
      });

      if (!response.ok) {
        throw new Error('Failed to set primary picture');
      }

      await onPicturesUpdate();
      setSelectedPictureId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set primary picture');
    } finally {
      setSettingPrimary(false);
    }
  };

  const handleDeletePicture = async (pictureId?: string) => {
    const id = pictureId || selectedPictureId;
    if (!id) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/user/profile-picture?profilePictureId=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete picture');
      }

      await onPicturesUpdate();
      setSelectedPictureId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete picture');
    } finally {
      setDeleting(false);
    }
  };

  const getInitials = () => {
    if (userName) return userName[0].toUpperCase();
    if (userEmail) return userEmail[0].toUpperCase();
    return '?';
  };

  return (
    <>
      {/* Profile Picture Display */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ position: 'relative' }}>
          <Avatar
            sx={{ width: 120, height: 120, cursor: 'pointer' }}
            onClick={handleOpen}
          >
            {primaryPicture?.signedUrl ? (
              <Image
                src={primaryPicture.signedUrl}
                alt="Profile"
                width={120}
                height={120}
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <Typography variant="h2">
                {getInitials()}
              </Typography>
            )}
          </Avatar>
          
          <IconButton
            sx={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' }
            }}
            onClick={handleOpen}
            size="small"
          >
            <Edit />
          </IconButton>
        </Box>

        <Box>
          <Typography variant="h6">Profile Picture</Typography>
          <Typography variant="body2" color="text.secondary">
            Click to change your profile picture
          </Typography>
        </Box>
      </Box>

      {/* Profile Picture Gallery Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Profile Picture Gallery
          <IconButton onClick={handleClose}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Gallery Grid */}
          {profilePictures.length > 0 ? (
            <Box 
              sx={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: 2,
                mb: 3
              }}
            >
              {profilePictures.map((picture) => (
                <Card 
                  key={picture.id}
                  sx={{ 
                    cursor: 'pointer',
                    border: selectedPictureId === picture.id ? '2px solid' : '1px solid',
                    borderColor: selectedPictureId === picture.id ? 'primary.main' : 'divider',
                    position: 'relative'
                  }}
                  onClick={() => setSelectedPictureId(picture.id)}
                >
                  <CardMedia
                    component="div"
                    sx={{ 
                      height: 120,
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {picture.signedUrl ? (
                      <Image
                        src={picture.signedUrl}
                        alt="Profile picture"
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <Box 
                        sx={{ 
                          height: '100%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          bgcolor: 'grey.200'
                        }}
                      >
                        <Typography>{getInitials()}</Typography>
                      </Box>
                    )}
                  </CardMedia>
                  
                  {/* Primary Badge */}
                  {picture.isPrimary && (
                    <Chip
                      label="Primary"
                      color="primary"
                      size="small"
                      icon={<Star />}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        fontSize: '0.7rem'
                      }}
                    />
                  )}
                </Card>
              ))}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Avatar sx={{ width: 80, height: 80, margin: '0 auto', mb: 2, bgcolor: 'grey.200' }}>
                <Typography variant="h4">{getInitials()}</Typography>
              </Avatar>
              <Typography variant="h6" gutterBottom>No profile pictures yet</Typography>
              <Typography variant="body2" color="text.secondary">
                Upload your first profile picture to get started
              </Typography>
            </Box>
          )}

          {/* Selected Picture Info */}
          {selectedPicture && (
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Selected Picture
                {selectedPicture.isPrimary && (
                  <Chip label="Primary" size="small" color="primary" sx={{ ml: 1 }} />
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Uploaded: {new Date(selectedPicture.createdAt).toLocaleDateString()}
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ flexDirection: 'column', gap: 2, p: 3 }}>
          {/* Action Buttons */}
          <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
            {/* Upload New Picture */}
            <Button
              variant="contained"
              component="label"
              startIcon={<CloudUpload />}
              disabled={uploading}
              sx={{ flex: 1 }}
            >
              {uploading ? 'Uploading...' : 'Upload New'}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => { void handleFileUpload(e); }}
              />
            </Button>

            {/* Set as Primary */}
            <Button
              variant="outlined"
              startIcon={<StarBorder />}
              disabled={!selectedPictureId || selectedPicture?.isPrimary || settingPrimary}
              onClick={() => void handleSetPrimary()}
              sx={{ flex: 1 }}
            >
              {settingPrimary ? 'Setting...' : 'Set Primary'}
            </Button>

            {/* Delete Picture */}
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              disabled={!selectedPictureId || deleting || profilePictures.length <= 1}
              onClick={() => void handleDeletePicture()}
              sx={{ flex: 1 }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </Stack>

          {/* Help Text */}
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            Supported formats: JPG, PNG, GIF (max 5MB) • Click on a picture to select it
          </Typography>

          {/* Close Button */}
          <Button onClick={handleClose} sx={{ mt: 1 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}