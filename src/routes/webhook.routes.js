import express from "express";
import { handleOrderWebhook } from "../controllers/webhook.controller.js";
import { handleCheckoutWebhook } from "../controllers/checkout.webhook.controller.js";
const router = express.Router();

// Shopify Order Created Webhook
router.post("/shopify/order", handleOrderWebhook);



export default router;