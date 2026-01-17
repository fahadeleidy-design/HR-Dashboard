import { supabase } from './supabase';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface ErrorContext {
  component?: string;
  action?: string;
  endpoint?: string;
  method?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

interface ActivityLogContext {
  module?: string;
  entityType?: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  metadata?: Record<string, any>;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private companyId: string | null = null;
  private userId: string | null = null;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  setContext(companyId: string | null, userId: string | null) {
    this.companyId = companyId;
    this.userId = userId;
  }

  async logError(
    error: Error | unknown,
    severity: ErrorSeverity = 'medium',
    context?: ErrorContext
  ): Promise<void> {
    try {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stackTrace = error instanceof Error ? error.stack : undefined;

      const errorData = {
        company_id: this.companyId,
        user_id: this.userId,
        error_type: error instanceof Error ? error.constructor.name : 'UnknownError',
        error_message: errorMessage,
        stack_trace: stackTrace,
        severity,
        component: context?.component,
        action: context?.action,
        endpoint: context?.endpoint,
        method: context?.method,
        metadata: context?.metadata || {},
        tags: context?.tags || [],
        session_id: this.getSessionId(),
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString(),
      };

      await supabase.from('system_error_logs').insert(errorData);

      if (severity === 'critical' || severity === 'high') {
        console.error('🚨 Critical Error:', errorMessage, context);
      }
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  }

  async logActivity(
    level: LogLevel,
    category: string,
    action: string,
    description?: string,
    context?: ActivityLogContext
  ): Promise<void> {
    try {
      const activityData = {
        company_id: this.companyId,
        user_id: this.userId,
        level,
        category,
        action,
        description,
        module: context?.module,
        entity_type: context?.entityType,
        entity_id: context?.entityId,
        old_values: context?.oldValues,
        new_values: context?.newValues,
        metadata: context?.metadata || {},
        session_id: this.getSessionId(),
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString(),
      };

      await supabase.from('system_activity_logs').insert(activityData);
    } catch (loggingError) {
      console.error('Failed to log activity:', loggingError);
    }
  }

  async logPerformance(
    metricType: string,
    metricName: string,
    executionTimeMs: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const performanceData = {
        company_id: this.companyId,
        metric_type: metricType,
        metric_name: metricName,
        execution_time_ms: executionTimeMs,
        user_id: this.userId,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
      };

      await supabase.from('system_performance_metrics').insert(performanceData);
    } catch (loggingError) {
      console.error('Failed to log performance:', loggingError);
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  async handleApiError(
    error: any,
    endpoint: string,
    method: string = 'GET'
  ): Promise<void> {
    const severity: ErrorSeverity = error.status >= 500 ? 'high' : 'medium';
    await this.logError(error, severity, {
      component: 'API',
      endpoint,
      method,
      metadata: {
        status: error.status,
        statusText: error.statusText,
        response: error.data,
      },
    });
  }

  async wrapAsync<T>(
    fn: () => Promise<T>,
    context: ErrorContext
  ): Promise<T | null> {
    const startTime = performance.now();
    try {
      const result = await fn();
      const executionTime = Math.round(performance.now() - startTime);

      await this.logPerformance(
        'function',
        context.component || 'unknown',
        executionTime,
        { action: context.action }
      );

      return result;
    } catch (error) {
      const executionTime = Math.round(performance.now() - startTime);
      await this.logError(error, 'high', {
        ...context,
        metadata: { ...context.metadata, executionTime },
      });
      throw error;
    }
  }
}

export const errorHandler = ErrorHandler.getInstance();

export function logError(
  error: Error | unknown,
  severity: ErrorSeverity = 'medium',
  context?: ErrorContext
) {
  return errorHandler.logError(error, severity, context);
}

export function logActivity(
  level: LogLevel,
  category: string,
  action: string,
  description?: string,
  context?: ActivityLogContext
) {
  return errorHandler.logActivity(level, category, action, description, context);
}

export function logPerformance(
  metricType: string,
  metricName: string,
  executionTimeMs: number,
  metadata?: Record<string, any>
) {
  return errorHandler.logPerformance(metricType, metricName, executionTimeMs, metadata);
}

export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: ErrorContext
): T {
  return (async (...args: any[]) => {
    return errorHandler.wrapAsync(() => fn(...args), context);
  }) as T;
}
