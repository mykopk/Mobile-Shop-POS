import express from "express";
import cors from "cors";
import { env } from "./core/config/env";
import { errorHandler, notFoundHandler } from "./core/middleware/error";
import authRouter from "./endpoints/auth/routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ data: { status: "ok" } });
});

app.use("/api/auth", authRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, env.HOST, () => {
  console.log(
    `DOST Mobile POS API listening on http://${env.HOST}:${env.PORT}`,
  );
});
