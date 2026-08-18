// controllers/webhook.controller.js

import { getMerchantByShopDomain } from "../queries/merchant.queries.js";
import { processOrderWebhook } from "../services/webhook.service.js";

/**
 * Shopify orders/create webhook
 */
export const handleOrderWebhook = async (req, res) => {
  try {
    // Shopify sends this header with every webhook
    console.log("Webhook.controllers.js");
    const shopDomain =
      req.headers["x-shopify-shop-domain"] ||
      req.headers["shopify-shop-domain"];

    if (!shopDomain) {
      return res.status(400).json({
        success: false,
        message: "Missing Shopify shop domain.",
      });
    }

    // Find the merchant who owns this Shopify store
    const merchant = await getMerchantByShopDomain(shopDomain);

    if (!merchant) {
      console.log("Merchant not found")
      return res.status(404).json({
        success: false,
        message: "Merchant not found.",
      });
    }

    // Process the webhook
    console.log(req.body);
    console.log(merchant.uid);
    const order = await processOrderWebhook(
      merchant.uid,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Webhook processed successfully.",
      order,
    });

  } catch (error) {
    console.error("Webhook Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error.",
    });
  }
};