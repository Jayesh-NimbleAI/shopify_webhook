// queries/broadcast.queries.js

import pool from "../config/db.js";

/**
 * Get broadcast by ID
 */
export const getBroadcastById = async (broadcastId) => {
  const query = `
    SELECT *
    FROM broadcasts
    WHERE broadcast_id = $1;
  `;

  const { rows } = await pool.query(query, [broadcastId]);

  return rows[0] || null;
};

/**
 * Get all broadcasts of a merchant
 */
export const getBroadcastsByUserId = async (userId) => {
  const query = `
    SELECT *
    FROM broadcasts
    WHERE user_id = $1
    ORDER BY created_at DESC NULLS LAST;
  `;

  const { rows } = await pool.query(query, [userId]);

  return rows;
};

/**
 * Increment converted messages
 */
export const incrementConversions = async (broadcastId) => {
  const query = `
    UPDATE broadcasts
    SET
      messages_converted = messages_converted + 1
    WHERE broadcast_id = $1
    RETURNING *;
  `;

  const { rows } = await pool.query(query, [broadcastId]);

  return rows[0];
};

/**
 * Add attributed revenue
 */
export const addAttributedRevenue = async (
  broadcastId,
  revenue
) => {
  const query = `
    UPDATE broadcasts
    SET
      attributed_revenue = attributed_revenue + $1
    WHERE broadcast_id = $2
    RETURNING *;
  `;

  const { rows } = await pool.query(query, [
    revenue,
    broadcastId,
  ]);

  return rows[0];
};

/**
 * Update broadcast status
 */
export const updateBroadcastStatus = async (
  broadcastId,
  status
) => {
  const query = `
    UPDATE broadcasts
    SET status = $1
    WHERE broadcast_id = $2
    RETURNING *;
  `;

  const { rows } = await pool.query(query, [
    status,
    broadcastId,
  ]);

  return rows[0];
};


// getting the latest broadcast by the user/merchant
export const getLatestBroadcast = async (userId) => {
  const query = `
    SELECT *
    FROM broadcasts
    WHERE user_id = $1
    ORDER BY created_at DESC NULLS LAST
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [userId]);
  console.log("Latest broadcast:", rows[0]);
  return rows[0] || null;
};