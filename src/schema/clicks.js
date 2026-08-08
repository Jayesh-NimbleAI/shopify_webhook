// schema/clicks.js

export const createClicksSchema = async (client) => {
  try {
    console.log("Initializing Clicks schema...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS clicks (
        click_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        -- Campaign
        broadcast_id UUID NOT NULL
          REFERENCES broadcasts(broadcast_id)
          ON DELETE CASCADE,

        -- Customer
        contact_id UUID
          REFERENCES contacts(contact_id)
          ON DELETE SET NULL,

        -- Visible button
        button_clicked VARCHAR(255),

        -- Time of click
        clicked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_clicks_broadcast
      ON clicks(broadcast_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_clicks_contact
      ON clicks(contact_id);
    `);

    console.log("✅ Clicks schema initialized");

  } catch (error) {
    console.error("❌ Error initializing Clicks schema:", error);
    throw error;
  }
};