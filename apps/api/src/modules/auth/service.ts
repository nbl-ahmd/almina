import { createSessionService } from './sessions.js';
import type { GetDb } from '../../database.js';
export function createAuthService(getDb: GetDb) { return createSessionService(getDb); }
