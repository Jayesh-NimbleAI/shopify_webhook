// services/webhook.service.js

import { getOrderByShopifyId, createOrder } from "../queries/orders.queries.js";
import { addAttributedRevenue, getLatestBroadcast, getBroadcastById } from "../queries/broadcast.queries.js";
import { hasContactClickedBroadcast, getLatestClickByContact } from "../queries/clicks.queries.js";
import { getContactByNormalizedPhone } from "../queries/contacts.queries.js";

/**
 * Normalize phone numbers to last 10 digits
 * Example: +91 98765-43210 -> 9876543210
 */
const normalizePhone = (phone) => {
  if (!phone) return null;
  return phone.replace(/\D/g, "").slice(-10);
};

// ─── Order Data Extraction Helpers ───────────────────────────────────────────

/**
 * Extract customer phone from order payload
 */
const getCustomerPhone = (orderPayload) => {
  const phone =
    orderPayload.customer?.phone ||
    orderPayload.shipping_address?.phone ||
    null;

  if (!phone) {
    console.log("📵 Customer has no phone number. Skipping webhook.");
    return null;
  }
  console.log("📞 Customer phone:", phone);
  return phone;
};

/**
 * Extract customer full name
 */
const getCustomerName = (orderPayload) =>
  `${orderPayload.customer?.first_name || ""} ${orderPayload.customer?.last_name || ""}`.trim();

/**
 * Extract customer email
 */
const getCustomerEmail = (orderPayload) =>
  orderPayload.customer?.email || null;

/**
 * Calculate total quantity across all line items
 */
const getTotalQuantity = (orderPayload) =>
  orderPayload.line_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

/**
 * Determine if order is Cash on Delivery
 */
const getIsCod = (orderPayload) => {
  const gatewayLower = (orderPayload.gateway || "").toLowerCase();
  const is_cod =
    gatewayLower.includes("cash on delivery") ||
    gatewayLower.includes("cod") ||
    orderPayload.financial_status === "pending";
  console.log("💵 Is COD:", is_cod);
  return is_cod;
};

// ─── Extraction Pipeline ─────────────────────────────────────────────────────

const orderExtractionSteps = [
  (orderPayload) => ({ customer_phone: getCustomerPhone(orderPayload) }),
  (orderPayload) => ({ customer_name: getCustomerName(orderPayload) }),
  (orderPayload) => ({ customer_email: getCustomerEmail(orderPayload) }),
  (orderPayload) => ({ total_quantity: getTotalQuantity(orderPayload) }),
  (orderPayload) => ({ is_cod: getIsCod(orderPayload) }),
];

const extractOrderData = (orderPayload) => {
  let orderData = {};
  for (const step of orderExtractionSteps) {
    orderData = { ...orderData, ...step(orderPayload) };
  }
  return orderData;
};

// ─── Order Builder ────────────────────────────────────────────────────────────

/**
 * Build the order DB object from extracted data + broadcast attribution
 */
const buildOrder = (userId, orderPayload, orderData, broadcast, contact) => {
  return {
    shopify_order_id:    orderPayload.id,
    shopify_order_name:  orderPayload.name,

    user_id:             userId,

    contact_id:          contact.contact_id,
    broadcast_id:        broadcast.broadcast_id,

    customer_name:       orderData.customer_name,
    customer_email:      orderData.customer_email,
    customer_phone:      orderData.customer_phone,

    total_amount:        Number(orderPayload.total_price),
    total_quantity:      orderData.total_quantity,
    currency:            orderPayload.currency,

    is_cod:              orderData.is_cod,

    financial_status:    orderPayload.financial_status,
    fulfillment_status:  orderPayload.fulfillment_status,

    webhook_payload:     orderPayload,

    ordered_at:          orderPayload.created_at,
  };
};

// ─── Main Webhook Handler ─────────────────────────────────────────────────────

/**
 * Process a Shopify orders/create webhook.
 *
 * Attribution flow:
 *   1. Receive webhook & merchant ID (resolved upstream in controller)
 *   2. Prevent duplicate orders
 *   3. Extract order info from payload
 *   4. Resolve contact by customer phone number
 *   5. Check click attribution on latest broadcast / merchant's clicked broadcast
 *   6. Only if clicked → store order + update attributed revenue
 */
