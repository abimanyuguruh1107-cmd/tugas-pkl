import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { rateLimit } from "../middleware/rate-limit.middleware";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/auth.schema";

/** Minimal body-validation middleware driven by the zod schemas. */
function validate(schema: { parse: (req: unknown) => unknown }) {
  return (req: unknown, _res: unknown, next: (err?: unknown) => void) => {
    try {
      schema.parse(req);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export const authRouter = Router();

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

authRouter.post(
  "/register",
  authRateLimit,
  validate(registerSchema),
  authController.register,
);
authRouter.post(
  "/login",
  loginRateLimit,
  validate(loginSchema),
  authController.login,
);
authRouter.post(
  "/refresh",
  authRateLimit,
  validate(refreshSchema),
  authController.refresh,
);
authRouter.post(
  "/logout",
  authRateLimit,
  validate(refreshSchema),
  authController.logout,
);
authRouter.post(
  "/forgot-password",
  loginRateLimit,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
authRouter.post(
  "/reset-password",
  loginRateLimit,
  validate(resetPasswordSchema),
  authController.resetPassword,
);

// Authenticated routes
authRouter.get("/me", authenticate, authController.me);
