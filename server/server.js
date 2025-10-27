import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import locationRoutes from "./routes/locationRoutes.js";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: "http://localhost:8081", credentials: true }));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 50,
  message: "Too many requests, please try again later.",
});
app.use(limiter);

app.use("/api/location", locationRoutes);
app.get("/", (req, res) => res.send(`Backend running on port ${PORT}`));
app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
