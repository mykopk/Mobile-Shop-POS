import type { Request, Response } from "express";
import { ApiError } from "../../core/middleware/error";
import {
  getCompanyProfile,
  getSoundPrefs,
  updateCompanyProfile,
  updateSoundPrefs,
} from "./service";
import type { CompanyProfileInput, SoundPrefsInput } from "./schemas";

export async function companyGetHandler(req: Request, res: Response) {
  res.json({ data: await getCompanyProfile() });
}

export async function companyPutHandler(req: Request, res: Response) {
  if (req.user?.role === "CASHIER") {
    throw new ApiError(403, "auth.forbidden", "Forbidden");
  }
  res.json({ data: await updateCompanyProfile(req.body as CompanyProfileInput, req.user!.id) });
}

export async function soundGetHandler(req: Request, res: Response) {
  res.json({ data: await getSoundPrefs(req.user!.id) });
}

export async function soundPutHandler(req: Request, res: Response) {
  res.json({ data: await updateSoundPrefs(req.user!.id, req.body as SoundPrefsInput) });
}
