export type Role = "ADMIN" | "MANAGER" | "CASHIER";

export const PIN_LENGTH = 4;

export const ROLE_META: Record<Role, { label: string; color: string }> = {
  ADMIN: { label: "Admin", color: "#ff5018" },
  MANAGER: { label: "Manager", color: "#ff9f1c" },
  CASHIER: { label: "Cashier", color: "#2563eb" },
};

export const USER_TEXT = {
  title: "Users & Roles",
  subtitle: "Manage staff accounts and their permissions",
  newUser: "New user",
  editUser: "Edit user",
  username: "Username",
  usernamePlaceholder: "e.g. BILAL",
  name: "Full name",
  namePlaceholder: "e.g. Bilal Ahmed",
  email: "Email (optional)",
  emailPlaceholder: "bilal@fig.com",
  pin: "PIN",
  pinHint: "Exactly 4 digits",
  pinRequired: "PIN must be exactly 4 digits",
  pinPlaceholder: "••••",
  changePinInSettings: "Change your PIN from Settings → Preferences → Security.",
  role: "Role",
  active: "Active",
  activeHint: "Inactive users cannot sign in.",
  permissions: "Permissions",
  permissionHint: "Stored per user. Empty falls back to the role defaults.",
  useRoleDefaults: "Use role defaults",
  useRoleDefaultsHint: "Reset to this role's standard permission set.",
  save: "Save user",
  cancel: "Cancel",
  created: "User created",
  updated: "User updated",
  saved: "User saved",
  noData: "No users yet",
  retry: "Try again",
  permissionCount: "permissions",
  selfGuard: "You cannot deactivate your own account or remove your own admin access.",
} as const;
