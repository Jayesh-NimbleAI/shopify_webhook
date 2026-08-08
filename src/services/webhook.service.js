// services/webhook.service.js

import { getOrderByShopifyId, createOrder } from "../queries/orders.queries.js";
import { addAttributedRevenue, getLatestBroadcast } from "../queries/broadcast.queries.js";
import { getClickedContactWithPhoneNumbers } from "../queries/clicks.queries.js";

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
async function verifyCustomerFromBroadcast(broadcastId, customerPhone) {
  if (!broadcastId || !customerPhone) return null;

  const clickedContacts =
    await getClickedContactWithPhoneNumbers(broadcastId);

  const normalizedCustomerPhone = normalizePhone(customerPhone);

  const matchedContact = clickedContacts.find(
    (contact) =>
      normalizePhone(contact.phone_number) === normalizedCustomerPhone
  );
  if (!matchedContact) {
    throw new Error("🚫 Customer is not attributed to the latest broadcast.");
  }
  return matchedContact;
}

// Customer Details
const getCustomerPhone = (orderPayload) => {

  const phone = orderPayload.customer?.phone ||
    orderPayload.shipping_address?.phone ||
    null;

  if (!phone) {
    throw new Error("📵 Customer has no phone number. Skipping webhook.");
  }

  return phone;

};
const getCustomerName = (orderPayload) =>
  `${orderPayload.customer?.first_name || ""} ${orderPayload.customer?.last_name || ""}`.trim();

const getCustomerEmail = (orderPayload) => {
  return orderPayload.customer?.email || null;
}

// Find latest broadcast
const getLatestBroadcastOrThrow = async (userId) => {
  const broadcast = await getLatestBroadcast(userId);
  if (!broadcast) {
    throw new Error("📭 No active/latest broadcast found for this user.");
  }

  return broadcast;
}
const getAttribution = async (latestBroadcast, customerPhone) => {

  const attribution = await verifyCustomerFromBroadcast(
    latestBroadcast.broadcast_id,
    customerPhone
  );

  if (!attribution) {
    throw new Error("🚫 Customer is not attributed to our broadcast.");
  }

  return attribution;
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

    //DB Operations
    const broadcast = await getLatestBroadcastOrThrow(userId);
    const attribution = await getAttribution(broadcast,orderData.customer_phone);

    //Building the DB object
    const order = buildOrder(
      userId,
      orderPayload,
      orderData,
      broadcast,
      attribution
    ); 

    //store order
    await createOrder(order)

    //UPDATE THE BROADCAST ANALYTICS (attributed_revenues)    
    if (order.broadcast_id) {
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

