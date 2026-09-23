export function AppShell({ map, sidebar }) {
  return (
    <main className="app-shell">
      <section className="map-region" aria-label="Interactive Zaragoza map">
        {map}
      </section>
      <aside className="control-panel" aria-label="Route controls">
        <header className="app-header">
          <p className="app-kicker">Zaragoza pedestrian comfort</p>
          <h1>WeatherMapZ</h1>
        </header>
        {sidebar}
      </aside>
    </main>
  );
}

