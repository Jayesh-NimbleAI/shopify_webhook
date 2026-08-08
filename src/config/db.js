import dotenv from "dotenv";
dotenv.config();

import { Pool } from "pg";

import { createBroadcastsSchema } from "../schema/broadcasts.js";
import { createContactsSchema } from "../schema/contacts.js";
import { createMessagesSchema } from "../schema/messages.js";
import { createOrdersSchema } from "../schema/orders.js";
import { createClicksSchema } from "../schema/clicks.js";

console.log("HOST:", process.env.DB_HOST);
console.log("PORT:", process.env.DB_PORT);
console.log("USER:", process.env.DB_USER);
console.log("PASSWORD:", process.env.DB_PASSWORD);
console.log("DATABASE:", process.env.DB_NAME);


const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === "true"
        ? { rejectUnauthorized: false }
        : false
});

export async function initializeDatabase() {

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        await client.query(
            `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`
        );

        await createBroadcastsSchema(client);

        await createContactsSchema(client);

        await createMessagesSchema(client);

        await createOrdersSchema(client);
        
        await createClicksSchema(client);

        await client.query("COMMIT");

        console.log("✅ Database initialized");

    } catch (err) {

        await client.query("ROLLBACK");

        throw err;

    } finally {

        client.release();

    }

}

export default pool;