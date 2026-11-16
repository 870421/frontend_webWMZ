// The name of the route assistant (#181). The backend uses the same name in the prompt of the model.
export const ASSISTANT_NAME = 'Cierzo';

/**
 * The logo of Cierzo (#181): the gusts of the wind icon of the app carrying a leaf (wind and green).
 * Drawn like the other icons (24 × 24, round strokes); the strokes take the current colour, so it is
 * white on the button and purple in the title of the pop-up.
 */
export function CierzoLogo({ className = '' }) {
  return (
    <svg
      className={`cierzo-logo ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 9h8.5a2.6 2.6 0 1 0-2.6-2.6" />
      <path d="M3 13.2h10.5" />
      <path d="M5 17.2h4.5" />
      <path
        className="cierzo-logo-leaf"
        d="M13.2 20.5c-.2-4.6 2.5-7.6 7.6-8.3.2 4.9-2.6 7.9-7.6 8.3Z"
      />
      <path className="cierzo-logo-vein" d="m13.2 20.5 4.1-4.3" strokeWidth="1.4" />
    </svg>
  );
}
