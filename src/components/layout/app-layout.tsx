import { Outlet } from 'react-router';

import { TopBar } from './top-bar';

export function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <TopBar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
