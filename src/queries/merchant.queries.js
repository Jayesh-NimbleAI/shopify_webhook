// queries/merchant.queries.js

import pool from "../config/db.js";

/**
 * Get merchant by user id
 */
export const getMerchantById = async (userId) => {
  const query = `
    SELECT *
    FROM users
    WHERE uid = $1;
  `;

  const { rows } = await pool.query(query, [userId]);

  return rows[0] || null;
};

/**
 * Get merchant by Shopify shop domain
 */
export const getMerchantByShopDomain = async (shopDomain) => {
  const query = `
    SELECT *
    FROM users
    WHERE shopify_domain = $1;
  `;

  const { rows } = await pool.query(query, [shopDomain]);

  return rows[0] || null;
};

/**
 * Save/Update Shopify store information
 */
export const updateShopifyStore = async (
  userId,
  shopDomain,
  accessToken
) => {
  const query = `
    UPDATE users
    SET
      shopify_domain = $1,
      shopify_access_token = $2
    WHERE uid = $3
    RETURNING *;
  `;

  const values = [
    shopDomain,
    accessToken,
    userId,
  ];

  const { rows } = await pool.query(query, values);

  return rows[0];
};

/**
 * Get merchant's Shopify access token
 */
export const getShopifyAccessToken = async (userId) => {
  const query = `
    SELECT shopify_access_token
    FROM users
    WHERE uid = $1;
  `;

  const { rows } = await pool.query(query, [userId]);

  return rows[0]?.shopify_access_token || null;
};