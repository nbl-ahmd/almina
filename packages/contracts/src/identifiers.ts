import { z } from 'zod';

// Recovery retains reviewed IDs. A business ID may resemble an ObjectId; the
// explicit by-business-id route selects its namespace without guessing.
export const productBusinessIdPattern = /^[A-Za-z0-9_-]{1,80}$/;
export const productBusinessIdSchema = z.string().regex(productBusinessIdPattern);
