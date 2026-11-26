import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function InfoButton({ label, children }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef(null);
  const button = useRef(null);
  const popover = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const outside = (event) => {
      if (!root.current?.contains(event.target) && !popover.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('pointerdown', outside);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !popover.current || !button.current) return undefined;

    const positionPopover = () => {
      const anchor = button.current.getBoundingClientRect();
      const tooltip = popover.current;
      const bounds = tooltip.getBoundingClientRect();
      const margin = 12;
      const gap = 8;
      const left = Math.max(
        margin,
        Math.min(
          window.innerWidth - bounds.width - margin,
          anchor.left + anchor.width / 2 - bounds.width / 2
        )
      );
      const above = anchor.top - bounds.height - gap;
      const top =
        above >= margin
          ? above
          : Math.min(window.innerHeight - bounds.height - margin, anchor.bottom + gap);

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${Math.max(margin, top)}px`;
      tooltip.style.visibility = 'visible';
    };

    positionPopover();
    window.addEventListener('resize', positionPopover);
    window.addEventListener('scroll', positionPopover, true);
    return () => {
      window.removeEventListener('resize', positionPopover);
      window.removeEventListener('scroll', positionPopover, true);
    };
  }, [open, children]);

  return (
    <span className="info-button-wrap" ref={root}>
      <button
        ref={button}
        type="button"
        className="info-button"
        aria-label={`Ayuda: ${label}`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-describedby={open ? id : undefined}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.stopPropagation();
            setOpen(false);
            button.current?.focus();
          }
        }}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="9.25" />
          <path d="M12 10.8v6.1" />
          <circle className="info-button-dot" cx="12" cy="7.25" r="0.75" />
        </svg>
      </button>
      {open &&
        createPortal(
          <span ref={popover} id={id} className="info-popover" role="tooltip">
            {children}
          </span>,
          document.body
        )}
    </span>
  );
}
