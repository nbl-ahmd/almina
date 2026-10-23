import { legacyMediaResponse } from '../../../../lib/catalog/legacy-media';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(request: Request) { return legacyMediaResponse(request); }
export function HEAD(request: Request) { return legacyMediaResponse(request); }
