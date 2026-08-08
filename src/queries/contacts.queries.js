// queries/contact.queries.js

import pool from "../config/db.js";

/**
 * Find a contact by phone number for a specific merchant
 */
export const getContactByPhone = async (userId, phoneNumber) => {
  const query = `
    SELECT *
    FROM contacts
    WHERE user_id = $1
      AND phone_number = $2
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [userId, phoneNumber]);

  return rows[0] || null;
};

/**
 * Get a contact by ID
 */
export const getContactById = async (contactId) => {
  const query = `
    SELECT *
    FROM contacts
    WHERE contact_id = $1;
  `;

  const { rows } = await pool.query(query, [contactId]);

  return rows[0] || null;
};

/**
 * Get all contacts for a merchant
 */
export const getContactsByUserId = async (userId) => {
  const query = `
    SELECT *
    FROM contacts
    WHERE user_id = $1
    ORDER BY created_at DESC;
  `;

  const { rows } = await pool.query(query, [userId]);

  return rows;
};