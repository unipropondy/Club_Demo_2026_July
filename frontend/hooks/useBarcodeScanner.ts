import { useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { API_URL } from '../constants/Config';
import { useAuthStore } from '../stores/authStore';

interface UseBarcodeScannerOptions {
  /** Called with the full dish object when the scan resolves successfully */
  onSuccess?: (dish: any) => void;
  /** Called with a human-readable error message on any failure */
  onError?: (message: string) => void;
}

/**
 * useBarcodeScanner
 *
 * Captures keystrokes emitted by a USB/Bluetooth hardware barcode scanner.
 * Scanners behave like a keyboard that types the barcode string and then
 * presses Enter very rapidly (< 50 ms between chars). This hook:
 *
 *  1. Buffers every printable character typed globally.
 *  2. Treats Enter as "end of barcode" and fires a lookup.
 *  3. Ignores keystrokes that land inside <input> or <textarea> elements
 *     so it doesn't interfere with the search box or any other text field.
 *  4. Auto-clears the buffer after 100 ms of silence (prevents stale garbage
 *     from manual typing leaking into a future scan).
 *
 * Only active on web/Electron (Platform.OS === 'web'). On native (Android /
 * iOS), wiring a scanner typically requires an SDK; this hook is a no-op there
 * so native code paths are unaffected.
 */
export function useBarcodeScanner({
  onSuccess,
  onError,
}: UseBarcodeScannerOptions = {}) {
  const bufferRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Fire the HTTP lookup for a finalized barcode string */
  const lookup = useCallback(
    async (code: string) => {
      if (!code || code.length < 2) return;

      const token = useAuthStore.getState().token;

      try {
        const res = await fetch(
          `${API_URL}/api/menu/barcode/${encodeURIComponent(code)}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        );

        if (res.status === 404) {
          onError?.(`Barcode "${code}" not found in menu`);
          return;
        }

        if (res.status === 409) {
          // Sold-out
          const data = await res.json().catch(() => ({}));
          onError?.(`"${data?.dish?.Name || 'Item'}" is sold out`);
          return;
        }

        if (!res.ok) {
          onError?.('Scanner error — please try again');
          return;
        }

        const data = await res.json();
        if (data?.success && data?.dish) {
          onSuccess?.(data.dish);
        } else {
          onError?.('Unexpected response from server');
        }
      } catch (_err) {
        onError?.('Network error during scan — check connection');
      }
    },
    [onSuccess, onError],
  );

  /** Web keyboard listener — wired only when Platform.OS === 'web' */
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      const tag = activeEl?.tagName?.toLowerCase();
      const isInputField = tag === 'input' || tag === 'textarea' || tag === 'select';

      if (e.key === 'Enter') {
        const code = bufferRef.current.trim();
        bufferRef.current = '';
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }

        if (code.length >= 2) {
          // 🚀 CRITICAL WEB FIX: Stop browser from firing 'click' on focused kitchen button / pill!
          e.preventDefault();
          e.stopPropagation();

          if (!isInputField && activeEl && typeof activeEl.blur === 'function') {
            activeEl.blur();
          }

          lookup(code);
          return;
        }
      }

      // If user is inside an input field (like a search box), don't capture global keystrokes into buffer
      if (isInputField) return;

      // Only buffer printable single characters (scanner output)
      if (e.key.length === 1) {
        // Unfocus active buttons (like kitchen pills) so pressing Enter doesn't trigger click on them
        if (activeEl && tag !== 'body' && typeof activeEl.blur === 'function') {
          activeEl.blur();
        }

        bufferRef.current += e.key;

        // Reset the idle-clear timer on every new character (scanner outputs fast < 50ms per key)
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          bufferRef.current = '';
          timerRef.current = null;
        }, 100);
      }
    };

    // Use capture phase (true) so scanner receives keydown BEFORE React Native Web button handlers!
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [lookup]);

  return { lookup };
}
