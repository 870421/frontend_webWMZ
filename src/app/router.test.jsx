import { render, screen } from '@testing-library/react';

import { Router } from './router.jsx';

jest.mock('./App.jsx', () => ({
  App: () => <div>Application route</div>
}));

describe('Router', () => {
  it('renders the application route', () => {
    render(<Router />);

    expect(screen.getByText('Application route')).toBeInTheDocument();
  });
});

