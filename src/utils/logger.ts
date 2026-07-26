/**
 * Simple Structured JSON Logger
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

interface LogPayload {
  level: LogLevel;
  timestamp: string;
  context: string;
  message: string;
  data?: unknown;
}

const formatLog = (level: LogLevel, context: string, message: string, data?: unknown) => {
  const payload: LogPayload = {
    level,
    timestamp: new Date().toISOString(),
    context,
    message,
    ...(data && { data })
  };
  return JSON.stringify(payload);
};

export const logger = {
  info: (context: string, message: string, data?: unknown) => {
    console.log(formatLog('INFO', context, message, data));
  },
  warn: (context: string, message: string, data?: unknown) => {
    console.warn(formatLog('WARN', context, message, data));
  },
  error: (context: string, message: string, error?: unknown) => {
    const errorData = error instanceof Error 
      ? { name: error.name, message: error.message, stack: error.stack }
      : { error };
    console.error(formatLog('ERROR', context, message, errorData));
  }
};
