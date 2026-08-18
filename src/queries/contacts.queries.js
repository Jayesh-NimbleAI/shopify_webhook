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

/**
 * Find a contact by normalized phone number (last 10 digits)
 */
export const getContactByNormalizedPhone = async (userId, normalizedPhone) => {
  const query = `
    SELECT *
    FROM contacts
    WHERE user_id = $1
      AND RIGHT(REGEXP_REPLACE(phone_number, '\\D', '', 'g'), 10) = $2
    LIMIT 1;
  `;
  const { rows } = await pool.query(query, [userId, normalizedPhone]);
  return rows[0] || null;
};

/**
 * Create a new contact
 */
export const createContact = async ({
  user_id,
  shopify_customer_id,
  phone_number,
  email,
  first_name,
  last_name
}) => {
  const query = `
    INSERT INTO contacts (
      user_id,
      shopify_customer_id,
      phone_number,
      email,
      first_name,
      last_name
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id, phone_number)
    DO UPDATE SET
      shopify_customer_id = EXCLUDED.shopify_customer_id,
      email = COALESCE(EXCLUDED.email, contacts.email),
      first_name = COALESCE(EXCLUDED.first_name, contacts.first_name),
      last_name = COALESCE(EXCLUDED.last_name, contacts.last_name),
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;
  const values = [
    user_id,
    shopify_customer_id,
    phone_number,
    email,
    first_name,
    last_name
  ];
  const { rows } = await pool.query(query, values);
  return rows[0];
};