import { useEffect } from 'react';

// Keeps the map attribution just above the bottom sheet, whatever its current height.
export function useSheetHeight(sheetRef) {
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet || typeof ResizeObserver === 'undefined') return undefined;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      root.style.setProperty('--route-sheet-height', `${sheet.getBoundingClientRect().height}px`);
    });
    observer.observe(sheet);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--route-sheet-height');
    };
  }, [sheetRef]);
}
