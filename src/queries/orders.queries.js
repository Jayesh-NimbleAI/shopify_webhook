// queries/orders.queries.js

import pool from "../config/db.js";

/**
 * Create a new order
 */
export const createOrder = async (order) => {
  const query = `
    INSERT INTO orders (
      shopify_order_id,
      shopify_order_name,
      user_id,
      contact_id,
      customer_name,
      customer_email,
      customer_phone,
      total_amount,
      total_quantity,
      currency,
      is_cod,
      financial_status,
      fulfillment_status,
      broadcast_id,
      webhook_payload,
      ordered_at
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,$16
    )
    RETURNING *;
  `;

  const values = [
    order.shopify_order_id,
    order.shopify_order_name,
    order.user_id,
    order.contact_id,
    order.customer_name,
    order.customer_email,
    order.customer_phone,
    order.total_amount,
    order.total_quantity,
    order.currency,
    order.is_cod,
    order.financial_status,
    order.fulfillment_status,
    order.broadcast_id,
    order.webhook_payload,
    order.ordered_at,
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
};

/**
 * Get order by Shopify Order ID
 */
export const getOrderByShopifyId = async (shopifyOrderId) => {
  const query = `
    SELECT *
    FROM orders
    WHERE shopify_order_id = $1;
  `;

  const { rows } = await pool.query(query, [shopifyOrderId]);

  return rows[0] || null;
};

/**
 * Get order by internal Order ID
 */
export const getOrderById = async (orderId) => {
  const query = `
    SELECT *
    FROM orders
    WHERE order_id = $1;
  `;

  const { rows } = await pool.query(query, [orderId]);

  return rows[0] || null;
};

/**
 * Get all orders of a merchant
 */
export const getOrdersByUserId = async (userId) => {
  const query = `
    SELECT *
    FROM orders
    WHERE user_id = $1
    ORDER BY ordered_at DESC;
  `;

  const { rows } = await pool.query(query, [userId]);

  return rows;
};

/**
 * Get all orders of a contact
 */
export const getOrdersByContactId = async (contactId) => {
  const query = `
    SELECT *
    FROM orders
    WHERE contact_id = $1
    ORDER BY ordered_at DESC;
  `;

  const { rows } = await pool.query(query, [contactId]);

  return rows;
};

/**
 * Update broadcast attribution
 */
export const updateBroadcastId = async (
  orderId,
  broadcastId
) => {
  const query = `
    UPDATE orders
    SET
      broadcast_id = $1,
      updated_at = CURRENT_TIMESTAMP
    WHERE order_id = $2
    RETURNING *;
  `;

  const { rows } = await pool.query(query, [
    broadcastId,
    orderId,
  ]);

  return rows[0];
};

/**
 * Delete order
 */
export const deleteOrder = async (orderId) => {
  const query = `
    DELETE FROM orders
    WHERE order_id = $1
    RETURNING *;
  `;

  const { rows } = await pool.query(query, [orderId]);

  return rows[0] || null;
};