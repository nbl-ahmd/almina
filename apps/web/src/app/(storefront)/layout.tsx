import type { ReactNode } from 'react';
import { Navigation, Footer } from '../../components/navigation';
import { StructuredData } from '../../components/structured-data';
import { organizationData } from '../../lib/seo';
import { getWebEnvironment } from '../../lib/server/env';
export default function StorefrontLayout({ children }: { children: ReactNode }) {
 const env = getWebEnvironment();
 return <><StructuredData data={organizationData(env.WEB_ORIGIN)} /><Navigation /><main id="main-content" tabIndex={-1}>{children}</main><Footer telemetryEnabled={env.COMMERCE_TELEMETRY_ENABLED} /></>;
}
