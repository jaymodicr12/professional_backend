// src/utils/index.js
import dotenv from "dotenv";
import connectDB from "./db/index.js"; // Fix path if needed
import { app } from "./app.js"; // import the express app with routes

dotenv.config({
  path: "./.env", // Fix: filename is `.env`, not `env`
});

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running on port: ${process.env.PORT || 8000}`);
    });
  })
  .catch((err) => {
    console.log("MongoDB connection failed", err);
  });
