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

export async function getCompanyFinancials(): Promise<{ taxRate: number; cardFee: number }> {
  const profile = await prisma.companyProfile.findUnique({
    where: { id: COMPANY_ID },
    select: { taxRate: true, cardFee: true },
  });
  return {
    taxRate: Number(profile?.taxRate ?? 0),
    cardFee: Number(profile?.cardFee ?? 0),
  };
}
