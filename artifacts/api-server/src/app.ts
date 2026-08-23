import path from "path";
import url from "url";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import dotenv from "dotenv";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({
    name: "Solugenix Corporate Tournament API",
    status: "online",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      tournaments: "/api/tournaments",
      events: "/api/events",
      registrations: "/api/registrations",
      matches: "/api/matches",
      fixtures: "/api/fixtures"
    }
  });
});

app.use("/api", router);

export default app;
