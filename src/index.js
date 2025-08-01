// src/utils/index.js
import dotenv from "dotenv";
import connectDB from "./db/index.js";  // Fix path if needed
import express from "express";

dotenv.config({
  path: "./.env", // Fix: filename is `.env`, not `env`
});

const app = express();

const startServer = async () => {
  try {
    await connectDB();

    app.listen(process.env.PORT || 8000, () => {
      console.log(`✅ Server is running on port ${process.env.PORT}`);
    });

    app.get("/", (req, res) => {
      res.send("Server is working!");
    });

  } catch (err) {
    console.error("❌ Failed to start server:", err);
  }
};

startServer();
