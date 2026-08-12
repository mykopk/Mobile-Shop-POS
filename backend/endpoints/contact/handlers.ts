import type { Request, Response } from "express";
import {
  bulkDeleteContacts,
  createContact,
  findDuplicates,
  getContact,
  importContacts,
  listContacts,
  updateContact,
} from "./service";
import type { ContactInput, ImportContactInput } from "./schemas";

export async function listHandler(req: Request, res: Response) {
  const { q, type } = req.query;
  res.json({
    data: await listContacts({
      q: typeof q === "string" ? q : undefined,
      type: typeof type === "string" ? type : undefined,
    }),
  });
}

export async function getHandler(req: Request, res: Response) {
  res.json({ data: await getContact(req.params.id) });
}

export async function dedupeHandler(req: Request, res: Response) {
  const { phone, name } = req.query;
  res.json({
    data: await findDuplicates(
      typeof phone === "string" ? phone : undefined,
      typeof name === "string" ? name : undefined,
    ),
  });
}

export async function createHandler(req: Request, res: Response) {
  res.status(201).json({ data: await createContact(req.body as ContactInput, req.user!.id) });
}

export async function updateHandler(req: Request, res: Response) {
  res.json({ data: await updateContact(req.params.id, req.body as ContactInput, req.user!.id) });
}

export async function bulkDeleteHandler(req: Request, res: Response) {
  const ids = (req.body?.ids ?? []) as string[];
  res.json({ data: await bulkDeleteContacts(ids, req.user!.id) });
}

export async function importHandler(req: Request, res: Response) {
  const rows = req.body.contacts as ImportContactInput[];
  res.json({ data: await importContacts(rows, req.user!.id) });
}
