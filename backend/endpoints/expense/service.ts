import { prisma } from "../../core/lib/prisma";
import { ApiError } from "../../core/middleware/error";
import { writeAudit } from "../../core/lib/audit";
import { nextNumber } from "../../core/lib/numbering";
import type { ExpenseInput, ExpenseUpdateInput } from "./schemas";

const EXPENSE_PREFIX = "EXP";

const include = {
  contact: { select: { id: true, name: true, phone: true } },
};

async function nextExpenseNumber() {
  return nextNumber(
    () => prisma.expense.findMany({ where: { number: { startsWith: `${EXPENSE_PREFIX}-` } }, select: { number: true } }),
    EXPENSE_PREFIX,
  );
}

async function assertContact(contactId?: string | null) {
  if (!contactId) return;
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) throw new ApiError(400, "expense.contact_invalid", "Unknown contact");
}

export async function listExpenses(filters: { category?: string; from?: string; to?: string }) {
  return prisma.expense.findMany({
    where: {
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.from || filters.to
        ? {
            date: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(`${filters.to}T23:59:59`) } : {}),
            },
          }
        : {}),
    },
    include,
    orderBy: [{ date: "desc" }],
  });
}

export async function getExpense(id: string) {
  const expense = await prisma.expense.findUnique({ where: { id }, include });
  if (!expense) throw new ApiError(404, "expense.not_found", "Expense not found");
  return expense;
}

export async function createExpense(input: ExpenseInput, userId: string) {
  await assertContact(input.contactId);

  const expense = await prisma.expense.create({
    data: {
      number: await nextExpenseNumber(),
      category: input.category,
      amount: input.amount,
      note: input.note || null,
      contactId: input.contactId || null,
      date: input.date ? new Date(input.date) : new Date(),
    },
    include,
  });
  await writeAudit({
    userId,
    action: "EXPENSE.CREATE",
    entity: "Expense",
    entityId: expense.id,
    details: JSON.stringify({ category: expense.category, amount: String(expense.amount) }),
  });
  return expense;
}

export async function updateExpense(id: string, input: ExpenseUpdateInput, userId: string) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "expense.not_found", "Expense not found");

  const nextContactId = input.contactId !== undefined ? input.contactId || null : existing.contactId;
  await assertContact(nextContactId);

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.note !== undefined ? { note: input.note || null } : {}),
      ...(input.contactId !== undefined ? { contactId: input.contactId || null } : {}),
      ...(input.date !== undefined && input.date ? { date: new Date(input.date) } : {}),
    },
    include,
  });
  await writeAudit({
    userId,
    action: "EXPENSE.UPDATE",
    entity: "Expense",
    entityId: expense.id,
    details: JSON.stringify({ category: expense.category, amount: String(expense.amount) }),
  });
  return expense;
}

export async function deleteExpense(id: string, userId: string) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "expense.not_found", "Expense not found");

  await prisma.expense.delete({ where: { id } });
  await writeAudit({
    userId,
    action: "EXPENSE.DELETE",
    entity: "Expense",
    entityId: id,
    details: JSON.stringify({ category: existing.category, amount: String(existing.amount) }),
  });
}
