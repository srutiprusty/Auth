import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.ORIGIN,
    credentials: true,
  }),
);

app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Server is Running ");
});

// Connect to MongoDB
connectDB();

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});

/* 
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

app.use(cookieParser());

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: "Too many OTP requests. Try again later.",
});

app.use("/api/auth/request-otp", otpLimiter);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Authentication Server Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
 */