export const processOrderWebhook = async (userId, orderPayload) => {
  try {
    console.log(`\n🚀 ── processOrderWebhook ──────────────────────────────`);
    console.log(`   userId       : ${userId}`);
    console.log(`   shopifyOrder : ${orderPayload.id}`);

    // ── Step 2: Duplicate guard ──────────────────────────────────────────────
    const existingOrder = await getOrderByShopifyId(orderPayload.id);
    if (existingOrder) {
      console.log("⚠️  Duplicate order received — skipping.");
      return { duplicate: true, order: existingOrder };
    }
    console.log("✅ Step 2: No duplicate found.");

    // ── Step 3: Extract order data ───────────────────────────────────────────
    const orderData = extractOrderData(orderPayload);
    console.log("📦 Step 3: Extracted order data:", orderData);

    if (!orderData.customer_phone) {
      console.log("📵 Step 3: No customer phone — cannot attribute. Skipping.");
      return { attributed: false, reason: "no_phone" };
    }

    const normalizedPhone = normalizePhone(orderData.customer_phone);
    console.log(`🔢 Normalized phone: ${normalizedPhone}`);

    // ── Step 4: Resolve contact by phone ────────────────────────────────────
    const contact = await getContactByNormalizedPhone(userId, normalizedPhone);
    if (!contact) {
      console.log(`👤 Step 4: Contact not found for phone ${normalizedPhone}. Customer is not a WhatsApp subscriber — skipping.`);
      return { attributed: false, reason: "contact_not_found" };
    }
    console.log(`🎯 Step 4: Contact found → contact_id: ${contact.contact_id}`);

    // ── Step 5: Resolve broadcast attribution ───────────────────────────────
    let broadcast = await getLatestBroadcast(userId);
    let clickRecord = null;

    if (broadcast) {
      console.log(`📡 Step 5: Latest merchant broadcast → ${broadcast.broadcast_id}`);
      // Check if contact clicked this latest broadcast
      clickRecord = await hasContactClickedBroadcast(
        contact.contact_id,
        broadcast.broadcast_id
      );
    }

    // If contact did not click the latest broadcast, check if they clicked ANY broadcast by this merchant
    if (!clickRecord) {
      const latestContactClick = await getLatestClickByContact(contact.contact_id);
      if (latestContactClick) {
        const clickedBroadcast = await getBroadcastById(latestContactClick.broadcast_id);
        if (clickedBroadcast && Number(clickedBroadcast.user_id) === Number(userId)) {
          console.log(
            `🎯 Attribution matched via contact click → broadcast_id: ${clickedBroadcast.broadcast_id}`
          );
          broadcast = clickedBroadcast;
          clickRecord = latestContactClick;
        }
      }
    }

    if (!clickRecord || !broadcast) {
      console.log(
        `🚫 Step 6: Contact ${contact.contact_id} has NOT clicked any broadcast for merchant ${userId}. Order will NOT be stored.`
      );
      return { attributed: false, reason: "no_click_on_broadcast" };
    }

    console.log(
      `✅ Step 6: Click confirmed! Broadcast: ${broadcast.broadcast_id}, Button: "${clickRecord.button_clicked}" at ${clickRecord.clicked_at}`
    );

    // ── Step 7: Build & store order ──────────────────────────────────────────
    const order = buildOrder(userId, orderPayload, orderData, broadcast, contact);
    await createOrder(order);
    console.log("💾 Step 7: Order stored successfully:", order);

    // ── Step 8: Update broadcast attributed revenue ──────────────────────────
    console.log(
      `📈 Step 8: Updating attributed revenue for broadcast ${order.broadcast_id} (+${order.total_amount})`
    );
    await addAttributedRevenue(order.broadcast_id, order.total_amount);

    console.log("✅ processOrderWebhook complete ─────────────────────────────\n");
    return { attributed: true, order };

  } catch (error) {
    console.error("❌ Error in processOrderWebhook:", error);
    throw error;
  }
};
