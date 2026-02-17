import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { errorHandler, logError, logActivity, ErrorSeverity, LogLevel } from '../lib/errorHandler';

const VALID_LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];

function normalizeLogActivityArgs(
  first: string,
  second?: string | Record<string, any>,
  third?: string | Record<string, any>,
  fourth?: string,
  fifth?: any
): [LogLevel, string, string, string | undefined, any] {
  if (VALID_LOG_LEVELS.includes(first as LogLevel) && typeof second === 'string' && typeof third === 'string') {
    return [first as LogLevel, second, third, fourth, fifth];
  }

  if (typeof first === 'string' && typeof second === 'string' && typeof third === 'object') {
    return ['info', first, second, undefined, third];
  }

  if (typeof first === 'string' && typeof second === 'object') {
    const category = (second as any)?.component || 'general';
    return ['info', category, first, undefined, second as any];
  }

  if (typeof first === 'string' && second === undefined) {
    return ['info', 'general', first, undefined, undefined];
  }

  return [first as LogLevel, second as string, third as string, fourth, fifth];
}

export function useErrorHandler() {
  const { user } = useAuth();
  const { currentCompany } = useCompany();

  useEffect(() => {
    errorHandler.setContext(
      currentCompany?.id || null,
      user?.id || null
    );
  }, [currentCompany?.id, user?.id]);

  return {
    logError: (error: Error | unknown, severity?: ErrorSeverity, context?: any) =>
      logError(error, severity, context),
    logActivity: (first: any, second?: any, third?: any, fourth?: any, fifth?: any) => {
      const [level, category, action, description, context] = normalizeLogActivityArgs(first, second, third, fourth, fifth);
      return logActivity(level, category, action, description, context);
    },
  };
}
