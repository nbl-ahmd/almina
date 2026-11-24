import { checkoutRequest } from '../../../../lib/server/checkout';
export const runtime = 'nodejs';
export function POST(request: Request) { return checkoutRequest(request, 'coverage'); }
