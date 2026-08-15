import type { Request, Response } from "express";
import {
  getCompanyProfile,
  getPrintDefaults,
  getSoundPrefs,
  updateCompanyProfile,
  updatePrintDefaults,
  updateSoundPrefs,
} from "./service";
import type { CompanyProfileInput, PrintDefaultsInput, SoundPrefsInput } from "./schemas";

export async function companyGetHandler(req: Request, res: Response) {
  res.json({ data: await getCompanyProfile() });
}

export async function companyPutHandler(req: Request, res: Response) {
  res.json({ data: await updateCompanyProfile(req.body as CompanyProfileInput, req.user!.id) });
}

export async function soundGetHandler(req: Request, res: Response) {
  res.json({ data: await getSoundPrefs(req.user!.id) });
}

export async function soundPutHandler(req: Request, res: Response) {
  res.json({ data: await updateSoundPrefs(req.user!.id, req.body as SoundPrefsInput) });
}

export async function printDefaultsGetHandler(req: Request, res: Response) {
  res.json({ data: await getPrintDefaults() });
}

export async function printDefaultsPutHandler(req: Request, res: Response) {
  res.json({ data: await updatePrintDefaults(req.body as PrintDefaultsInput, req.user!.id) });
}
