import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RoutePreferences } from './RoutePreferences.jsx';

const DEFAULTS = { sunShade: 'any', avoidWind: false, preferParks: false, extraMinutes: 5 };

function renderPreferences(props = {}) {
  const handlers = { onChange: jest.fn(), onToggleWeather: jest.fn() };
  const view = render(<RoutePreferences preferences={DEFAULTS} {...handlers} {...props} />);
  return { ...view, ...handlers };
}

describe('RoutePreferences (PBI-18, PBI-21)', () => {
  it('asks the questions of the sketches, with «Me da igual» by default', () => {
    renderPreferences();

    expect(screen.getByRole('heading', { name: '¿Cómo prefieres ir?' })).toBeInTheDocument();
    const sunShade = screen.getByRole('group', { name: 'Sombra o sol' });
    expect(
      within(sunShade)
        .getAllByRole('radio')
        .map((radio) => radio.labels[0].textContent)
    ).toEqual(['Sombra', 'Sol', 'Me da igual']);
    expect(within(sunShade).getByRole('radio', { name: 'Me da igual' })).toBeChecked();
    const windAndParks = screen.getByRole('group', { name: 'Viento y parques' });
    expect(within(windAndParks).getAllByRole('checkbox')).toHaveLength(2);
    // Icons of the sketches: umbrella, sun, gusts and a tree.
    expect(document.querySelector('.profile-icon-shade')).toBeInTheDocument();
    expect(document.querySelector('.profile-icon-vegetation')).toBeInTheDocument();
    // No minutes without a preference, and no weights or percentages anywhere.
    expect(screen.queryByRole('group', { name: /Cuánto más/ })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/%/);
  });

  it('shows the minutes, with the value on the right, only with some preference', () => {
    renderPreferences({ preferences: { ...DEFAULTS, avoidWind: true, extraMinutes: 10 } });

    const minutes = screen.getByRole('group', { name: '¿Cuánto más estás dispuesto a andar?' });
    expect(
      within(minutes)
        .getAllByRole('radio')
        .map((radio) => radio.labels[0].textContent)
    ).toEqual(['Nada', '+2 minutos', '+5 minutos', '+10 minutos', '+15 minutos']);
    expect(within(minutes).getByRole('radio', { name: '+10 minutos' })).toBeChecked();
    expect(within(minutes).getByText('+10 min')).toBeInTheDocument();
  });

  it('works with the keyboard: arrows move along the options, space toggles', async () => {
    const user = userEvent.setup();
    const { onChange } = renderPreferences({ preferences: { ...DEFAULTS, sunShade: 'shade' } });

    screen.getByRole('radio', { name: 'Sombra' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith({ sunShade: 'sun' });

    screen.getByRole('checkbox', { name: 'Evitar el viento' }).focus();
    await user.keyboard(' ');
    expect(onChange).toHaveBeenLastCalledWith({ avoidWind: true });
  });

  it('«Según el tiempo de hoy» shows the answers the weather marked and why', async () => {
    const user = userEvent.setup();
    const { onToggleWeather } = renderPreferences({
      preferences: { ...DEFAULTS, sunShade: 'shade', avoidWind: true },
      byWeather: true,
      weather: {
        status: 'available',
        message:
          'Hace calor (sensación de 31 °C) y sopla cierzo: he marcado «Sombra» y «Evitar el viento».',
      },
    });

    const weather = screen.getByRole('button', { name: 'Según el tiempo de hoy' });
    expect(weather).toHaveAttribute('aria-pressed', 'true');
    expect(weather.querySelector('.profile-icon-weather')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Hace calor (sensación de 31 °C) y sopla cierzo: he marcado «Sombra» y «Evitar el viento».'
    );
    // The answers are checked, so they can be changed afterwards, and the minutes are asked.
    expect(screen.getByRole('radio', { name: 'Sombra' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Evitar el viento' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Por parques' })).not.toBeChecked();
    expect(screen.getByRole('group', { name: /Cuánto más/ })).toBeInTheDocument();
    await user.click(weather);
    expect(onToggleWeather).toHaveBeenCalledTimes(1);
  });

  it('«Según el tiempo de hoy» off: no reason is shown', () => {
    renderPreferences({ weather: { status: 'idle', message: '' } });
    expect(screen.getByRole('button', { name: 'Según el tiempo de hoy' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('once a route is calculated folds into a summary with «Cambiar preferencias»', async () => {
    const user = userEvent.setup();
    const { onChange, rerender } = renderPreferences({
      preferences: { ...DEFAULTS, sunShade: 'sun', preferParks: true, extraMinutes: 10 },
      isCompact: true,
    });

    expect(screen.getByText('Sol · Por parques · +10 min')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cambiar preferencias' }));
    await user.click(screen.getByRole('radio', { name: '+15 minutos' }));
    expect(onChange).toHaveBeenCalledWith({ extraMinutes: 15 });

    rerender(
      <RoutePreferences
        preferences={{ ...DEFAULTS, sunShade: 'shade' }}
        byWeather
        isCompact
        onChange={onChange}
        onToggleWeather={jest.fn()}
      />
    );
    expect(
      screen.getByText('Según el tiempo de hoy: Sombra · +5 min', { selector: 'p' })
    ).toBeInTheDocument();
  });

  it('says when the preferences could not be loaded or saved', () => {
    renderPreferences({
      loadFailed: true,
      saveError: 'No se han podido guardar tus preferencias.',
    });

    expect(screen.getByText(/No se han podido cargar tus preferencias/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se han podido guardar tus preferencias. Se usarán en esta ruta.'
    );
  });
});
