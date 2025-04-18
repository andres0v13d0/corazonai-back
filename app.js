// app.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import "./utils/passport.js";
import passport from "passport";
import dotenv from "dotenv";
import chatRoutes from './routes/chat.routes.js';



dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3001",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Rutas
app.use("/api/auth", authRoutes);
app.use('/api', chatRoutes);

export default app;
