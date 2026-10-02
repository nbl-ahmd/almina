import { ObjectId } from 'mongodb';

export const text = (value: unknown): string | null => typeof value === 'string' ? value : null;
export const number = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
export const id = (value: unknown): string | null => value instanceof ObjectId ? value.toHexString() : null;
