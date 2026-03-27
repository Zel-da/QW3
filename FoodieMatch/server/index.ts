// 서버 타임존을 한국 시간(KST)으로 설정
// 모든 new Date(), getDate(), getMonth() 등이 한국 시간 기준으로 동작
process.env.TZ = 'Asia/Seoul';

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import helmet from "helmet";
import compression from "compression";
import { prisma, startConnectionHealthCheck, syncSequences } from "./db";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import logger from "./logger";
import { verifyEmailConnection, ensureEmailConfigs } from "./simpleEmailService";
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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

const sessionSecret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('SESSION_SECRET environment variable must be set in production');
}

// MemoryStore - 서버 재시작 시 세션 초기화됨
const MemStore = MemoryStore(session);
const sessionStore = new MemStore({
  checkPeriod: 60000, // 1분마다 만료 세션 정리 (10분→1분)
  max: 100,
});

app.set('trust proxy', 1);

app.use(session({
  store: sessionStore,
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    // Cloud deployment (Render): HTTPS uses secure cookies
    // Local/Internal network: HTTP uses non-secure cookies
    secure: process.env.NODE_ENV === 'production' && process.env.RENDER === 'true',
    httpOnly: true, // Prevent XSS attacks by not allowing JavaScript to access the cookie
    sameSite: 'lax', // Allow cookies in same-site requests
    maxAge: 1000 * 60 * 60 * 4 // 4시간 (메모리 절약 - 1일→4시간, rolling으로 활성 유저는 유지)
  },
  name: 'sessionId', // Custom name instead of default 'connect.sid' for security through obscurity
  rolling: true, // Reset maxAge on every response (keep active sessions alive)
}));

// Health check endpoint - DB 조회 없음 (Cron용)
app.get('/api/ping', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 메모리 상세 분석 endpoint
app.get('/api/memory', (_req, res) => {
  const v8 = require('v8');
  const mem = process.memoryUsage();
  const heapStats = v8.getHeapStatistics();
  const heapSpaces = v8.getHeapSpaceStatistics();
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);

  const MB = (bytes: number) => `${Math.round(bytes / 1024 / 1024)}MB`;

  // 세션 수 카운트
  let sessionCount = 0;
  try {
    // memorystore의 내부 Map에서 크기 가져오기
    const store = sessionStore as any;
    if (store.sessions) sessionCount = Object.keys(store.sessions).length;
    else if (store.store) sessionCount = store.store.size || Object.keys(store.store).length;
  } catch { /* ignore */ }

  // chatHistories는 routes.ts에서 global로 노출
  const chatHistorySize = (global as any).__chatHistoriesSize || 0;

  // 모듈 캐시 크기
  const moduleCount = Object.keys(require.cache).length;

  // V8 힙 공간별 분석
  const spaces = heapSpaces.map((s: any) => ({
    name: s.space_name,
    used: MB(s.space_used_size),
    size: MB(s.space_size),
    available: MB(s.space_available_size),
  }));

  res.json({
    summary: {
      rss: MB(mem.rss),
      heapUsed: MB(mem.heapUsed),
      heapTotal: MB(mem.heapTotal),
      external: MB(mem.external),
      arrayBuffers: MB(mem.arrayBuffers),
      uptime: `${hours}h ${minutes}m`,
    },
    breakdown: {
      sessions: sessionCount,
      chatHistories: chatHistorySize,
      modules: moduleCount,
      activeExcelJobs: (global as any).__activeExcelJobs || 0,
    },
    v8: {
      totalHeapSize: MB(heapStats.total_heap_size),
      usedHeapSize: MB(heapStats.used_heap_size),
      heapSizeLimit: MB(heapStats.heap_size_limit),
      mallocedMemory: MB(heapStats.malloced_memory),
      totalGlobalHandles: heapStats.number_of_native_contexts,
    },
    heapSpaces: spaces,
  });
});

// HTTP request logging middleware with Winston
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

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

      log(message);
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
    await ensureEmailConfigs();

    // Start email schedulers
    await startAllSchedulers();
    log('✅ Email service initialized with schedulers');

    // Database health check 비활성화 (Neon CU 절약)
    // Neon은 유휴 시 auto-suspend하여 CU를 절약함
    // Prisma는 연결 끊어져도 다음 요청 시 자동 재연결하므로 health check 불필요
    // startConnectionHealthCheck(4 * 60 * 1000);

    // Sync database sequences to prevent ID conflicts
    await syncSequences();

    const port = parseInt(process.env.PORT || '5000', 10);

    // 주기적 메모리 모니터링 + GC (5분마다)
    setInterval(() => {
      const mem = process.memoryUsage();
      const rss = Math.round(mem.rss / 1024 / 1024);
      const heap = Math.round(mem.heapUsed / 1024 / 1024);
      if (rss > 350) {
        console.warn(`⚠️  메모리 경고: RSS ${rss}MB, Heap ${heap}MB`);
        if (global.gc) {
          global.gc();
          const after = process.memoryUsage();
          console.log(`  🧹 GC 실행: ${rss}MB → ${Math.round(after.rss / 1024 / 1024)}MB`);
        }
      }
    }, 5 * 60 * 1000);

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
