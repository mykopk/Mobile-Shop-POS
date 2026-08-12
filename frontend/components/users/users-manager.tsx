"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { apiRequest } from "@/lib/apiClient";
import { useAuth } from "@/lib/auth-context";
import { useApi } from "@/lib/use-api";
import type { AdminUser } from "@/lib/api-types";
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  ROLE_PERMISSIONS,
  type Permission,
} from "@/lib/constants/permissions";
import { ROLE_META, USER_TEXT, type Role } from "@/lib/constants/users";
import { useDirtyForm } from "@/lib/use-dirty-form";
import { DiscardConfirmDialog } from "@/components/ui/discard-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dropdown } from "@/components/ui/dropdown";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { PlusIcon, UsersIcon } from "@/components/icons";

const ROLE_OPTIONS: { value: Role; label: string }[] = Object.entries(ROLE_META).map(
  ([value, meta]) => ({ value: value as Role, label: meta.label }),
);

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
        {label}
        {hint && <span className="normal-case text-ink-400"> {hint}</span>}
      </p>
      {children}
    </div>
  );
}

function UserForm({
  editing,
  me,
  onClose,
  onSaved,
}: {
  editing: AdminUser | null;
  me: AdminUser | undefined;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isSelf = editing?.id === me?.id;

  const [username, setUsername] = useState(editing?.username ?? "");
  const [name, setName] = useState(editing?.name ?? "");
  const [email, setEmail] = useState(editing?.email ?? "");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<Role>(editing?.role ?? "CASHIER");
  const [active, setActive] = useState(editing?.active ?? true);
  const [permissions, setPermissions] = useState<Set<string>>(
    () => new Set(editing?.permissions ?? []),
  );
  const [submitting, setSubmitting] = useState(false);

  const dirty = useDirtyForm({ username, name, email, role, active, pin, permissions: [...permissions] });

  function markChanged(next: Partial<{ username: string; name: string; email: string; role: Role; active: boolean; pin: string; permissions: string[] }>) {
    const updated = {
      username, name, email, role, active, pin,
      permissions: next.permissions ?? [...permissions],
      ...next,
    };
    dirty.markDirty({ username: updated.username, name: updated.name, email: updated.email, role: updated.role, active: updated.active, pin: updated.pin, permissions: updated.permissions });
  }

  const togglePermission = (key: string) => {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      markChanged({ permissions: [...next] });
      return next;
    });
  };

  const toggleGroup = (groupKeys: readonly Permission[]) => {
    setPermissions((prev) => {
      const next = new Set(prev);
      const allSelected = groupKeys.every((k) => next.has(k));
      for (const k of groupKeys) {
        if (allSelected) next.delete(k);
        else next.add(k);
      }
      markChanged({ permissions: [...next] });
      return next;
    });
  };

  const useRoleDefaults = () => {
    setPermissions(new Set(ROLE_PERMISSIONS[role]));
    markChanged({ permissions: [...ROLE_PERMISSIONS[role]] });
  };

  async function save() {
    if (!username.trim() || !name.trim()) {
      toast("Enter a username and full name", "error");
      return;
    }
    if (!editing && !/^\d{4}$/.test(pin)) {
      toast(USER_TEXT.pinRequired, "error");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        username,
        name,
        email: email || undefined,
        role,
        active,
        permissions: [...permissions],
        ...(pin ? { pin } : {}),
      };
      if (editing) {
        await apiRequest(`/user/${editing.id}`, { method: "PUT", body });
        toast(USER_TEXT.updated, "success");
      } else {
        await apiRequest("/user", { method: "POST", body });
        toast(USER_TEXT.created, "success");
      }
      onSaved();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save user", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="flex flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="grid min-h-0 flex-1 gap-4 pb-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={USER_TEXT.username}>
              <input
                value={username}
                onChange={(e) => { setUsername(e.target.value); markChanged({ username: e.target.value }); }}
                placeholder={USER_TEXT.usernamePlaceholder}
                className="w-full rounded-2xl bg-ink-100 px-3.5 py-2 text-sm text-ink-900 outline-none focus:ring-2 focus:ring-brand-500/60"
                disabled={isSelf}
              />
            </Field>
            <Field label={USER_TEXT.name}>
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); markChanged({ name: e.target.value }); }}
                placeholder={USER_TEXT.namePlaceholder}
                className="w-full rounded-2xl bg-ink-100 px-3.5 py-2 text-sm text-ink-900 outline-none focus:ring-2 focus:ring-brand-500/60"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={USER_TEXT.email}>
              <input
                value={email}
                onChange={(e) => { setEmail(e.target.value); markChanged({ email: e.target.value }); }}
                placeholder={USER_TEXT.emailPlaceholder}
                type="email"
                className="w-full rounded-2xl bg-ink-100 px-3.5 py-2 text-sm text-ink-900 outline-none focus:ring-2 focus:ring-brand-500/60"
              />
            </Field>
            <Field label={USER_TEXT.pin} hint={USER_TEXT.pinHint}>
              <input
                value={pin}
                onChange={(e) => { setPin(e.target.value); markChanged({ pin: e.target.value }); }}
                placeholder={editing ? USER_TEXT.pinPlaceholder : ""}
                type="password"
                inputMode="numeric"
                maxLength={4}
                autoComplete="new-password"
                className="w-full rounded-2xl bg-ink-100 px-3.5 py-2 text-sm text-ink-900 outline-none focus:ring-2 focus:ring-brand-500/60"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={USER_TEXT.role}>
              <Dropdown value={role} options={ROLE_OPTIONS} onChange={(value) => { setRole(value); markChanged({ role: value }); }} />
            </Field>
            <Field label={USER_TEXT.permissions}>
              <div className="rounded-2xl bg-ink-100 px-3.5 py-2 text-sm text-ink-900">
                {permissions.size} {USER_TEXT.permissionCount}
              </div>
            </Field>
          </div>

          <div className="rounded-2xl bg-white p-4">
            <div className="flex items-center gap-2">
              <Checkbox checked={active} onChange={(v) => { setActive(v); markChanged({ active: v }); }} disabled={isSelf} />
              <span className="text-sm font-medium text-ink-900">{USER_TEXT.active}</span>
              <span className="text-xs text-ink-400">{USER_TEXT.activeHint}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                {USER_TEXT.permissions}
              </p>
              <Button
                variant="grey"
                type="button"
                onClick={useRoleDefaults}
                title={USER_TEXT.useRoleDefaultsHint}
              >
                {USER_TEXT.useRoleDefaults}
              </Button>
            </div>
            {isSelf && <p className="mb-3 text-xs text-ink-500">{USER_TEXT.selfGuard}</p>}
            <div className="space-y-4">
              {PERMISSION_GROUPS.map((group) => {
                const selected = group.keys.filter((k) => permissions.has(k)).length;
                const allSelected = selected === group.keys.length;
                const groupState: boolean | "indeterminate" =
                  selected === 0 ? false : allSelected ? true : "indeterminate";
                return (
                  <div key={group.title}>
                    <Checkbox
                      checked={groupState}
                      onChange={() => toggleGroup(group.keys)}
                      label={group.title}
                      description={`${selected} of ${group.keys.length} allowed`}
                    />
                    <div className="mt-2 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
                      {group.keys.map((key) => (
                        <Checkbox
                          key={key}
                          checked={permissions.has(key)}
                          onChange={() => togglePermission(key)}
                          label={PERMISSION_LABELS[key] ?? key}
                          disabled={isSelf && key === "user.manage"}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-ink-100 pt-4">
        <Button variant="grey" type="button" onClick={() => dirty.requestClose(onClose)}>
          {USER_TEXT.cancel}
        </Button>
        <Button type="submit" loading={submitting}>
          {USER_TEXT.save}
        </Button>
      </div>

      <DiscardConfirmDialog
        open={dirty.confirmOpen}
        onConfirm={dirty.confirmDiscard}
        onCancel={dirty.cancelDiscard}
      />
    </form>
  );
}

export function UsersManager() {
  const { user } = useAuth();
  const { data: users, loading, error, refetch } = useApi<AdminUser[]>("/user");

  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);

  const me = users?.find((u) => u.id === user?.id);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {panelOpen ? (
        <UserForm
          key={editing?.id ?? "new"}
          editing={editing}
          me={me}
          onClose={() => {
            setPanelOpen(false);
            setEditing(null);
          }}
          onSaved={() => {
            setPanelOpen(false);
            setEditing(null);
            void refetch();
          }}
        />
      ) : (
        <>
          <div className="mb-3 flex shrink-0 items-center justify-between">
            <p className="text-sm text-ink-500">{USER_TEXT.subtitle}</p>
            <Button onClick={() => setPanelOpen(true)}>
              <PlusIcon className="h-4 w-4" />
              {USER_TEXT.newUser}
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <p className="py-10 text-center text-sm text-ink-400">Loading users…</p>
            ) : error ? (
              <EmptyState
                title={error}
                action={
                  <Button variant="grey" onClick={() => void refetch()}>
                    {USER_TEXT.retry}
                  </Button>
                }
              />
            ) : !users || users.length === 0 ? (
              <EmptyState
                icon={<UsersIcon className="h-10 w-10 text-ink-300" />}
                title={USER_TEXT.noData}
                action={
                  <Button variant="grey" onClick={() => setPanelOpen(true)}>
                    <PlusIcon className="h-4 w-4" />
                    {USER_TEXT.newUser}
                  </Button>
                }
              />
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-sm font-bold text-brand-600">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink-900">{u.name}</p>
                        <Badge variant="neutral">@{u.username}</Badge>
                      </div>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-500">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: ROLE_META[u.role].color }}
                        />
                        {ROLE_META[u.role].label}
                        <span>·</span>
                        {u.permissions.length} {USER_TEXT.permissionCount}
                        <span>·</span>
                        {u.active ? (
                          <span className="text-brand-600">Active</span>
                        ) : (
                          <span className="text-ink-400">Inactive</span>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="grey"
                      onClick={() => {
                        setEditing(u);
                        setPanelOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
