export function AppShell({ map, sidebar }) {
  return (
    <main className="app-shell">
      <section className="map-region" aria-label="Mapa interactivo de Zaragoza">
        {map}
      </section>
      <aside className="control-panel" aria-label="Controles de ruta">
        <header className="app-header">
          <span className="app-logo-frame" aria-hidden="true">
            <img className="app-logo" src="/weathermapz-logo.png" alt="" />
          </span>
          <div>
            <h1>WeatherMapZ</h1>
            <p className="app-kicker">Rutas cómodas a pie por Zaragoza</p>
          </div>
        </header>
        {sidebar}
      </aside>
    </main>
  );
}

