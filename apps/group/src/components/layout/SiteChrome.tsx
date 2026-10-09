'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { PageBackButton } from '@/components/layout/PageBackButton';
import { SiteAurora } from '@/components/layout/SiteAurora';
import { TopBar } from '@/components/layout/TopBar';
import { departmentForPathname } from '@/components/brand/departments';
import { useAuth } from '@/context/AuthProvider';
import { useEffect } from 'react';
import { PAGE_BACK_FALLBACK, showsPageBack } from '@/lib/pageBack';

/**
 * Site chrome only after registration. Admin uses its own full-bleed shell.
 * Logged-in panel uses a desktop sidebar — rendered only *inside* a department
 * route, where the rail wears that department's identity (UX-27). On /home and
 * every other non-department page the rail stays hidden: the hub is a bare,
 * full-width solar system, and entering a department is what reveals its rail.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, learnerState, loading, signedOut, finishSignOut } = useAuth();
  const isAdminRoute = Boolean(pathname?.startsWith('/admin'));
  const registered = Boolean(user?.profileComplete || learnerState?.profileComplete);
  const showChrome = !loading && registered && !isAdminRoute;
  // The rail belongs to the departments: it appears the moment the learner
  // crosses into one of the six roots (or anything below them) and disappears
  // again on /home, where the department hub paints the full screen.
  const inDepartment = Boolean(departmentForPathname(pathname));
  const showRail = showChrome && inDepartment;
  // Admin brings its own shell (with its own back slot); / and /home are roots.
  const showBack = !isAdminRoute && showsPageBack(pathname);

  // The landing page is the destination every sign-out navigates to — once it is
  // on screen the transition is over and normal rendering resumes.
  useEffect(() => {
    if (signedOut && pathname === '/') finishSignOut();
  }, [signedOut, pathname, finishSignOut]);

  // A sign-out owns the screen until the landing page arrives: unmounting the
  // current page also disarms its auth gate, which would otherwise redirect to
  // the login or phone-OTP screen in the same tick and undo the sign-out.
  const main = (
    <main
      className={`site-main${showChrome ? '' : ' site-main--guest'}${isAdminRoute ? ' site-main--admin' : ''}`}
    >
      {signedOut ? null : (
        <>
          {showBack ? <PageBackButton href={PAGE_BACK_FALLBACK} /> : null}
          {children}
        </>
      )}
    </main>
  );

  return (
    <>
      {!isAdminRoute ? <SiteAurora /> : null}
      {showRail ? (
        <div className="panel-shell">
          <TopBar />
          <div className="panel-content">
            {main}
          </div>
        </div>
      ) : (
        main
      )}
    </>
  );
}
