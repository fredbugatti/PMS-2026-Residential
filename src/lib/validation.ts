import { z } from 'zod';

// Common field schemas
export const idSchema = z.string().uuid('Invalid ID format');
export const emailSchema = z.string().email('Invalid email format');
export const phoneSchema = z.string().regex(/^[\d\s\-+()]+$/, 'Invalid phone format').optional().or(z.literal(''));
export const dateSchema = z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));
export const positiveAmountSchema = z.number().positive('Amount must be greater than zero');
export const nonNegativeAmountSchema = z.number().nonnegative('Amount cannot be negative');

// Lease schemas
export const createLeaseSchema = z.object({
  propertyId: idSchema,
  unitId: idSchema,
  tenantName: z.string().min(1, 'Tenant name is required').max(200),
  tenantEmail: emailSchema.optional().or(z.literal('')),
  tenantPhone: phoneSchema,
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  monthlyRentAmount: positiveAmountSchema,
  securityDepositAmount: nonNegativeAmountSchema.optional(),
  chargeDay: z.number().int().min(1).max(28).optional(),
  notes: z.string().max(5000).optional()
});

export const updateLeaseSchema = createLeaseSchema.partial();

// Payment schemas
export const paymentSchema = z.object({
  amount: positiveAmountSchema,
  leaseId: idSchema,
  description: z.string().max(500).optional(),
  paymentDate: z.string().optional()
});

// Charge schemas
export const chargeSchema = z.object({
  amount: positiveAmountSchema,
  leaseId: idSchema,
  accountCode: z.string().regex(/^\d{4}$/, 'Account code must be 4 digits'),
  description: z.string().max(500).optional(),
  chargeDate: z.string().optional()
});

export const bulkChargeSchema = z.object({
  charges: z.array(chargeSchema).min(1, 'At least one charge is required')
});

// Deposit schemas
export const receiveDepositSchema = z.object({
  amount: positiveAmountSchema,
  leaseId: idSchema,
  description: z.string().max(500).optional(),
  depositDate: z.string().optional()
});

export const returnDepositSchema = z.object({
  amount: positiveAmountSchema,
  leaseId: idSchema,
  description: z.string().max(500).optional(),
  returnDate: z.string().optional(),
  deductions: z.array(z.object({
    amount: positiveAmountSchema,
    description: z.string().max(500).optional()
  })).optional()
});

// Property schemas
export const createPropertySchema = z.object({
  name: z.string().min(1, 'Property name is required').max(200),
  address: z.string().min(1, 'Address is required').max(500),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().length(2, 'State must be 2-letter code'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  type: z.enum(['SINGLE_FAMILY', 'MULTI_FAMILY', 'COMMERCIAL', 'MIXED_USE']).optional()
});

export const updatePropertySchema = createPropertySchema.partial();

// Unit schemas
export const createUnitSchema = z.object({
  propertyId: idSchema,
  unitNumber: z.string().min(1, 'Unit number is required').max(50),
  dockDoors: z.number().int().min(0).optional(),
  clearHeight: z.number().min(0).optional(),
  floorLevel: z.number().int().min(0).optional(),
  palletPositions: z.number().int().min(0).optional(),
  squareFeet: z.number().int().positive().optional(),
  marketRent: positiveAmountSchema.optional()
});

export const updateUnitSchema = createUnitSchema.partial();

// Work order schemas
export const createWorkOrderSchema = z.object({
  propertyId: idSchema,
  unitId: idSchema.optional(),
  leaseId: idSchema.optional(),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional(),
  category: z.enum(['PLUMBING', 'ELECTRICAL', 'HVAC', 'APPLIANCE', 'STRUCTURAL', 'PEST', 'LANDSCAPING', 'OTHER']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  vendorId: idSchema.optional(),
  scheduledDate: z.string().optional()
});

export const updateWorkOrderSchema = createWorkOrderSchema.partial().extend({
  status: z.enum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional()
});

// Scheduled charge schemas
export const scheduledChargeSchema = z.object({
  leaseId: idSchema,
  accountCode: z.string().regex(/^\d{4}$/, 'Account code must be 4 digits'),
  amount: positiveAmountSchema,
  frequency: z.enum(['MONTHLY', 'WEEKLY', 'BIWEEKLY', 'QUARTERLY', 'ANNUALLY', 'ONCE']),
  dayOfMonth: z.number().int().min(1).max(28).optional(),
  description: z.string().max(500).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

// Scheduled expense schemas
export const scheduledExpenseSchema = z.object({
  propertyId: idSchema,
  accountCode: z.string().regex(/^\d{4}$/, 'Account code must be 4 digits'),
  amount: positiveAmountSchema,
  frequency: z.enum(['MONTHLY', 'WEEKLY', 'BIWEEKLY', 'QUARTERLY', 'ANNUALLY', 'ONCE']),
  dayOfMonth: z.number().int().min(1).max(28).optional(),
  description: z.string().min(1, 'Description is required').max(500),
  vendorId: idSchema.optional(),
  requiresConfirmation: z.boolean().optional()
});

// Rent increase schemas
export const rentIncreaseSchema = z.object({
  leaseId: idSchema,
  newAmount: positiveAmountSchema,
  effectiveDate: z.string().min(1, 'Effective date is required'),
  reason: z.string().max(500).optional(),
  noticeDate: z.string().optional()
});

// Vendor schemas
export const createVendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required').max(200),
  email: emailSchema.optional().or(z.literal('')),
  phone: phoneSchema,
  address: z.string().max(500).optional(),
  specialty: z.string().max(100).optional(),
  notes: z.string().max(5000).optional()
});

export const updateVendorSchema = createVendorSchema.partial();

// Ledger entry schema (for manual entries)
export const ledgerEntrySchema = z.object({
  accountCode: z.string().regex(/^\d{4}$/, 'Account code must be 4 digits'),
  amount: positiveAmountSchema,
  debitCredit: z.enum(['DR', 'CR']),
  description: z.string().max(500).optional(),
  entryDate: z.string().optional(),
  leaseId: idSchema.optional()
});

// Validate and return parsed data or throw formatted error
export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const zodError = result.error;
    const errors = zodError.issues.map(e => `${e.path.join('.')}: ${e.message}`);
    throw new ValidationError(errors.join('; '), zodError.issues);
  }
  return result.data;
}

// Custom validation error class
export class ValidationError extends Error {
  public readonly errors: z.ZodIssue[];

  constructor(message: string, errors: z.ZodIssue[]) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}
