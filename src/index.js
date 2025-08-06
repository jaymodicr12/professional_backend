// src/utils/index.js
import dotenv from "dotenv";
import connectDB from "./db/index.js"; // Fix path if needed
import express from "express";

dotenv.config({
  path: "./.env", // Fix: filename is `.env`, not `env`
});

const app = express();

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("Mongodb connection failed", err);
  });
