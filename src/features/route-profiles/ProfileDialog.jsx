import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Pop-up over the map: a centred window on large screens and a sheet from the bottom on phones.
// Escape or a tap outside closes it, and the focus goes back to whatever opened it. It is drawn in
// <body> so that the panel it is opened from cannot clip or move it.
export function ProfileDialog({ title, onClose, children }) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const opener = document.activeElement;
    dialogRef.current?.querySelector('input, button')?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus?.();
    };
  }, []);

  return createPortal(
    <div
      className="profile-dialog-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="profile-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-dialog-title"
      >
        <h2 id="profile-dialog-title">{title}</h2>
        {children}
      </div>
    </div>,
    document.body
  );
}
