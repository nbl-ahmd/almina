import { getWebEnvironment } from '../../../lib/server/env';
import { mediaResponse } from '../../../lib/catalog/media-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(request: Request) { return mediaResponse(request, getWebEnvironment().CLOUDINARY_CLOUD_NAME); }
export function HEAD(request: Request) { return mediaResponse(request, getWebEnvironment().CLOUDINARY_CLOUD_NAME); }
