import { Outlet } from 'react-router';

import { TopBar } from '@/components/TopBar';

// layouts/App.astro: the top bar, then the page, which brings its own container.
export function Layout() {
  return (
    <>
      <TopBar />
      <Outlet />
    </>
  );
}
