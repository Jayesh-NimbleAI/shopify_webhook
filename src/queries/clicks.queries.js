// queries/clicks.queries.js

import pool from "../config/db.js";

/**
 * Create a new click record
 */
export const createClick = async ({
  broadcast_id,
  contact_id,
  button_clicked,
}) => {
  const query = `
    INSERT INTO clicks
    (
      broadcast_id,
      contact_id,
      button_clicked
    )
    VALUES ($1, $2, $3)
    RETURNING *;
  `;

  const values = [
    broadcast_id,
    contact_id,
    button_clicked,
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
};

/**
 * Find latest click by contact
 */
export const getLatestClickByContact = async (contact_id) => {
  const query = `
    SELECT *
    FROM clicks
    WHERE contact_id = $1
    ORDER BY clicked_at DESC NULLS LAST
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [contact_id]);
  return rows[0] || null;
};

/**
 * Get all clicks for a broadcast
 */
export const getClicksByBroadcast = async (broadcast_id) => {
  const query = `
    SELECT *
    FROM clicks
    WHERE broadcast_id = $1
    ORDER BY clicked_at DESC NULLS LAST;
  `;

  const { rows } = await pool.query(query, [broadcast_id]);
  return rows;
};

/**
 * Total clicks for a broadcast
 */
export const getClickCountByBroadcast = async (broadcast_id) => {
  const query = `
    SELECT COUNT(*) AS total_clicks
    FROM clicks
    WHERE broadcast_id = $1;
  `;

  const { rows } = await pool.query(query, [broadcast_id]);
  return Number(rows[0].total_clicks);
};

/**
 * Check if contact already clicked a broadcast
 */
export const hasContactClickedBroadcast = async (
  contact_id,
  broadcast_id
) => {
  const query = `
    SELECT *
    FROM clicks
    WHERE contact_id = $1
      AND broadcast_id = $2
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [
    contact_id,
    broadcast_id,
  ]);

  return rows[0];
};

/**
 * Delete click (for testing)
 */
export const deleteClick = async (click_id) => {
  const query = `
    DELETE FROM clicks
    WHERE click_id = $1
    RETURNING *;
  `;

  const { rows } = await pool.query(query, [click_id]);
  return rows[0];
};

export const getClickedContactWithPhoneNumbers = async (broadcast_id) => {
  console.log("Broadcast Id : " , broadcast_id);
  const query = `
    SELECT
      c.contact_id,
      c.phone_number,
      cl.click_id,
      cl.clicked_at
    FROM clicks cl
    INNER JOIN contacts c
      ON cl.contact_id = c.contact_id
    WHERE cl.broadcast_id = $1
    ORDER BY cl.clicked_at DESC;
  `;

  const { rows } = await pool.query(query, [broadcast_id]);

  return rows;
};