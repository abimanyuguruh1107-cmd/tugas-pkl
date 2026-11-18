import { Router, type RequestHandler } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { rateLimit } from "../middleware/rate-limit.middleware";
import { resolveTenant } from "../middleware/tenant.middleware";
import { validateRequest } from "../validators/validate";
import { searchQuerySchema } from "../validators/meeting.schemas";
import { search } from "../controllers/search.controller";
export const searchRouter = Router();
const searchLimit = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
searchRouter.get(
  "/search",
  authenticate,
  resolveTenant,
  searchLimit,
  validateRequest(searchQuerySchema) as RequestHandler,
  search,
);
