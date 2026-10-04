import type { ReactNode } from 'react';
import { Navigation, Footer } from '../../components/navigation';
import { StructuredData } from '../../components/structured-data';
import { organizationData } from '../../lib/seo';
import { getWebEnvironment } from '../../lib/server/env';
export default function StorefrontLayout({ children }: { children: ReactNode }) {
 return <><StructuredData data={organizationData(getWebEnvironment().WEB_ORIGIN)} /><Navigation /><main id="main-content" tabIndex={-1}>{children}</main><Footer /></>;
}
