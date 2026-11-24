// Dependency-free so browser code on every storefront page can use it without loading zod.
export const deliveryEmirates = ['Ras al-Khaimah', 'Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm al-Quwain', 'Fujairah'] as const;
export type DeliveryEmirate = typeof deliveryEmirates[number];
