import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { transactionRoutes } from './routes/transactions';
import { errorHandler } from './middleware/errorHandler';
import { connectRedis } from './config/redis';
import { globalTimeout, haltOnTimedout, timeoutErrorHandler } from './middleware/timeout';
import { responseTime } from './middleware/responseTime';
import os from "os";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

// Middleware
app.use(metricsMiddleware); // Register metrics middleware early
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(limiter);

// Global timeout configuration
app.use(responseTime);
app.use(globalTimeout);
app.use(haltOnTimedout);

// Basic health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use('/api/transactions', transactionRoutes);

// Queue health check
app.get("/health/queue", getQueueHealth);
app.post("/admin/queues/pause", pauseQueueEndpoint);
app.post("/admin/queues/resume", resumeQueueEndpoint);

// Timeout error handler (must be before general error handler)
app.use(timeoutErrorHandler);
app.use(errorHandler);

// Init Redis
connectRedis()
  .then(() => {
    console.log("Redis initialized");
  })
  .catch((err) => {
    console.error("Failed to connect to Redis:", err);
    console.warn("Distributed locks will not be available");
  });

// Initialize queue dashboard
const queueRouter = createQueueDashboard();
app.use("/admin/queues", queueRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});