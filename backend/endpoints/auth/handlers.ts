import type { Request, Response } from "express";
import { loginUser } from "./service";
import type { LoginInput } from "./schemas";

export async function loginHandler(req: Request, res: Response) {
  const result = await loginUser(req.body as LoginInput);
  res.json({ data: result });
}
