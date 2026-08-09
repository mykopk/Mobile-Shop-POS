export type Role = "ADMIN" | "MANAGER" | "CASHIER";

export type PreregisteredUser = {
  id: string;
  username: string;
  name: string;
  email: string;
  pin: string;
  role: Role;
};

export const PIN_LENGTH = 4;

export const PREREGISTERED_USERS: PreregisteredUser[] = [
  {
    id: "u-admin",
    username: "arslan",
    name: "Arslan Wahab",
    email: "admin@dost.com",
    pin: "1111",
    role: "ADMIN",
  },
  {
    id: "u-manager",
    username: "saima",
    name: "Saima Riaz",
    email: "manager@dost.com",
    pin: "2222",
    role: "MANAGER",
  },
  {
    id: "u-cashier",
    username: "ali",
    name: "Ali Hassan",
    email: "cashier@dost.com",
    pin: "3333",
    role: "CASHIER",
  },
];

export const ROLE_META: Record<Role, { label: string; color: string }> = {
  ADMIN: { label: "Admin", color: "#e63b20" },
  MANAGER: { label: "Manager", color: "#d97706" },
  CASHIER: { label: "Cashier", color: "#e11d48" },
};
