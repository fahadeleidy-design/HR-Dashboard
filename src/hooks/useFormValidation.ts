import { useState, useCallback } from 'react';
import { z } from 'zod';

interface ValidationState {
  errors: Record<string, string>;
  isValid: boolean;
}

export function useFormValidation<T extends z.ZodSchema>(schema: T) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateForm = useCallback((data: unknown): ValidationState => {
    const result = schema.safeParse(data);

    if (result.success) {
      setFieldErrors({});
      return { errors: {}, isValid: true };
    }

    const errors: Record<string, string> = {};
    result.error.errors.forEach((err) => {
      const path = err.path.join('.');
      if (!errors[path]) {
        errors[path] = err.message;
      }
    });

    setFieldErrors(errors);
    return { errors, isValid: false };
  }, [schema]);

  const validateField = useCallback((fieldName: string, value: unknown, fullData: unknown) => {
    const result = schema.safeParse(fullData);

    if (result.success) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
      return;
    }

    const fieldError = result.error.errors.find(
      err => err.path.join('.') === fieldName
    );

    setFieldErrors(prev => {
      if (fieldError) {
        return { ...prev, [fieldName]: fieldError.message };
      }
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }, [schema]);

  const clearErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setFieldErrors(prev => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }, []);

  return {
    fieldErrors,
    validateForm,
    validateField,
    clearErrors,
    clearFieldError,
  };
}
