"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseScanInputOptions {
  onScan: (value: string) => void;
  /** Min length before treating as a complete scan (default: 3) */
  minLength?: number;
  /** Timeout between keystrokes in ms — scanner sends chars quickly (default: 100) */
  scanTimeout?: number;
}

/**
 * Hook for keyboard-style USB barcode scanner input.
 * Scanners emit characters very rapidly then send Enter.
 * This hook captures that pattern and fires onScan with the full value.
 *
 * Architecture note: To add camera scanning, replace the keyboard listener
 * with a camera stream decoder and call onScan with the decoded value.
 */
export function useScanInput({
  onScan,
  minLength = 3,
  scanTimeout = 100,
}: UseScanInputOptions) {
  const bufferRef = useRef<string>("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    const value = bufferRef.current.trim();
    if (value.length >= minLength) {
      onScan(value);
    }
    bufferRef.current = "";
  }, [onScan, minLength]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Clear flush timer on each keystroke
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      if (e.key === "Enter") {
        flush();
        return;
      }

      // Only capture printable characters
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }

      // Auto-flush if no new keystroke arrives within scanTimeout
      timeoutRef.current = setTimeout(flush, scanTimeout);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [flush, scanTimeout]);
}
