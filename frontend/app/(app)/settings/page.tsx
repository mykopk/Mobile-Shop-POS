"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import { useAuth } from "@/lib/auth-context";
import { useApi } from "@/lib/use-api";
import { canViewCosts } from "@/lib/roles";
import { SOUND, type SoundKind } from "@/lib/constants";
import { setSoundPrefs } from "@/lib/sound";
import { CheckIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type SoundPrefs = Record<SoundKind, boolean>;

const DEFAULT_SOUNDS: SoundPrefs = {
  click: true,
  success: true,
  error: true,
  pop: true,
};

type CompanyProfile = {
  id: string;
  name: string;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  footerText: string | null;
  currency: string;
  taxRate: string;
  whatsapp: string | null;
};

type BankAccount = {
  id: string;
  name: string;
  bankName: string;
  accountNo: string;
  holderName: string | null;
  iban: string | null;
  isDefault: boolean;
  active: boolean;
};

const EMPTY_ACCOUNT = {
  name: "",
  bankName: "",
  accountNo: "",
  holderName: "",
  iban: "",
};

export default function SettingsPage() {
  const { user, token } = useAuth();
  const { data, loading } = useApi<CompanyProfile>("/settings/company");
  const { toast } = useToast();
  const [form, setForm] = useState<Partial<CompanyProfile>>({});
  const [saving, setSaving] = useState(false);
  const [sounds, setSounds] = useState<SoundPrefs>(DEFAULT_SOUNDS);
  const [soundsOn, setSoundsOn] = useState(true);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [accountForm, setAccountForm] = useState(EMPTY_ACCOUNT);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  useEffect(() => {
    let cancelled = false;
    if (!token) return;
    apiRequest<BankAccount[]>("/bank-account", { token })
      .then((list) => {
        if (!cancelled) setAccounts(list ?? []);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    if (!token) return;
    apiRequest<SoundPrefs>("/settings/sound", { method: "GET", token })
      .then((data) => {
        if (cancelled) return;
        setSounds(data);
        setSoundsOn(Object.values(data).some(Boolean));
        setSoundPrefs(data);
      })
      .catch(() => {
        if (cancelled) return;
        setSoundPrefs(DEFAULT_SOUNDS);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  function updateSounds(next: SoundPrefs) {
    setSounds(next);
    setSoundPrefs(next);
    void apiRequest("/settings/sound", { method: "PUT", token, body: next }).catch(() => {
      toast("Failed to save sound settings", "error");
    });
  }

  const canEdit = canViewCosts(user?.role);

  async function save() {
    setSaving(true);
    try {
      await apiRequest("/settings/company", {
        method: "PUT",
        token,
        body: {
          name: form.name ?? "DOST Mobile",
          tagline: form.tagline || undefined,
          address: form.address || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          footerText: form.footerText || undefined,
          currency: form.currency ?? "PKR",
          taxRate: parseFloat(form.taxRate ?? "0") || 0,
          whatsapp: form.whatsapp || undefined,
        },
      });
      toast("Company profile saved", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  async function saveAccount() {
    setSavingAccount(true);
    try {
      if (editingAccount) {
        const updated = await apiRequest<BankAccount>(`/bank-account/${editingAccount.id}`, {
          method: "PUT",
          token,
          body: accountForm,
        });
        setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        toast("Bank account updated", "success");
      } else {
        const created = await apiRequest<BankAccount>("/bank-account", {
          method: "POST",
          token,
          body: { ...accountForm, active: true },
        });
        setAccounts((prev) => [...prev, created]);
        toast("Bank account added", "success");
      }
      setAccountForm(EMPTY_ACCOUNT);
      setEditingAccount(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save bank account", "error");
    } finally {
      setSavingAccount(false);
    }
  }

  async function setDefaultAccount(id: string) {
    try {
      const updated = await apiRequest<BankAccount>(`/bank-account/${id}/default`, {
        method: "POST",
        token,
      });
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? updated : { ...a, isDefault: false })),
      );
      toast("Default account updated", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to set default", "error");
    }
  }

  async function removeAccount(id: string) {
    try {
      await apiRequest(`/bank-account/${id}`, { method: "DELETE", token });
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      toast("Bank account removed", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to remove account", "error");
    }
  }

  function startEdit(account: BankAccount) {
    setEditingAccount(account);
    setAccountForm({
      name: account.name,
      bankName: account.bankName,
      accountNo: account.accountNo,
      holderName: account.holderName ?? "",
      iban: account.iban ?? "",
    });
  }

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-sm text-ink-500">Company profile used on receipts and reports.</p>

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : (
        <div className="space-y-3 rounded-2xl bg-white p-5">
          <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Store name" disabled={!canEdit} />
          <Input value={form.tagline ?? ""} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Tagline" disabled={!canEdit} />
          <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" disabled={!canEdit} />
          <Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" disabled={!canEdit} />
          <Input value={form.footerText ?? ""} onChange={(e) => setForm({ ...form, footerText: e.target.value })} placeholder="Receipt footer text" disabled={!canEdit} />
          {canEdit && (
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                <CheckIcon className="h-4 w-4" />
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl bg-white p-5">
        <h3 className="text-sm font-semibold text-ink-900">QR code targets</h3>
        <p className="mb-3 text-xs text-ink-500">Used by the Print Studio for receipts and slips.</p>
        <div className="space-y-3">
          <Input
            value={form.whatsapp ?? ""}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            placeholder="WhatsApp number (e.g. 03001234567)"
            disabled={!canEdit}
          />
          {canEdit && (
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                <CheckIcon className="h-4 w-4" />
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5">
        <h3 className="text-sm font-semibold text-ink-900">Bank accounts</h3>
        <p className="mb-3 text-xs text-ink-500">
          Shown on receipts when “Bank accounts” is toggled in the Print Studio.
        </p>

        <div className="space-y-2">
          {accounts.length === 0 && (
            <p className="rounded-xl bg-ink-50 px-3 py-2.5 text-xs text-ink-500">
              No bank accounts yet — add one below.
            </p>
          )}
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-900">
                  {account.bankName} · {account.name}
                  {account.isDefault && (
                    <Badge variant="brand" className="ml-2">Default</Badge>
                  )}
                </p>
                <p className="truncate text-xs text-ink-500">
                  {[account.holderName, account.accountNo, account.iban].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!account.isDefault && (
                  <Button variant="grey" className="px-2.5 py-1.5 text-xs" onClick={() => setDefaultAccount(account.id)}>
                    Set default
                  </Button>
                )}
                <Button variant="ghost" className="px-2.5 py-1.5 text-xs" onClick={() => startEdit(account)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  className="px-2 py-1.5 text-xs text-red-500"
                  onClick={() => removeAccount(account.id)}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-xl bg-ink-50 p-3">
          <p className="mb-2 text-xs font-semibold text-ink-700">
            {editingAccount ? "Edit bank account" : "Add bank account"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={accountForm.name}
              onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
              placeholder="Account name (e.g. Business)" 
              disabled={!canEdit}
            />
            <Input
              value={accountForm.bankName}
              onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
              placeholder="Bank name (e.g. Meezan)"
              disabled={!canEdit}
            />
            <Input
              value={accountForm.accountNo}
              onChange={(e) => setAccountForm({ ...accountForm, accountNo: e.target.value })}
              placeholder="Account number"
              disabled={!canEdit}
            />
            <Input
              value={accountForm.holderName}
              onChange={(e) => setAccountForm({ ...accountForm, holderName: e.target.value })}
              placeholder="Account title (optional)"
              disabled={!canEdit}
            />
            <Input
              value={accountForm.iban}
              onChange={(e) => setAccountForm({ ...accountForm, iban: e.target.value })}
              placeholder="IBAN (optional)"
              disabled={!canEdit}
              className="col-span-2"
            />
          </div>
          {canEdit && (
            <div className="mt-2 flex justify-end gap-2">
              {editingAccount && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditingAccount(null);
                    setAccountForm(EMPTY_ACCOUNT);
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button onClick={saveAccount} disabled={savingAccount}>
                <PlusIcon className="h-4 w-4" />
                {savingAccount ? "Saving…" : editingAccount ? "Update" : "Add account"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5">
        <div className="space-y-3">
          <Checkbox
            checked={soundsOn}
            onChange={(on) => {
              setSoundsOn(on);
              updateSounds(on ? sounds : DEFAULT_SOUNDS);
            }}
            label={SOUND.enabled}
            description="Play feedback sounds across the app."
          />
          {SOUND.kinds.map((kind) => (
            <Checkbox
              key={kind.value}
              checked={sounds[kind.value]}
              onChange={(checked) => updateSounds({ ...sounds, [kind.value]: checked })}
              label={kind.label}
              description={kind.description}
              disabled={!soundsOn}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
