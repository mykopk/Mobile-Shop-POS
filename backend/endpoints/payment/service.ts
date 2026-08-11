import { prisma } from "../../core/lib/prisma";
import { ApiError } from "../../core/middleware/error";
import { writeAudit } from "../../core/lib/audit";
import type { CollectInput } from "./schemas";

export async function collectCredit(input: CollectInput, userId: string) {
  const contact = await prisma.contact.findUnique({
    where: { id: input.contactId },
    include: { creditAccount: true },
  });
  if (!contact) throw new ApiError(404, "contact.not_found", "Contact not found");
  if (!contact.creditAccount) {
    throw new ApiError(400, "credit.no_account", "Contact has no credit account");
  }
  if (input.amount > Number(contact.creditAccount.balance) + 0.001) {
    throw new ApiError(
      400,
      "credit.over_collect",
      "Collection exceeds the outstanding balance",
    );
  }

  const account = await prisma.creditAccount.update({
    where: { id: contact.creditAccount.id },
    data: { balance: { decrement: input.amount } },
  });

  await prisma.creditPayment.create({
    data: {
      creditAccountId: account.id,
      amount: input.amount,
      receivedFrom: input.note ?? "Manual collection",
    },
  });

  await writeAudit({
    userId,
    action: "CREDIT.COLLECT",
    entity: "Contact",
    entityId: contact.id,
    details: JSON.stringify({ amount: input.amount, method: input.method }),
  });

  return { balance: account.balance };
}
