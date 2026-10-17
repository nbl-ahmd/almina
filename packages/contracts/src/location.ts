import { z } from 'zod';

export const deliveryEmirates = ['Ras al-Khaimah', 'Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm al-Quwain', 'Fujairah'] as const;
export const reverseLocationInputSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
}).strict();
export const reverseLocationDtoSchema = z.object({
  address: z.string().trim().min(1).max(1000),
  emirate: z.enum(deliveryEmirates),
  city: z.string().trim().min(1).max(200),
  maplink: z.url().max(2048).refine(value => new URL(value).origin === 'https://www.google.com'),
}).strict();
export type ReverseLocation = z.infer<typeof reverseLocationDtoSchema>;
