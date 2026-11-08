import { z } from 'zod';
import { orderRoutingSchema, routingBranchSchema } from './order-routing';
import { deliveryZoneSchema, zoneSettingsSchema } from './delivery-zones';
export const branchUsernameSchema=z.string().trim().regex(/^[A-Za-z0-9_.@-]{1,100}$/);
export const branchPasswordSchema=z.string().min(12).max(72).refine(value=>new TextEncoder().encode(value).length<=72,'Use at most 72 bytes for the password.');
export const branchCreationSchema=z.object({revision:z.number().int().nonnegative(),branch:routingBranchSchema,login:z.object({username:branchUsernameSchema,password:branchPasswordSchema}).strict(),zone:deliveryZoneSchema.optional()}).strict().superRefine((value,context)=>{
 if(value.branch.enabled===true&&!value.branch.location)context.addIssue({code:'custom',message:'Choose a branch location before accepting deliveries.'});
 if(value.zone&&(value.zone.revision!==0||value.zone.branches.length!==1||value.zone.branches[0]?.branchId!==value.branch.id||!value.branch.location))context.addIssue({code:'custom',message:'The delivery area must belong to this branch and have a branch location.'});
});
export const branchLoginInputSchema=z.object({key:z.uuid(),branchId:z.uuid(),expectedRevision:z.number().int().nonnegative(),expectedLoginId:z.string().regex(/^[a-f0-9]{24}$/i).nullable(),username:branchUsernameSchema,password:branchPasswordSchema,enabled:z.boolean()}).strict();
export const branchWorkspaceSchema=z.object({routing:orderRoutingSchema,zones:z.array(deliveryZoneSchema),settings:zoneSettingsSchema,logins:z.array(z.object({id:z.string(),branchId:z.uuid(),username:z.string(),revision:z.number().int().nonnegative(),disabled:z.boolean()})),stockedProducts:z.array(z.object({branchId:z.uuid(),count:z.number().int().nonnegative()})).default([]),staffing:z.array(z.object({branchId:z.uuid(),count:z.number()})),legacyStaff:z.number()});
export type BranchWorkspace=z.infer<typeof branchWorkspaceSchema>;

export const branchLoginAvailabilityQuerySchema=z.object({username:branchUsernameSchema}).strict();
export const branchLoginAvailabilitySchema=z.object({username:branchUsernameSchema,available:z.boolean(),suggestion:branchUsernameSchema.nullable()}).strict();
export type BranchLoginAvailability=z.infer<typeof branchLoginAvailabilitySchema>;
