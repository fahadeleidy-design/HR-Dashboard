import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { errorHandler, logError, logActivity, ErrorSeverity, LogLevel } from '../lib/errorHandler';

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
    logActivity: (level: LogLevel, category: string, action: string, description?: string, context?: any) =>
      logActivity(level, category, action, description, context),
  };
}
