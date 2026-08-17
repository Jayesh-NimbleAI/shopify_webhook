import express from "express";
import cors from "cors";
import webhookRoutes from "./routes/webhook.routes.js";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/webhooks", webhookRoutes);

// Health Check
app.get("/", (req, res) => {
  console.log("Health checkup.")
  res.json({
    success: true,
    message: "Shopify Webhook Service Running 🚀",
  });
});

export default app;