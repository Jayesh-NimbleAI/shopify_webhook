// services/webhook.service.js

import { getOrderByShopifyId, createOrder } from "../queries/orders.queries.js";
import { addAttributedRevenue, getLatestBroadcast, getBroadcastById } from "../queries/broadcast.queries.js";
import { getClickedContactWithPhoneNumbers, createClick, hasContactClickedBroadcast, getLatestClickByContact } from "../queries/clicks.queries.js";
import { getContactByNormalizedPhone, createContact } from "../queries/contacts.queries.js";

/**
 * Normalize phone numbers
 * Example:
 * +91 98765-43210 -> 9876543210
 */
const normalizePhone = (phone) => {
  if (!phone) return null;
  return phone.replace(/\D/g, "").slice(-10);
};

/**
 * Verify whether the customer belongs to the clicked contacts
 * of the latest broadcast.
 */
// Customer Details
const getCustomerPhone = (orderPayload) => {
  const phone = orderPayload.customer?.phone ||
    orderPayload.shipping_address?.phone ||
    null;

  if (!phone) {
    console.log("📵 Customer has no phone number. Skipping webhook.");
    return null;
  }
  console.log("Phone number is : " , phone)
  return phone;
};

const getCustomerName = (orderPayload) =>
  `${orderPayload.customer?.first_name || ""} ${orderPayload.customer?.last_name || ""}`.trim();

const getCustomerEmail = (orderPayload) => {
  return orderPayload.customer?.email || null;
}

// Calculate total quantity
const getTotalQuantity = (orderPayload) => {
  return orderPayload.line_items?.reduce(
    (sum, item) => sum + item.quantity,
    0
  ) || 0;
}

// Determine payment type
const getIsCod = (orderPayload) => {
  const gatewayLower = (orderPayload.gateway || "").toLowerCase();
  const is_cod =
    gatewayLower.includes("cash on delivery") ||
    gatewayLower.includes("cod") ||
    orderPayload.financial_status === "pending";
    console.log("Is Delivery COD : " , is_cod);
  return is_cod;
}

// Build Order Object
const buildOrder = (
  userId,
  orderPayload,
  orderData,
  broadcast,
  attribution
) => {

  return {
    shopify_order_id: orderPayload.id,
    shopify_order_name: orderPayload.name,

    user_id: userId,

    contact_id: attribution.contact_id,
    broadcast_id: broadcast.broadcast_id,

    customer_name: orderData.customer_name,
    customer_email: orderData.customer_email,
    customer_phone: orderData.customer_phone,

    total_amount: Number(orderPayload.total_price),
    total_quantity: orderData.total_quantity,
    currency: orderPayload.currency,

    is_cod: orderData.is_cod,

    financial_status: orderPayload.financial_status,
    fulfillment_status: orderPayload.fulfillment_status,

    webhook_payload: orderPayload,

    ordered_at: orderPayload.created_at
  };
};

const orderExtractionSteps = [
  (orderPayload) => ({
    customer_phone: getCustomerPhone(orderPayload)
  }),
  (orderPayload) => ({
    customer_name: getCustomerName(orderPayload)
  }),
  (orderPayload) => ({
    customer_email: getCustomerEmail(orderPayload)
  }),
  (orderPayload) => ({
    total_quantity: getTotalQuantity(orderPayload)
  }),
  (orderPayload) => ({
    is_cod: getIsCod(orderPayload)
  })
]

const extractOrderData = (orderPayload) => {
  let orderData = {};

  for (const step of orderExtractionSteps) {
    orderData = {
      ...orderData,
      ...step(orderPayload)
    };
  }
  return orderData;
}

// Process Shopify orders/create webhook
export const processOrderWebhook = async (userId, orderPayload) => {
  try {
    console.log(`🚀 processOrderWebhook started for userId: ${userId}, Shopify orderId: ${orderPayload.id}`);
    
    // Prevent duplicate orders
    const existingOrder = await getOrderByShopifyId(orderPayload.id);
    if (existingOrder) {
      console.log("⚠️ Duplicate order received.");
      return {
        duplicate: true,
        order: existingOrder
      };
    }

    // Run Function Array
    const orderData = extractOrderData(orderPayload);
    console.log("📦 Extracted order data:", orderData);

    if (!orderData.customer_phone) {
      console.log("📵 Cannot process webhook: customer phone number is missing.");
      return;
    }

    const normalizedCustomerPhone = normalizePhone(orderData.customer_phone);
    console.log(`🔍 Checking attribution for customer phone: ${orderData.customer_phone} (Normalized: ${normalizedCustomerPhone})`);

    // 1. Resolve contact by phone number
    let contact = await getContactByNormalizedPhone(userId, normalizedCustomerPhone);

    if (!contact) {
      console.log(`👤 Contact not found for phone ${normalizedCustomerPhone}. Creating new contact...`);
      const first_name = orderPayload.customer?.first_name || orderPayload.shipping_address?.first_name || "";
      const last_name = orderPayload.customer?.last_name || orderPayload.shipping_address?.last_name || "";
      const email = orderPayload.customer?.email || orderPayload.shipping_address?.email || null;
      const shopify_customer_id = orderPayload.customer?.id ? String(orderPayload.customer.id) : null;

      contact = await createContact({
        user_id: userId,
        shopify_customer_id,
        phone_number: orderData.customer_phone,
        email,
        first_name,
        last_name
      });
      console.log(`✅ New contact created:`, contact);
    } else {
      console.log(`🎯 Existing contact found:`, contact);
    }

    // 2. Resolve broadcast from contact's clicks or fall back to merchant's latest broadcast
    const latestClick = await getLatestClickByContact(contact.contact_id);
    let broadcast = null;

    if (latestClick) {
      broadcast = await getBroadcastById(latestClick.broadcast_id);
      console.log(`🎯 Resolved broadcast from contact's click:`, broadcast);
    }

    if (!broadcast) {
      broadcast = await getLatestBroadcast(userId);
      console.log(`📡 Fallback to merchant's latest broadcast:`, broadcast);
    }

    if (!broadcast) {
      console.log("📭 Cannot process webhook: latest broadcast not found.");
      return;
    }

    // 3. Ensure click attribution exists for this resolved broadcast so they show in click queries
    const clicked = await hasContactClickedBroadcast(contact.contact_id, broadcast.broadcast_id);
    if (!clicked) {
      console.log(`🖱️ Contact has not clicked broadcast. Creating click attribution...`);
      const newClick = await createClick({
        broadcast_id: broadcast.broadcast_id,
        contact_id: contact.contact_id,
        button_clicked: "Shopify Purchase"
      });
      console.log(`✅ Click attribution created:`, newClick);
    } else {
      console.log(`✅ Contact already has click attribution for this broadcast.`);
    }

    // 4. Build the DB object
    const order = buildOrder(
      userId,
      orderPayload,
      orderData,
      broadcast,
      contact
    ); 

    // store order
    await createOrder(order);
    console.log("Order Stored : ", order);

    // UPDATE THE BROADCAST ANALYTICS (attributed_revenues)    
    if (order.broadcast_id) {
      console.log(`📈 Updating attributed revenue for broadcast: ${order.broadcast_id} with amount: ${order.total_amount}`);
      await addAttributedRevenue(
        order.broadcast_id,
        order.total_amount
      );
    }
    console.log("✅ Order stored successfully");
    return order;
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    throw error;
  }
};

