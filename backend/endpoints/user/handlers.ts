import type { Request, Response } from "express";
import { createUser, deleteUser, listUsers, updateUser } from "./service";
import type { CreateUserInput, UpdateUserInput } from "./schemas";

export async function listHandler(_req: Request, res: Response) {
  res.json({ data: await listUsers() });
}

export async function createHandler(req: Request, res: Response) {
  const user = await createUser(req.body as CreateUserInput, req.user!.id);
  res.status(201).json({ data: user });
}

export async function updateHandler(req: Request, res: Response) {
  const user = await updateUser(
    req.params.id,
    req.body as UpdateUserInput,
    req.user!.id,
    req.user!.role,
  );
  res.json({ data: user });
}

export async function deleteHandler(req: Request, res: Response) {
  const result = await deleteUser(req.params.id, req.user!.id, req.user!.role);
  res.json({ data: result });
}
