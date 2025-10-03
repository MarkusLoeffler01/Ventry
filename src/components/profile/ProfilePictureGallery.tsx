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
  Alert
} from '@mui/material';
import {
  Close,
  CloudUpload,
  Edit
} from '@mui/icons-material';
import Image from 'next/image';

interface ProfilePictureGalleryProps {
  currentPicture?: string | null;
  userName?: string;
  userEmail?: string;
  onPictureUpdate: (url: string) => void;
}

export default function ProfilePictureGallery({ 
  currentPicture, 
  userName, 
  userEmail, 
  onPictureUpdate 
}: ProfilePictureGalleryProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // Replace with actual upload logic (example using fetch to upload to /api/upload)
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
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

      onPictureUpdate(data.url);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
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
            {currentPicture ? (
              <Image
                src={currentPicture}
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

      {/* Upload Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Change Profile Picture
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

          <Box sx={{ textAlign: 'center', py: 4 }}>
            {currentPicture && (
              <Avatar sx={{ width: 100, height: 100, margin: '0 auto', mb: 3 }}>
                <Image
                  src={currentPicture}
                  alt="Current Profile"
                  width={100}
                  height={100}
                  style={{ objectFit: 'cover' }}
                />
              </Avatar>
            )}

            <Button
              variant="contained"
              component="label"
              startIcon={<CloudUpload />}
              disabled={uploading}
              size="large"
            >
              {uploading ? 'Uploading...' : 'Choose New Picture'}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => { void handleFileUpload(e); }}
              />
            </Button>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Supported formats: JPG, PNG, GIF (max 5MB)
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}