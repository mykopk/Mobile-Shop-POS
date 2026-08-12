import type { Request, Response } from "express";
import { createUser, listUsers, updateUser } from "./service";
import type { CreateUserInput, UpdateUserInput } from "./schemas";

export async function listHandler(_req: Request, res: Response) {
  res.json({ data: await listUsers() });
}

export async function createHandler(req: Request, res: Response) {
  const user = await createUser(req.body as CreateUserInput, req.user!.id);
  res.status(201).json({ data: user });
}

export async function updateHandler(req: Request, res: Response) {
  const user = await updateUser(req.params.id, req.body as UpdateUserInput, req.user!.id);
  res.json({ data: user });
}
