import React, { useState, useEffect, useRef } from 'react';
import { ICloudPhoto } from '../../types/config';

interface MediaWallpaperProps {
  photo: ICloudPhoto | null;
  photoUrl?: string; // Optional custom override or pre-proxied photo URL
  brightness?: number; // 10 to 100 percentage
  blur?: number; // 0 to 25 px
  focalOffsetY?: number; // 0 to 100 percentage (default: 20%)
  scaleOnBlur?: boolean;
  className?: string;
}

export const MediaWallpaper: React.FC<MediaWallpaperProps> = ({
  photo,
  photoUrl,
  brightness = 50,
  blur = 0,
  focalOffsetY = 20,
  scaleOnBlur = true,
  className = '',
}) => {
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const activeImageUrl = photoUrl || (photo?.url ? `/api/icloud-photo-proxy?url=${encodeURIComponent(photo.url)}` : '');
  const activeVideoUrl = photo?.mediaType === 'video' && photo?.videoUrl
    ? `/api/icloud-photo-proxy?url=${encodeURIComponent(photo.videoUrl)}`
    : null;

  // Reset video state and safely release video resources on photo change to prevent Raspberry Pi GPU leaks
  useEffect(() => {
    setIsVideoReady(false);
    setHasVideoError(false);

    return () => {
      const vid = videoRef.current;
      if (vid) {
        try {
          vid.pause();
          vid.removeAttribute('src');
          vid.load();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [photo?.id]);

  if (!activeImageUrl && !activeVideoUrl) {
    return null;
  }

  const clampBrightness = Math.max(10, Math.min(100, brightness));
  const clampBlur = Math.max(0, Math.min(30, blur));
  const shouldScale = scaleOnBlur && clampBlur > 0;

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${className}`}>
      {/* 1. Guaranteed Base Layer: High-Res JPEG Poster Frame */}
      {activeImageUrl && (
        <div
          className="absolute inset-0 bg-cover transition-all duration-1000 ease-in-out"
          style={{
            backgroundImage: `url('${activeImageUrl}')`,
            backgroundPosition: `center ${focalOffsetY}%`,
            filter: `brightness(${clampBrightness}%) blur(${clampBlur}px)`,
            transform: shouldScale ? 'scale(1.06)' : undefined,
          }}
        />
      )}

      {/* 2. Resilient Top Layer: HTML5 Video with Instant Silent Fallback to Poster on Pi Decoder Error */}
      {activeVideoUrl && !hasVideoError && (
        <video
          ref={videoRef}
          key={photo?.id || activeVideoUrl}
          src={activeVideoUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={() => setIsVideoReady(true)}
          onError={() => {
            // Silently fall back to base poster frame on decoder failure, codec mismatch, or network stall
            setHasVideoError(true);
            setIsVideoReady(false);
          }}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
          style={{
            objectPosition: `center ${focalOffsetY}%`,
            filter: `brightness(${clampBrightness}%) blur(${clampBlur}px)`,
            transform: shouldScale ? 'scale(1.06)' : undefined,
            opacity: isVideoReady ? 1 : 0,
          }}
        />
      )}
    </div>
  );
};
