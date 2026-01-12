// Structured logging for production debugging
// In production, logs are JSON for easy parsing by log aggregators (Datadog, CloudWatch, etc.)

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// Minimum log level (configurable via env)
const MIN_LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

function formatLog(level: LogLevel, message: string, context?: LogContext, error?: Error): string {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && Object.keys(context).length > 0 && { context }),
    ...(error && {
      error: {
        name: error.name,
        message: error.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
      }
    })
  };

  // JSON in production, pretty print in development
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(entry);
  }

  // Development: colored, readable output
  const colors: Record<LogLevel, string> = {
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m',  // green
    warn: '\x1b[33m',  // yellow
    error: '\x1b[31m'  // red
  };
  const reset = '\x1b[0m';
  const color = colors[level];

  let output = `${color}[${level.toUpperCase()}]${reset} ${message}`;
  if (context && Object.keys(context).length > 0) {
    output += ` ${JSON.stringify(context)}`;
  }
  if (error) {
    output += `\n  Error: ${error.message}`;
    if (error.stack) {
      output += `\n  ${error.stack.split('\n').slice(1, 4).join('\n  ')}`;
    }
  }
  return output;
}

function log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
  if (!shouldLog(level)) return;

  const formatted = formatLog(level, message, context, error);

  switch (level) {
    case 'debug':
    case 'info':
      console.log(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
      console.error(formatted);
      break;
  }
}

// Main logger object
export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext, error?: Error) => log('warn', message, context, error),
  error: (message: string, context?: LogContext, error?: Error) => log('error', message, context, error),

  // Convenience method for API routes
  api: (method: string, path: string, context?: LogContext) => {
    log('info', `${method} ${path}`, context);
  },

  // Convenience method for cron jobs
  cron: (jobName: string, message: string, context?: LogContext) => {
    log('info', `[CRON:${jobName}] ${message}`, context);
  },

  // Convenience method for database operations
  db: (operation: string, context?: LogContext) => {
    log('debug', `[DB] ${operation}`, context);
  },

  // Convenience method for Stripe operations
  stripe: (operation: string, context?: LogContext) => {
    log('info', `[Stripe] ${operation}`, context);
  },

  // Convenience method for webhooks
  webhook: (source: string, event: string, context?: LogContext) => {
    log('info', `[Webhook:${source}] ${event}`, context);
  }
};

// Request context helper for API routes
export function createRequestLogger(request: Request) {
  const url = new URL(request.url);
  const method = request.method;
  const path = url.pathname;
  const requestId = crypto.randomUUID().slice(0, 8);

  return {
    ...logger,
    requestId,
    info: (message: string, context?: LogContext) =>
      logger.info(message, { requestId, method, path, ...context }),
    warn: (message: string, context?: LogContext, error?: Error) =>
      logger.warn(message, { requestId, method, path, ...context }, error),
    error: (message: string, context?: LogContext, error?: Error) =>
      logger.error(message, { requestId, method, path, ...context }, error)
  };
}
