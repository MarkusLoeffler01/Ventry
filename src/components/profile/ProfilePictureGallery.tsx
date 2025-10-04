"use client";

import { useState, useCallback, useEffect } from 'react';
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
  Stack,
  Fade,
  Paper
} from '@mui/material';
import {
  Close,
  CloudUpload,
  Edit,
  Delete,
  Star,
  StarBorder,
  ChevronLeft,
  ChevronRight,
  DragIndicator
} from '@mui/icons-material';
import Image from 'next/image';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

// Sortable Item Component for drag-and-drop
interface SortableItemProps {
  picture: ProfilePicture;
  index: number;
  isSelected: boolean;
  onImageClick: (index: number) => void;
  onSelectForAction: (id: string) => void;
  getInitials: () => string;
}

function SortableItem({ 
  picture, 
  index, 
  isSelected, 
  onImageClick, 
  onSelectForAction,
  getInitials 
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: picture.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{
        cursor: isDragging ? 'grabbing' : 'grab',
        border: isSelected ? '2px solid' : '1px solid',
        borderColor: isSelected ? 'primary.main' : 'divider',
        position: 'relative',
        touchAction: 'none',
      }}
    >
      {/* Drag Handle */}
      <Box
        {...attributes}
        {...listeners}
        sx={{
          position: 'absolute',
          top: 4,
          left: 4,
          zIndex: 2,
          bgcolor: 'rgba(0, 0, 0, 0.5)',
          borderRadius: 1,
          p: 0.5,
          cursor: 'grab',
          '&:active': {
            cursor: 'grabbing',
          },
        }}
      >
        <DragIndicator sx={{ color: 'white', fontSize: '1.2rem' }} />
      </Box>

      <Box
        onClick={(e) => {
          // Right click or ctrl+click to select for actions
          if (e.ctrlKey || e.metaKey || (e as unknown as React.MouseEvent).button === 2) {
            onSelectForAction(picture.id);
          } else {
            // Normal click opens overlay
            onImageClick(index);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onSelectForAction(picture.id);
        }}
      >
        <CardMedia
          component="div"
          sx={{
            height: 120,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {picture.signedUrl ? (
            <Image
              src={picture.signedUrl}
              alt="Profile picture"
              fill
              style={{ objectFit: 'cover' }}
              unoptimized={true}
            />
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.200',
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
              bottom: 8,
              left: 8,
            }}
          />
        )}
      </Box>
    </Card>
  );
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
  
  // Overlay gallery state
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Drag-and-drop state
  const [orderedPictures, setOrderedPictures] = useState<ProfilePicture[]>(profilePictures);
  const [_reordering, setReordering] = useState(false);

  // Update ordered pictures when profilePictures changes
  useEffect(() => {
    setOrderedPictures(profilePictures);
  }, [profilePictures]);

  const primaryPicture = orderedPictures.find(pic => pic.isPrimary) || orderedPictures[0];
  const selectedPicture = selectedPictureId ? orderedPictures.find(pic => pic.id === selectedPictureId) : null;
  const currentPicture = orderedPictures[currentIndex];

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setError(null);
  };

  // Handle drag end event
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = orderedPictures.findIndex(pic => pic.id === active.id);
    const newIndex = orderedPictures.findIndex(pic => pic.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const newOrder = arrayMove(orderedPictures, oldIndex, newIndex);
    setOrderedPictures(newOrder);
    setReordering(true);

    // Save new order to API asynchronously
    void (async () => {
      try {
        const response = await fetch('/api/user/profile-picture/reorder', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pictureIds: newOrder.map(pic => pic.id)
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save picture order');
        }

        // Refresh pictures to ensure consistency
        await onPicturesUpdate();
      } catch (err) {
        console.error('Error reordering pictures:', err);
        setError('Failed to save picture order');
        // Revert to original order on error
        setOrderedPictures(profilePictures);
      } finally {
        setReordering(false);
      }
    })();
  }, [orderedPictures, onPicturesUpdate, profilePictures]);

  // Overlay gallery handlers
  const handleImageClick = (index: number) => {
    setCurrentIndex(index);
    setOverlayOpen(true);
  };

  const handleOverlayClose = useCallback(() => {
    setOverlayOpen(false);
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % profilePictures.length);
  }, [profilePictures.length]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? profilePictures.length - 1 : prevIndex - 1
    );
  }, [profilePictures.length]);

  // Keyboard navigation for overlay
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!overlayOpen) return;
      
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrevious();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        handleOverlayClose();
      }
    };

    if (overlayOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [overlayOpen, handleNext, handlePrevious, handleOverlayClose]);

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

          {/* Helper text for drag-and-drop */}
          {orderedPictures.length > 1 && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: 'info.lighter', borderRadius: 1 }}>
              <Typography variant="body2" color="info.main">
                💡 Drag and drop pictures to rearrange their order
              </Typography>
            </Box>
          )}

          {/* Gallery Grid with Drag-and-Drop */}
          {orderedPictures.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedPictures.map(pic => pic.id)}
                strategy={rectSortingStrategy}
              >
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: 2,
                    mb: 3,
                  }}
                >
                  {orderedPictures.map((picture, index) => (
                    <SortableItem
                      key={picture.id}
                      picture={picture}
                      index={index}
                      isSelected={selectedPictureId === picture.id}
                      onImageClick={handleImageClick}
                      onSelectForAction={setSelectedPictureId}
                      getInitials={getInitials}
                    />
                  ))}
                </Box>
              </SortableContext>
            </DndContext>
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
            Supported formats: JPG, PNG, GIF (max 5MB) • Click to view • Ctrl+Click to select
          </Typography>

          {/* Close Button */}
          <Button onClick={handleClose} sx={{ mt: 1 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Full-Screen Overlay Gallery */}
      <Dialog
        open={overlayOpen}
        onClose={handleOverlayClose}
        maxWidth={false}
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            bgcolor: 'rgba(0, 0, 0, 0.95)',
            boxShadow: 'none',
            maxWidth: '100vw',
            maxHeight: '100vh',
            margin: 0,
            borderRadius: 0
          },
          '& .MuiBackdrop-root': {
            bgcolor: 'rgba(0, 0, 0, 0.9)'
          }
        }}
      >
        <DialogContent
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            p: 0,
            height: '100vh',
            overflow: 'hidden'
          }}
        >
          {/* Action Buttons */}
          <Box
            sx={{
              position: 'absolute',
              top: 20,
              left: 20,
              display: 'flex',
              gap: 1,
              zIndex: 1
            }}
          >
            <IconButton
              onClick={() => void handleSetPrimary(currentPicture?.id)}
              disabled={currentPicture?.isPrimary || settingPrimary}
              sx={{
                color: 'white',
                bgcolor: currentPicture?.isPrimary ? 'rgba(255, 215, 0, 0.3)' : 'rgba(0, 0, 0, 0.5)',
                '&:hover': {
                  bgcolor: currentPicture?.isPrimary ? 'rgba(255, 215, 0, 0.4)' : 'rgba(0, 0, 0, 0.7)'
                },
                '&:disabled': {
                  color: 'rgba(255, 255, 255, 0.3)',
                  bgcolor: 'rgba(0, 0, 0, 0.3)'
                }
              }}
              title={currentPicture?.isPrimary ? 'Primary Photo' : 'Set as Primary'}
            >
              {currentPicture?.isPrimary ? <Star /> : <StarBorder />}
            </IconButton>

            <IconButton
              onClick={() => void handleDeletePicture(currentPicture?.id)}
              disabled={profilePictures.length <= 1 || deleting}
              sx={{
                color: 'white',
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                '&:hover': {
                  bgcolor: 'rgba(211, 47, 47, 0.7)'
                },
                '&:disabled': {
                  color: 'rgba(255, 255, 255, 0.3)',
                  bgcolor: 'rgba(0, 0, 0, 0.3)'
                }
              }}
              title="Delete Photo"
            >
              <Delete />
            </IconButton>
          </Box>

          {/* Close Button */}
          <IconButton
            onClick={handleOverlayClose}
            sx={{
              position: 'absolute',
              top: 20,
              right: 20,
              color: 'white',
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1,
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.7)'
              }
            }}
          >
            <Close />
          </IconButton>

          {/* Previous Button */}
          <IconButton
            onClick={handlePrevious}
            sx={{
              position: 'absolute',
              left: 20,
              color: 'white',
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1,
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.7)'
              }
            }}
          >
            <ChevronLeft sx={{ fontSize: '2rem' }} />
          </IconButton>

          {/* Next Button */}
          <IconButton
            onClick={handleNext}
            sx={{
              position: 'absolute',
              right: 20,
              color: 'white',
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1,
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.7)'
              }
            }}
          >
            <ChevronRight sx={{ fontSize: '2rem' }} />
          </IconButton>

          {/* Main Image */}
          <Fade in={overlayOpen} timeout={300}>
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {currentPicture?.signedUrl ? (
                <Box
                  sx={{
                    position: 'relative',
                    width: '90vw',
                    height: '90vh',
                    maxWidth: '90vw',
                    maxHeight: '90vh'
                  }}
                >
                  <Image
                    src={currentPicture.signedUrl}
                    alt={`Profile picture ${currentIndex + 1}`}
                    fill
                    sizes="(max-width: 768px) 90vw, (max-width: 1200px) 80vw, 70vw"
                    style={{
                      objectFit: 'contain',
                      borderRadius: '8px'
                    }}
                    priority
                  />
                  
                  {/* Primary Badge */}
                  {currentPicture.isPrimary && (
                    <Paper
                      elevation={3}
                      sx={{
                        position: 'absolute',
                        top: 16,
                        left: 16,
                        px: 2,
                        py: 1,
                        bgcolor: 'primary.main',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        borderRadius: 2
                      }}
                    >
                      <Star sx={{ fontSize: '1rem' }} />
                      <Typography variant="caption" fontWeight="bold">
                        Primary Photo
                      </Typography>
                    </Paper>
                  )}
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'grey.800',
                    borderRadius: 2,
                    width: 400,
                    height: 400,
                    color: 'white'
                  }}
                >
                  <Typography variant="h2">
                    {getInitials()}
                  </Typography>
                </Box>
              )}
            </Box>
          </Fade>

          {/* Image Counter */}
          <Paper
            elevation={3}
            sx={{
              position: 'absolute',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              px: 2,
              py: 1,
              bgcolor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              borderRadius: 2
            }}
          >
            <Typography variant="body2">
              {currentIndex + 1} of {profilePictures.length}
            </Typography>
          </Paper>

          {/* Thumbnail Strip */}
          <Stack
            direction="row"
            spacing={1}
            sx={{
              position: 'absolute',
              bottom: 80,
              left: '50%',
              transform: 'translateX(-50%)',
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: 2,
              p: 1,
              maxWidth: '80vw',
              overflowX: 'auto'
            }}
          >
            {profilePictures.map((picture, index) => (
              <Box
                key={picture.id}
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: 1,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: currentIndex === index ? '2px solid white' : '2px solid transparent',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    border: '2px solid rgba(255, 255, 255, 0.7)'
                  }
                }}
                onClick={() => setCurrentIndex(index)}
              >
                {picture.signedUrl ? (
                  <Image
                    src={picture.signedUrl}
                    alt={`Thumbnail ${index + 1}`}
                    width={60}
                    height={60}
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'grey.600',
                      color: 'white'
                    }}
                  >
                    <Typography variant="caption">
                      {getInitials()}
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}