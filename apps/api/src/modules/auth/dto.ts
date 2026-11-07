import type { Document } from 'mongodb';
import { staffDtoSchema } from '@almina/contracts';
import { id } from '../dto-values.js';
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
export const staffProjection = { _id: 1, username: 1, name: 1, role: 1, cities: 1, branchId: 1, accountType: 1 };
export function staffDto(doc: Document) {
  return staffDtoSchema.parse({ id: id(doc._id), username: doc.username, name: doc.name, role: doc.role, ...(doc.accountType === 'branch' ? { accountType: 'branch' } : {}), ...(typeof doc.branchId === 'string' ? { branchId: doc.branchId } : {}), cities: strings(doc.cities) });
}
