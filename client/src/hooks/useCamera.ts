/**
 * PhytoPathometric — useCamera Hook
 * Manages live camera feed with frame capture capability
 */
import { useRef, useState, useCallback, useEffect } from 'react';

interface UseCameraOptions {
  onFrame?: (dataUrl: string) => void;
}

export function useCamera(options?: UseCameraOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFacingMode, setIsFacingMode] = useState<'user' | 'environment'>('environment');

  const startCamera = useCallback(async (facingMode: 'user' | 'environment' = 'environment') => {
    try {
      setError(null);

      // Verifica se a API de câmera está disponível
      if (!navigator?.mediaDevices?.getUserMedia) {
        setError(
          'Câmera não disponível. Acesse via http://localhost:3000 (não pelo IP de rede).'
        );
        setIsActive(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsActive(true);
        setIsFacingMode(facingMode);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao acessar câmera';
      setError(message);
      setIsActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    options?.onFrame?.(dataUrl);
    return dataUrl;
  }, [options]);

  const toggleFacingMode = useCallback(async () => {
    stopCamera();
    const newMode = isFacingMode === 'environment' ? 'user' : 'environment';
    await startCamera(newMode);
  }, [isFacingMode, startCamera, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    isActive,
    error,
    isFacingMode,
    startCamera,
    stopCamera,
    captureFrame,
    toggleFacingMode,
  };
}