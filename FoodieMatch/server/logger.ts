import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  )
);

// Render.com uses ephemeral filesystem - file logs disappear on restart
// Only use file logging in non-Render environments (로컬/자체서버)
const isRender = process.env.RENDER === 'true';

// Define transports
const transports: winston.transport[] = [
  // Console transport (항상 사용)
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

// 파일 로깅은 Render가 아닌 환경에서만 사용 (메모리 절약)
if (!isRender) {
  transports.push(
    new DailyRotateFile({
      filename: path.join(__dirname, '../logs/error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format,
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
    new DailyRotateFile({
      filename: path.join(__dirname, '../logs/combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format,
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
  );
}

// Create logger
const loggerOptions: winston.LoggerOptions = {
  level: level(),
  levels,
  format,
  transports,
  exitOnError: false,
};

// Exception/rejection handlers only for non-Render (파일 기반)
if (!isRender) {
  loggerOptions.exceptionHandlers = [
    new DailyRotateFile({
      filename: path.join(__dirname, '../logs/exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
  ];
  loggerOptions.rejectionHandlers = [
    new DailyRotateFile({
      filename: path.join(__dirname, '../logs/rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
  ];
}

const logger = winston.createLogger(loggerOptions);

export default logger;
