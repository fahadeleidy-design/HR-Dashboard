import { z } from 'zod';
import { logError } from '../errorHandler';

export class ValidationError extends Error {
  constructor(
    public errors: Record<string, string[]>,
    message: string = 'Validation failed'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export async function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: { component?: string; action?: string }
): Promise<T> {
  try {
    return await schema.parseAsync(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors: Record<string, string[]> = {};

      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!formattedErrors[path]) {
          formattedErrors[path] = [];
        }
        formattedErrors[path].push(err.message);
      });

      const validationError = new ValidationError(formattedErrors);

      await logError(validationError, 'low', {
        component: context?.component || 'Validation',
        action: context?.action || 'validate',
        metadata: {
          errors: formattedErrors,
          schema: schema.description,
        },
      });

      throw validationError;
    }
    throw error;
  }
}

export function validateSync<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string[]> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const formattedErrors: Record<string, string[]> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!formattedErrors[path]) {
      formattedErrors[path] = [];
    }
    formattedErrors[path].push(err.message);
  });

  return { success: false, errors: formattedErrors };
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, 10000);
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeInput(sanitized[key] as string) as T[Extract<keyof T, string>];
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key]) as T[Extract<keyof T, string>];
    }
  }

  return sanitized;
}

export function validateFileUpload(
  file: File,
  options: {
    maxSizeMB?: number;
    allowedTypes?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const { maxSizeMB = 10, allowedTypes } = options;

  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      valid: false,
      error: `File size must be less than ${maxSizeMB}MB`,
    };
  }

  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type must be one of: ${allowedTypes.join(', ')}`,
    };
  }

  return { valid: true };
}

export function validateDateRange(
  startDate: Date | string,
  endDate: Date | string
): { valid: boolean; error?: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }

  if (end < start) {
    return { valid: false, error: 'End date must be after start date' };
  }

  return { valid: true };
}

export function validateBusinessRules<T>(
  data: T,
  rules: Array<{
    validate: (data: T) => boolean;
    message: string;
  }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const rule of rules) {
    if (!rule.validate(data)) {
      errors.push(rule.message);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
