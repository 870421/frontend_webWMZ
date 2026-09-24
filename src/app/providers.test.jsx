import { render, screen } from '@testing-library/react';

import { AppProviders } from './providers.jsx';

describe('AppProviders', () => {
  it('renders children', () => {
    render(
      <AppProviders>
        <span>Provider content</span>
      </AppProviders>
    );

    expect(screen.getByText('Provider content')).toBeInTheDocument();
  });
});

