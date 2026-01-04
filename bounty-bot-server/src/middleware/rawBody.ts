import { Request, Response, NextFunction } from "express";

/**
 * Extend Express Request type to include rawBody
 */
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

/**
 * Middleware to capture raw body for webhook signature verification
 * This is REQUIRED for GitHub webhook verification
 */
export function rawBodyMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only capture for webhook routes
    if (req.path.includes("/webhook")) {
      let data = "";
      req.setEncoding("utf8");

      req.on("data", (chunk) => {
        data += chunk;
      });

      req.on("end", () => {
        req.rawBody = Buffer.from(data);
        try {
          req.body = JSON.parse(data);
        } catch (error) {
          req.body = {};
        }
        next();
      });
    } else {
      next();
    }
  };
}
