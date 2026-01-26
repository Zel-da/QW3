import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import helmet from "helmet";
import compression from "compression";
import { prisma, startConnectionHealthCheck, syncSequences } from "./db";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import logger from "./logger";
import { verifyEmailConnection } from "./simpleEmailService";
import { startAllSchedulers } from "./scheduler";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

// R2 Storage URLs (Cloudflare R2)
const R2_STORAGE_URL = "https://pub-1a48d08cdc484562bf1ba171b1a2c139.r2.dev";
const R2_STORAGE_URL_2 = "https://pub-1a48d08cdc484562bf1ba171b12fb4f5.r2.dev";

// Security middleware - HTTP 헤더 보안
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // React/Vite 필요
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], // TailwindCSS + Google Fonts
      imgSrc: ["'self'", "data:", "https:", "blob:", R2_STORAGE_URL, R2_STORAGE_URL_2], // R2 이미지 허용
      connectSrc: ["'self'", "https://generativelanguage.googleapis.com", "https://fonts.googleapis.com", "https://fonts.gstatic.com", "wss:", "ws:", R2_STORAGE_URL, R2_STORAGE_URL_2], // Gemini API + WebSocket + Google Fonts + R2
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"], // Google Fonts 폰트 파일
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:", "data:", R2_STORAGE_URL, R2_STORAGE_URL_2], // R2 미디어(오디오/비디오) 허용
      frameSrc: ["'self'", "https://www.youtube.com", "https://youtube.com", "https://www.youtube-nocookie.com"], // YouTube 임베드 (privacy-enhanced)
      frameAncestors: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: null, // 내부망 HTTP 허용
    }
  },
  crossOriginEmbedderPolicy: false, // 외부 리소스 로드 허용
}));

// Compression middleware - 응답 gzip 압축 (번들 크기 ~70% 감소)
app.use(compression());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

const sessionSecret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('SESSION_SECRET environment variable must be set in production');
}

// MemoryStore - 서버 재시작 시 세션 초기화됨
const MemStore = MemoryStore(session);

app.set('trust proxy', 1);

app.use(session({
  store: new MemStore({
    checkPeriod: 86400000, // 24시간마다 만료된 세션 정리
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

// Health check endpoint - DB 조회 없음 (Cron용)
app.get('/api/ping', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

// Server initialization - using top-level await for proper ESM handling
async function startServer() {
  try {
    const server = await registerRoutes(app);

    // 통합 에러 핸들러 사용 (ApiError, Multer, Prisma 에러 자동 처리)
    app.use(errorHandler);

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Initialize email service
    await verifyEmailConnection();

    // Start email schedulers
    await startAllSchedulers();
    log('✅ Email service initialized with schedulers');

    // Start database connection health check (prevents idle connection drops)
    startConnectionHealthCheck(5 * 60 * 1000); // 5분마다 체크

    // Sync database sequences to prevent ID conflicts
    await syncSequences();

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
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Use top-level await for proper ESM module initialization
await startServer();
