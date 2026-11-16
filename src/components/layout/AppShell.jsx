// El tiempo va fuera del mapa, junto al menú de usuario: dentro del mapa su detalle quedaba por
// debajo del panel de búsqueda en el móvil.
// `floatingAction` es un botón flotante sobre el mapa (el del asistente, #179), fuera del panel.
export function AppShell({ map, sidebar, userMenu = null, weather = null, floatingAction = null }) {
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
      {floatingAction}
      {weather}
      {userMenu && <div className="app-user-menu">{userMenu}</div>}
    </main>
  );
}
