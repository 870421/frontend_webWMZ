import { AuthGate } from '../features/auth/AuthGate.jsx';
import { UserMenu } from '../features/auth/UserMenu.jsx';
import { App } from './App.jsx';
import { useAuth } from '../features/auth/AuthProvider.jsx';

export function Router() {
  const { user, saveTutorialStatus } = useAuth();
  return (
    <AuthGate>
      <App
        user={user}
        onSaveTutorialStatus={saveTutorialStatus}
        userMenu={
          <UserMenu
            onOpenTutorial={() => window.dispatchEvent(new window.Event('weathermapz:open-tour'))}
          />
        }
      />
    </AuthGate>
  );
}
