import { Router } from "express";
import { receiveLiveKitWebhook } from "../controllers/webhooks.controller";

export const webhooksRouter = Router();

webhooksRouter.post("/livekit", receiveLiveKitWebhook);
