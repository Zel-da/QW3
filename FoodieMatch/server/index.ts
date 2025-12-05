import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import pgSimple from "connect-pg-simple";
import pg from "pg";
import helmet from "helmet";
import compression from "compression";
import { prisma, startConnectionHealthCheck } from "./db";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import logger from "./logger";
import { verifyEmailConnection } from "./simpleEmailService";
import { startAllSchedulers } from "./scheduler";

const app = express();

// Security middleware - HTTP 헤더 보안
app.use(helmet({
  contentSecurityPolicy: false, // SPA 호환성을 위해 비활성화
  crossOriginEmbedderPolicy: false, // 외부 리소스 로드 허용
}));

// Compression middleware - 응답 gzip 압축 (번들 크기 ~70% 감소)
app.use(compression());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const sessionSecret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('SESSION_SECRET environment variable must be set in production');
}

const PgSession = pgSimple(session);

// Create PostgreSQL connection pool for sessions
const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

app.set('trust proxy', 1);

app.use(session({
  store: new PgSession({
    pool: pgPool,
    tableName: 'user_sessions',
    createTableIfMissing: true,
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    // Cloud deployment (Render): HTTPS uses secure cookies
    // Local/Internal network: HTTP uses non-secure cookies
    secure: process.env.NODE_ENV === 'production' && process.env.RENDER === 'true',
    httpOnly: true, // Prevent XSS attacks by not allowing JavaScript to access the cookie
    sameSite: 'lax', // Allow cookies in same-site requests
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days (reduced from 30 for better security)
  },
  name: 'sessionId', // Custom name instead of default 'connect.sid' for security through obscurity
  rolling: true, // Reset maxAge on every response (keep active sessions alive)
}));

// HTTP request logging middleware with Winston
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const message = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

      // Use Winston logger with appropriate level
      const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'http';

      logger.log(logLevel, message, {
        method: req.method,
        path,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: (req.session as any)?.user?.id,
      });

      // Also log to console for backward compatibility
      let logLine = message;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // 에러 로깅 (스택 트레이스 포함)
    logger.error('Express error handler:', {
      status,
      message,
      stack: err.stack,
      url: _req.url,
      method: _req.method
    });

    res.status(status).json({ message });
    // throw err 제거: 이미 응답을 보냈으므로 서버 크래시 방지
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  // Initialize email service
  await verifyEmailConnection();

  // Start email schedulers
  await startAllSchedulers();
  log('✅ Email service initialized with schedulers');

  // Start database connection health check (prevents idle connection drops)
  startConnectionHealthCheck(5 * 60 * 1000); // 5분마다 체크

  const port = parseInt(process.env.PORT || '5000', 10);

  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });

  server.on('error', (err: any) => {
    console.error(`❌ Server error:`, err);
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use. Please stop the conflicting process and try again.`);
      process.exit(1);
    }
  });
})();
