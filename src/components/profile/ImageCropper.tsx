"use client";

import { useState } from 'react';
import Cropper from 'react-easy-crop';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Slider,
  Stack,
  IconButton
} from '@mui/material';
import { Close, ZoomIn, ZoomOut } from '@mui/icons-material';

interface Point {
  x: number;
  y: number;
}

interface Area {
  width: number;
  height: number;
  x: number;
  y: number;
}

interface ImageCropperProps {
  open: boolean;
  imageSrc: string | null;
  onCancel: () => void;
  onCropComplete: (croppedBlob: Blob) => Promise<void>;
  aspect?: number;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  quality = 0.7
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
}

export default function ImageCropper({
  open,
  imageSrc,
  onCancel,
  onCropComplete,
  aspect = 1
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setLoading(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      await onCropComplete(croppedBlob);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={loading ? undefined : onCancel}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Crop Image
        {!loading && (
          <IconButton onClick={onCancel} size="small">
            <Close />
          </IconButton>
        )}
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ position: 'relative', width: '100%', height: 400, bgcolor: '#333' }}>
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
            />
          )}
        </Box>
        
        <Box sx={{ mt: 3, px: 2 }}>
          <Stack spacing={2} direction="row" sx={{ alignItems: 'center' }}>
            <ZoomOut color="action" />
            <Slider
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(_e, value) => setZoom(value as number)}
            />
            <ZoomIn color="action" />
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={() => void handleSave()} 
          variant="contained" 
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Save & Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
