'use client';

import { Suspense } from 'react';
import { useLanguage } from '@/context/LanguageProvider';
import { PublicCoursesPage } from './public-page';

export default function CoursesPage() {
  const { t } = useLanguage();
  return (
    // `PublicCoursesPage` reads `?track=` via useSearchParams, which Next
    // requires to sit under a Suspense boundary when the route is prerendered.
    <Suspense fallback={<div className="page-content auth-loading">{t('courses.loading')}</div>}>
      <PublicCoursesPage />
    </Suspense>
  );
}
