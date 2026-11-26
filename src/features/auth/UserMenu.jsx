import { useEffect, useId, useRef, useState } from 'react';

import { useAuth } from './AuthProvider.jsx';

// Up to two initials, taken only from words that start with a letter ("Ana López" → "AL",
// "paramovic 2508" → "P").
export function getInitials(name = '') {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter((word) => /^\p{L}/u.test(word))
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
  return initials || '?';
}

function LogoutIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l-5-5 5-5" />
      <path d="M5 12h11" />
    </svg>
  );
}

export function UserMenu({
  onOpenTutorial = () => window.dispatchEvent(new window.Event('weathermapz:open-tour')),
  onOpenFavorites = () => window.dispatchEvent(new window.Event('weathermapz:open-favorites')),
}) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  // The guided tour opens the menu on its steps about the profile (favourites and «Ver tutorial»).
  // It is kept apart from `open`: a click on the tour (outside the menu) must not close it.
  const [openByTour, setOpenByTour] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();

  const menuItems = () => Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? []);

  function close({ returnFocus = false } = {}) {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }

  useEffect(() => {
    const listen = (event) => setOpenByTour(Boolean(event.detail?.open));
    window.addEventListener('weathermapz:tour-user-menu', listen);
    return () => window.removeEventListener('weathermapz:tour-user-menu', listen);
  }, []);

  // Closes the menu when the user clicks or taps anywhere outside it.
  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  // Moves the focus into the menu when it opens, as expected from a menu button.
  useEffect(() => {
    if (open) menuItems()[0]?.focus();
  }, [open]);

  function handleMenuKeyDown(event) {
    const items = menuItems();
    const current = items.indexOf(document.activeElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      close({ returnFocus: true });
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      items[(current + step + items.length) % items.length]?.focus();
    } else if (event.key === 'Tab') {
      close();
    }
  }

  return (
    <div className="user-menu" ref={containerRef}>
      <button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Menú de usuario de ${user.name}`}
        className="user-menu-button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        ref={buttonRef}
        data-tour="user-menu"
        type="button"
      >
        <span aria-hidden="true">{getInitials(user.name)}</span>
      </button>

      {(open || openByTour) && (
        <div className="user-menu-dropdown">
          <div className="user-menu-identity">
            <span className="user-menu-avatar" aria-hidden="true">
              {getInitials(user.name)}
            </span>
            <div className="user-menu-text">
              <p className="user-menu-name">{user.name}</p>
              <p className="user-menu-email">{user.email}</p>
            </div>
          </div>
          <div
            aria-label="Opciones de usuario"
            className="user-menu-items"
            id={menuId}
            onKeyDown={handleMenuKeyDown}
            ref={menuRef}
            role="menu"
          >
            {onOpenTutorial && (
              <button
                className="user-menu-item user-menu-item-tutorial"
                onClick={() => {
                  close({ returnFocus: true });
                  onOpenTutorial();
                }}
                role="menuitem"
                type="button"
              >
                <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" />
                  <path d="m10 8 6 4-6 4Z" />
                </svg>
                Ver tutorial
              </button>
            )}
            {onOpenFavorites && (
              <button
                className="user-menu-item user-menu-item-favorites"
                onClick={() => {
                  close();
                  onOpenFavorites();
                }}
                role="menuitem"
                type="button"
              >
                <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
                  <path d="m12 3 2.75 5.58 6.16.9-4.46 4.35 1.05 6.14L12 17.07l-5.5 2.9 1.05-6.14L3.1 9.48l6.16-.9L12 3Z" />
                </svg>
                Favoritos
              </button>
            )}
            <button
              className="user-menu-item"
              onClick={() => {
                close();
                logout();
              }}
              role="menuitem"
              type="button"
            >
              <LogoutIcon />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
