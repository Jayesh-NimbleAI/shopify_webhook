import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { initializeDatabase } from "./config/db.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();