import { createSessionService } from '../../../../../backend/security/sessions.cjs';
import { HttpError } from '../../errors.js';
import type { ErrorCode } from '@almina/contracts';
import type { GetDb } from '../../database.js';
export function createAuthService(getDb: GetDb) {
  return createSessionService(getDb, (status, code) => new HttpError(status, code as ErrorCode));
}
