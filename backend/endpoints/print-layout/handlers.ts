import type { Request, Response } from "express";
import {
  createPrintLayout,
  deletePrintLayout,
  importPrintLayouts,
  listPrintLayouts,
  setDefaultPrintLayout,
  updatePrintLayout,
} from "./service";
import type { PrintLayoutImportInput, PrintLayoutInput, PrintLayoutUpdateInput } from "./schemas";

export async function listHandler(req: Request, res: Response) {
  res.json({ data: await listPrintLayouts(req.user!.id) });
}

export async function createHandler(req: Request, res: Response) {
  const layout = await createPrintLayout(req.user!.id, req.body as PrintLayoutInput);
  res.status(201).json({ data: layout });
}

export async function updateHandler(req: Request, res: Response) {
  const layout = await updatePrintLayout(req.params.id, req.user!.id, req.body as PrintLayoutUpdateInput);
  res.json({ data: layout });
}

export async function setDefaultHandler(req: Request, res: Response) {
  const layout = await setDefaultPrintLayout(req.params.id, req.user!.id);
  res.json({ data: layout });
}

export async function deleteHandler(req: Request, res: Response) {
  const result = await deletePrintLayout(req.params.id, req.user!.id);
  res.json({ data: result });
}

export async function importHandler(req: Request, res: Response) {
  const { layouts } = req.body as PrintLayoutImportInput;
  const imported = await importPrintLayouts(layouts);
  res.json({ data: { imported: imported.length, layouts: imported } });
}
