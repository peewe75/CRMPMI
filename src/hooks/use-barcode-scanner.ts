'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseBarcodeScanner {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isScanning: boolean;
  error: string | null;
  startScanning: () => Promise<void>;
  stopScanning: () => void;
}

/**
 * Browser-based barcode scanner using BarcodeDetector API.
 * Falls back to manual input if BarcodeDetector is not available.
 */
export function useBarcodeScanner(
  onDetected: (barcode: string) => void
): UseBarcodeScanner {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopScanning = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const startScanning = useCallback(async () => {
    setError(null);

    // Check for BarcodeDetector support
    if (!('BarcodeDetector' in window)) {
      setError('Barcode scanner non supportato dal browser. Usa input manuale.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsScanning(true);

      const detector = new (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'],
      });

      const scan = async () => {
        if (!videoRef.current || !streamRef.current) return;

        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            onDetected(code);
            stopScanning();
            return;
          }
        } catch {
          // Detection frame failed, continue
        }

        animFrameRef.current = requestAnimationFrame(scan);
      };

      animFrameRef.current = requestAnimationFrame(scan);
    } catch (err) {
      setError('Impossibile accedere alla fotocamera.');
      console.error(err);
    }
  }, [onDetected, stopScanning]);

  useEffect(() => {
    return () => stopScanning();
  }, [stopScanning]);

  return { videoRef, isScanning, error, startScanning, stopScanning };
}
