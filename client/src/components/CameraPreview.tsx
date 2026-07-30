/**
 * PhytoPathometric — CameraPreview Component
 * Live camera feed with capture button and mode toggle
 * Design: AgTech Dashboard Moderno
 */
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, X, Maximize2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCamera } from '@/hooks/useCamera';

interface CameraPreviewProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function CameraPreview({ onCapture, onClose, isLoading = false }: CameraPreviewProps) {
  const { videoRef, canvasRef, isActive, error, isFacingMode, startCamera, stopCamera, captureFrame, toggleFacingMode } = useCamera({
    onFrame: onCapture,
  });

  useEffect(() => {
    startCamera('environment');
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleCapture = () => {
    const dataUrl = captureFrame();
    if (dataUrl) {
      stopCamera();
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center"
    >
      <canvas ref={canvasRef} className="hidden" />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
      >
        <X size={20} className="text-white" />
      </button>

      {/* Video feed */}
      <div className="relative w-full h-full flex items-center justify-center">
        {error ? (
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto">
              <Camera size={32} className="text-red-400" />
            </div>
            <p className="text-white font-semibold">{error}</p>
            <p className="text-white/60 text-sm max-w-xs">Verifique as permissões de câmera do navegador</p>
            <Button variant="outline" onClick={onClose} className="mt-4">
              Voltar
            </Button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: isFacingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)' }}
            />

            {/* Overlay guides */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 border-2 border-green-400/50 rounded-3xl" />
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-green-300 text-sm font-semibold text-center px-4">
                  Posicione a folha dentro do quadro
                </p>
              </div>
            </div>

            {/* Pulse indicator */}
            {isActive && (
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white text-xs font-medium">Ao vivo</span>
              </div>
            )}

            {/* Bottom controls */}
            <div className="absolute bottom-8 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFacingMode}
                className="gap-2"
                disabled={isLoading}
              >
                <Maximize2 size={14} />
                Virar câmera
              </Button>
              <Button
                onClick={handleCapture}
                disabled={!isActive || isLoading}
                size="lg"
                className="gap-2 rounded-full w-16 h-16 p-0"
                style={{ background: 'linear-gradient(135deg, oklch(0.32 0.09 155), oklch(0.42 0.12 155))' }}
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Camera size={20} />
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
