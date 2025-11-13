import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import pgSimple from "connect-pg-simple";
import pg from "pg";
import { prisma } from "./db";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import logger from "./logger";
import { verifyEmailConnection } from "./emailService";
import { startAllSchedulers } from "./scheduler";

const app = express();
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
    secure: false, // Internal HTTP network - set to false even in production
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

  // Start email schedulers (only in production or if explicitly enabled)
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_EMAIL_SCHEDULERS === 'true') {
    await startAllSchedulers();
  } else {
    log('⏸️  Email schedulers disabled (set ENABLE_EMAIL_SCHEDULERS=true to enable in development)');
  }

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
