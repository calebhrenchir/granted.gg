'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SequenceCanvasProps {
  sequencePath: string; // e.g., 'money-loop', 'online-only', etc.
  frameCount: number;
  fps?: number;
  scale?: string; // Tailwind scale class, e.g., 'scale-125', 'scale-100'
  canvasWidth?: number;
  canvasHeight?: number;
  startFrame?: number; // Number of frames to load before starting animation
  batchSize?: number; // Number of images to load in parallel per batch
  className?: string;
  imageFormat?: 'png' | 'webp'; // Image format to use (default: 'png')
}

export default function SequenceCanvas({
  sequencePath,
  frameCount,
  fps = 60,
  scale = 'scale-100',
  canvasWidth = 500,
  canvasHeight = 500,
  startFrame = 10,
  batchSize = 20,
  className,
  imageFormat = 'png',
}: SequenceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [images, setImages] = useState<(HTMLImageElement | null)[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load images in parallel batches for faster loading
    const loadImages = async () => {
      const loadedImages: (HTMLImageElement | null)[] = new Array(frameCount).fill(null);
      let loadedCount = 0;
      let hasStartedAnimation = false;

      // Load images in parallel batches
      const batches = Math.ceil(frameCount / batchSize);

      for (let batch = 0; batch < batches; batch++) {
        const batchPromises: Promise<void>[] = [];
        const batchStart = batch * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, frameCount);

        for (let i = batchStart; i < batchEnd; i++) {
          const promise = new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              loadedImages[i] = img;
              loadedCount++;
              resolve();
            };
            img.onerror = () => {
              console.warn(`Failed to load frame ${i} from ${sequencePath}`);
              resolve(); // Continue even if one frame fails
            };
            img.src = `https://granted.gg/sequences/${sequencePath}/${String(i).padStart(6, '0')}.${imageFormat}`;
          });
          batchPromises.push(promise);
        }

        // Wait for batch to complete
        await Promise.all(batchPromises);
        
        // Update images array progressively
        setImages([...loadedImages]);
        
        // Start animation only when we have a substantial number of frames loaded
        // This prevents glitchy animations with missing frames
        // Wait for at least 20% of frames or 50 frames, whichever is smaller
        const minFramesToStart = Math.max(startFrame, Math.min(50, Math.floor(frameCount * 0.2)));
        if (loadedCount >= minFramesToStart && !hasStartedAnimation) {
          // Small delay to ensure frames are ready and reduce glitches
          await new Promise(resolve => setTimeout(resolve, 150));
          setIsLoading(false);
          hasStartedAnimation = true;
        }
      }

      setIsLoading(false);
    };

    loadImages();
  }, [sequencePath, frameCount, batchSize, startFrame]);

  // Draw first frame immediately when it loads
  useEffect(() => {
    if (!canvasRef.current || images.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    
    // Draw first available frame
    for (let i = 0; i < frameCount; i++) {
      const image = images[i];
      if (image) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        break;
      }
    }
  }, [images, frameCount]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true }); // Enable alpha to show background
    if (!ctx) return;

    let frame = 0;
    let lastTime = performance.now();
    const frameDelay = 1000 / fps;

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;

      if (deltaTime >= frameDelay) {
        // Find next available frame (skip missing ones to avoid glitches)
        let attempts = 0;
        let nextFrame = frame;
        let foundFrame = false;
        
        while (attempts < frameCount) {
          nextFrame = (nextFrame + 1) % frameCount;
          if (images[nextFrame]) {
            frame = nextFrame;
            foundFrame = true;
            break;
          }
          attempts++;
        }
        
        // Only draw if we found a loaded frame (don't clear if no frame found)
        if (foundFrame) {
          const image = images[frame];
          if (image) {
            // Clear canvas to transparent
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          }
        }
        // If no frame found, keep showing current frame (don't clear or update)

        setCurrentFrame(frame);
        lastTime = currentTime - (deltaTime % frameDelay);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation only when we have enough frames loaded and not loading
    if (images.length > 0 && !isLoading) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [images, isLoading, fps, frameCount]);

  return (
    <div className={cn('flex justify-center items-center w-full h-full', scale, className)}>
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="w-full h-full"
        style={{ backgroundColor: 'transparent' }}
      />
    </div>
  );
}

