// schema/orders.js

export const createOrdersSchema = async (client) => {
  try {
    console.log("Initializing Orders schema...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        -- Shopify Order Details
        shopify_order_id BIGINT UNIQUE NOT NULL,
        shopify_order_name VARCHAR(100),

        -- Merchant (Owner of the Store)
        user_id INTEGER NOT NULL
          REFERENCES users(uid)
          ON DELETE CASCADE,

        -- Customer
        contact_id UUID
          REFERENCES contacts(contact_id)
          ON DELETE SET NULL,

        customer_name VARCHAR(255),
        customer_email VARCHAR(255),
        customer_phone VARCHAR(50),

        -- Order Information
        total_amount DECIMAL(10,2) NOT NULL,
        total_quantity INTEGER NOT NULL DEFAULT 0,
        currency VARCHAR(10),

        -- Payment
        is_cod BOOLEAN NOT NULL DEFAULT FALSE,
        financial_status VARCHAR(50),

        -- Fulfillment
        fulfillment_status VARCHAR(50),

        -- Broadcast Attribution (Filled only if order is attributed)
        broadcast_id UUID
          REFERENCES broadcasts(broadcast_id)
          ON DELETE SET NULL,

        -- Complete Shopify Webhook Payload
        webhook_payload JSONB DEFAULT '{}'::jsonb,

        -- Timestamps
        ordered_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ==========================
    // Performance Indexes
    // ==========================

    // await client.query(`
    //   CREATE INDEX IF NOT EXISTS idx_orders_user_id
    //   ON orders(user_id);
    // `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_contact_id
      ON orders(contact_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_shopify_order_id
      ON orders(shopify_order_id);
    `);

    // await client.query(`
    //   CREATE INDEX IF NOT EXISTS idx_orders_broadcast_id
    //   ON orders(broadcast_id);
    // `);

    /* NOTE: The index on `broadcast_id` is commented out because some
       existing databases may not have the `broadcast_id` column in
       the `orders` table. Creating the index without the column
       causes startup failures (column does not exist). If you are
       sure the column exists across environments, you can restore
       this block. */

    // await client.query(`
    //   CREATE INDEX IF NOT EXISTS idx_orders_broadcast_id
    //   ON orders(broadcast_id);
    // `);

    // await client.query(`
    //   CREATE INDEX IF NOT EXISTS idx_orders_customer_phone
    //   ON orders(customer_phone);
    // `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_created_at
      ON orders(created_at);
    `);

    console.log("✅ Orders schema initialized successfully");

  } catch (error) {
    console.error("❌ Error initializing Orders schema:", error);
    throw error;
  }
};