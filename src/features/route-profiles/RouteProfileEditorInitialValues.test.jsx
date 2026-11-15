import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RouteProfileEditor } from './RouteProfileEditor.jsx';

// A new route filled with values from outside (the route assistant, PBI-9.2).
const INITIAL = {
  name: 'Asistente',
  weights: { shade: 0, sun: 20, wind: 0, vegetation: 60 },
  maxDetourPercentage: 40,
};
const PROFILES = [
  { id: 1, name: 'Rápida', weights: { shade: 0, sun: 0, wind: 0, vegetation: 0 } },
  { id: 4, name: 'Parques', weights: { shade: 0, sun: 0, wind: 0, vegetation: 30 } },
];

describe('RouteProfileEditor with initialValues', () => {
  it('starts with those values', () => {
    render(<RouteProfileEditor initialValues={INITIAL} profiles={PROFILES} onSave={jest.fn()} />);

    expect(screen.getByLabelText('Nombre')).toHaveValue('Asistente');
    expect(screen.getByLabelText('Sombra o sol')).toHaveValue('20');
    expect(screen.getByLabelText('Verde')).toHaveValue('60');
    expect(screen.getByLabelText('Tiempo extra máximo')).toHaveValue('40');
  });

  it('editing a saved route ignores them', () => {
    render(
      <RouteProfileEditor
        profile={{ ...PROFILES[1], maxDetourPercentage: 25 }}
        initialValues={INITIAL}
        profiles={PROFILES}
        onSave={jest.fn()}
      />
    );
    expect(screen.getByLabelText('Nombre')).toHaveValue('Parques');
    expect(screen.getByLabelText('Verde')).toHaveValue('30');
  });

  it('"Reemplazar" with a repeated name never deletes a route', async () => {
    const user = userEvent.setup();
    const onReplace = jest.fn().mockResolvedValue(undefined);
    render(
      <RouteProfileEditor
        initialValues={{ ...INITIAL, name: 'parques' }}
        profiles={PROFILES}
        onSave={jest.fn()}
        onReplace={onReplace}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Reemplazar' }));
    expect(screen.getByText('Se sustituirán los pesos de «Parques».')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reemplazar «Parques»' }));

    expect(onReplace).toHaveBeenCalledWith(
      4,
      { name: 'Parques', weights: INITIAL.weights, maxDetourPercentage: 40 },
      null
    );
  });
});
