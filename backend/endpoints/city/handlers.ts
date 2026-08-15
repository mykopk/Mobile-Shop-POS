import type { Request, Response } from "express";
import { createCity, deleteCity, listCities, updateCity } from "./service";
import type { CityInput } from "./schemas";

export async function listHandler(_req: Request, res: Response) {
  res.json({ data: await listCities() });
}

export async function createHandler(req: Request, res: Response) {
  const city = await createCity(req.body as CityInput, req.user!.id);
  res.status(201).json({ data: city });
}

export async function updateHandler(req: Request, res: Response) {
  const city = await updateCity(req.params.id, req.body as CityInput, req.user!.id);
  res.json({ data: city });
}

export async function deleteHandler(req: Request, res: Response) {
  const result = await deleteCity(req.params.id, req.user!.id);
  res.json({ data: result });
}
