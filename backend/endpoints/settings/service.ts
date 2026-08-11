import { prisma } from "../../core/lib/prisma";
import { writeAudit } from "../../core/lib/audit";
import type { CompanyProfileInput, SoundPrefsInput } from "./schemas";

const DEFAULT_SOUND_PREFS = {
  click: true,
  success: true,
  error: true,
  pop: true,
} as const;

export async function getCompanyProfile() {
  return prisma.companyProfile.findUnique({ where: { id: "store" } });
}

export async function updateCompanyProfile(input: CompanyProfileInput, userId: string) {
  const profile = await prisma.companyProfile.upsert({
    where: { id: "store" },
    update: {
      name: input.name,
      tagline: input.tagline ?? null,
      address: input.address ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      footerText: input.footerText ?? null,
      currency: input.currency,
      taxRate: input.taxRate,
      raastId: input.raastId || null,
      whatsapp: input.whatsapp || null,
      website: input.website || null,
    },
    create: {
      id: "store",
      name: input.name,
      tagline: input.tagline ?? null,
      address: input.address ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      footerText: input.footerText ?? null,
      currency: input.currency,
      taxRate: input.taxRate,
      raastId: input.raastId || null,
      whatsapp: input.whatsapp || null,
      website: input.website || null,
    },
  });
  await writeAudit({
    userId,
    action: "COMPANY.UPDATE",
    entity: "CompanyProfile",
    entityId: "store",
  });
  return profile;
}

export async function getSoundPrefs(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { soundPrefs: true },
  });
  if (!user?.soundPrefs) return { ...DEFAULT_SOUND_PREFS };
  try {
    const parsed = JSON.parse(user.soundPrefs) as Partial<SoundPrefsInput>;
    return { ...DEFAULT_SOUND_PREFS, ...parsed };
  } catch {
    return { ...DEFAULT_SOUND_PREFS };
  }
}

export async function updateSoundPrefs(userId: string, input: SoundPrefsInput) {
  await prisma.user.update({
    where: { id: userId },
    data: { soundPrefs: JSON.stringify(input) },
  });
  return input;
}
