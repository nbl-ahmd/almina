import { z } from 'zod';
import { deliveryEmirates } from '@almina/contracts/delivery-emirates';
// Reference definitions of what the browser keeps for delivery. Browser code reads it through the
// dependency-free mirrors in lib/browser-validation.ts; tests keep the two in step.
export const areaSchema = z.object({ emirate: z.enum(deliveryEmirates), city: z.string().trim().min(1).max(200) }).strict();
export const pointSchema = z.object({
  latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180),
  address: z.string().trim().min(1).max(1000), emirate: z.enum(deliveryEmirates), city: z.string().trim().min(1).max(200),
  // Details the customer adds after placing the pin. All optional so older saved points keep working.
  label: z.enum(['Home', 'Work', 'Other']).optional(), building: z.string().trim().max(120).optional(), flat: z.string().trim().max(60).optional(), note: z.string().trim().max(300).optional(),
}).strict();
