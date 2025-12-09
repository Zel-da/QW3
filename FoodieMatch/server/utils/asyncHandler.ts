import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * 비동기 라우트 핸들러 래퍼
 * try-catch 없이 async 함수를 사용할 수 있게 해주며,
 * 에러 발생 시 자동으로 Express 에러 핸들러로 전달
 *
 * @example
 * // Before
 * app.get("/api/users", async (req, res) => {
 *   try {
 *     const users = await prisma.user.findMany();
 *     res.json(users);
 *   } catch (error) {
 *     console.error('Error:', error);
 *     res.status(500).json({ message: "오류 발생" });
 *   }
 * });
 *
 * // After
 * app.get("/api/users", asyncHandler(async (req, res) => {
 *   const users = await prisma.user.findMany();
 *   res.json(users);
 * }));
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 여러 미들웨어를 순차적으로 실행하는 헬퍼
 * 각 미들웨어가 에러를 던지면 자동으로 에러 핸들러로 전달
 */
export const chainMiddleware = (...middlewares: RequestHandler[]): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    for (const middleware of middlewares) {
      await new Promise<void>((resolve, reject) => {
        middleware(req, res, (err?: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    next();
  };
};
