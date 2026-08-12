import { prisma } from "./prisma";
import { DEFAULT_TIMEZONE } from "./time";

export const COMPANY_ID = "store";

export async function getCompanyTimezone(): Promise<string> {
  const profile = await prisma.companyProfile.findUnique({
    where: { id: COMPANY_ID },
    select: { timezone: true },
  });
  return profile?.timezone ?? DEFAULT_TIMEZONE;
}

export async function getCompanyCurrency(): Promise<string> {
  const profile = await prisma.companyProfile.findUnique({
    where: { id: COMPANY_ID },
    select: { currency: true },
  });
  return profile?.currency ?? "PKR";
}
