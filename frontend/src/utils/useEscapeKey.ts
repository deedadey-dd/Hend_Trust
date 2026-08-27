import { useEffect } from 'react';

/**
 * Hook to automatically invoke an onClose handler whenever the user presses the 'Escape' key.
 */
export function useEscapeKey(onClose: () => void, active: boolean = true) {
  useEffect(() => {
    if (!active) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, active]);
}
