"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import "barcode-detector/polyfill";

interface CameraScannerProps {
  onScan: (value: string) => void;
  onClose: () => void;
}

export function CameraScanner({ onScan, onClose }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const scannedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // @ts-ignore — BarcodeDetector not yet in TypeScript lib
        const detector = new BarcodeDetector({
          formats: [
            "upc_a", "upc_e", "ean_13", "ean_8",
            "code_128", "code_39", "itf", "qr_code",
          ],
        });

        function tick() {
          if (scannedRef.current) return;
          const video = videoRef.current;
          if (video && video.readyState >= 2) {
            detector
              .detect(video)
              .then((results: { rawValue: string }[]) => {
                if (results.length > 0 && !scannedRef.current) {
                  scannedRef.current = true;
                  onScan(results[0].rawValue);
                }
              })
              .catch(() => {});
          }
          rafRef.current = requestAnimationFrame(tick);
        }

        rafRef.current = requestAnimationFrame(tick);
      } catch {
        setError("Could not access the camera. Please allow camera permission and try again.");
      }
    }

    start();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header — padded below status bar on iPhone */}
      <div className="flex items-center justify-between px-4 py-3 text-white [padding-top:max(0.75rem,env(safe-area-inset-top))]">
        <span className="text-sm font-medium">Point camera at barcode</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Camera / error area */}
      <div className="relative flex-1 overflow-hidden">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center text-white [padding-bottom:env(safe-area-inset-bottom)]">
            <p className="text-amber-400">{error}</p>
            <Button variant="outline" onClick={onClose}>
              Go Back
            </Button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
            />

            {/* Viewfinder overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-36 w-72">
                {/* Dimmed surround */}
                <div className="absolute inset-0 rounded shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />

                {/* Corner accents */}
                <span className="absolute -left-0.5 -top-0.5 h-6 w-6 rounded-tl border-l-4 border-t-4 border-primary" />
                <span className="absolute -right-0.5 -top-0.5 h-6 w-6 rounded-tr border-r-4 border-t-4 border-primary" />
                <span className="absolute -bottom-0.5 -left-0.5 h-6 w-6 rounded-bl border-b-4 border-l-4 border-primary" />
                <span className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-br border-b-4 border-r-4 border-primary" />

                {/* Animated scan line */}
                <span className="absolute inset-x-2 h-0.5 bg-primary/80 [animation:scan-line_2s_ease-in-out_infinite]" />
              </div>

              <p className="absolute text-xs text-white/60 [bottom:max(4rem,calc(env(safe-area-inset-bottom)+1rem))]">
                Align the barcode within the frame
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
