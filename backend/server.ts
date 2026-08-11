import express from "express";
import cors from "cors";
import { env } from "./core/config/env";
import { errorHandler, notFoundHandler } from "./core/middleware/error";
import authRouter from "./endpoints/auth/routes";
import brandRouter from "./endpoints/brand/routes";
import categoryRouter from "./endpoints/category/routes";
import colorRouter from "./endpoints/color/routes";
import contactRouter from "./endpoints/contact/routes";
import productRouter from "./endpoints/product/routes";
import unitRouter from "./endpoints/unit/routes";
import transactionRouter from "./endpoints/transaction/routes";
import paymentRouter from "./endpoints/payment/routes";
import dashboardRouter from "./endpoints/dashboard/routes";
import settingsRouter from "./endpoints/settings/routes";
import bankAccountRouter from "./endpoints/bank-account/routes";
import printLayoutRouter from "./endpoints/print-layout/routes";
import inventoryRouter from "./endpoints/inventory/routes";
import reservationRouter from "./endpoints/reservation/routes";
import voucherRouter from "./endpoints/voucher/routes";
import expenseRouter from "./endpoints/expense/routes";
import reportRouter from "./endpoints/report/routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ data: { status: "ok" } });
});

app.use("/api/auth", authRouter);
app.use("/api/brand", brandRouter);
app.use("/api/category", categoryRouter);
app.use("/api/color", colorRouter);
app.use("/api/contact", contactRouter);
app.use("/api/product", productRouter);
app.use("/api/unit", unitRouter);
app.use("/api/transaction", transactionRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/bank-account", bankAccountRouter);
app.use("/api/print-layout", printLayoutRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/reservation", reservationRouter);
app.use("/api/voucher", voucherRouter);
app.use("/api/expense", expenseRouter);
app.use("/api/report", reportRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, env.HOST, () => {
  console.log(
    `DOST Mobile POS API listening on http://${env.HOST}:${env.PORT}`,
  );
});
