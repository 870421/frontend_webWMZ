// The icons of the app: 24 × 24, stroke of 1.9 with round ends (global.css). Since PBI-18 shade is
// an umbrella and parks a simple tree, as in the sketches of the team (Mejoras_S4).
const PATHS = {
  // Umbrella: shade.
  shade: (
    <>
      <path d="M3.5 12.5a8.5 8.5 0 0 1 17 0Z" />
      <path d="M12 4V3M12 12.5V18a2.5 2.5 0 0 1-5 0" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  // A simple tree: parks and green areas (PBI-10 phase B).
  vegetation: (
    <>
      <circle cx="12" cy="9" r="5.5" />
      <path d="M12 14.5V21" />
    </>
  ),
  // Gusts: wind.
  wind: <path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8a2.5 2.5 0 1 1-2.5 2.5" />,
  // Sun behind a cloud: «Según el tiempo de hoy» (PBI-21), the answers the weather marks.
  weather: (
    <>
      <path d="M8.5 3.5v1.6M3.6 8.4h1.6M5 5l1.1 1.1M12 5l-1.1 1.1" />
      <path d="M5.9 11.2a3.2 3.2 0 1 1 5.6-3" />
      <path d="M8 19.5h9.5a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6 1.4A2.8 2.8 0 0 0 8 19.5Z" />
    </>
  ),
  // Thermometer: the recommended route of PBI-9.1.
  recommended: (
    <>
      <path d="M10 14.5V5a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0Z" />
      <path d="M12 9v8" />
    </>
  ),
  time: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
};

export function Icon({ kind }) {
  return (
    <svg className={`profile-icon profile-icon-${kind}`} viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[kind]}
    </svg>
  );
}
