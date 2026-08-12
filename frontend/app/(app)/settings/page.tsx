"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import { useAuth } from "@/lib/auth-context";
import { useApi } from "@/lib/use-api";
import { hasPermission } from "@/lib/roles";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { SOUND, APP, CURRENCIES, currencyOf, DEFAULT_TIMEZONE, type SoundKind } from "@/lib/constants";
import { setSoundPrefs } from "@/lib/sound";
import { setUnsaved } from "@/lib/unsaved-guard";
import type { BankAccount, CompanyProfile } from "@/lib/api-types";
import {
  CheckIcon,
  HeadphonesIcon,
  LockIcon,
  PlusIcon,
  PrinterIcon,
  SettingsIcon,
  SmartphoneIcon,
  TrashIcon,
  UserIcon,
  WalletIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { ImagePicker } from "@/components/products/image-picker";
import { UsersManager } from "@/components/users/users-manager";
import { useToast } from "@/components/ui/toast";

type SoundPrefs = Record<SoundKind, boolean>;

const DEFAULT_SOUNDS: SoundPrefs = {
  click: true,
  success: true,
  error: true,
  pop: true,
};

const EMPTY_ACCOUNT = {
  name: "",
  bankName: "",
  accountNo: "",
  holderName: "",
  iban: "",
};

const TIMEZONES = [
  { value: "Asia/Karachi", label: "Karachi (PKT, UTC+5)" },
  { value: "Asia/Dubai", label: "Dubai (UTC+4)" },
  { value: "Asia/Kabul", label: "Kabul (UTC+4:30)" },
  { value: "Asia/Riyadh", label: "Riyadh (UTC+3)" },
  { value: "Asia/Dhaka", label: "Dhaka (UTC+6)" },
  { value: "Asia/Colombo", label: "Colombo (UTC+5:30)" },
  { value: "Asia/Kolkata", label: "Kolkata (UTC+5:30)" },
  { value: "UTC", label: "UTC" },
];

type TabId = "shop" | "preferences" | "contact" | "bank" | "sounds" | "users";

const TABS: { id: TabId; label: string; icon: React.ReactNode; hint?: string }[] = [
  { id: "shop", label: "Shop details", icon: <SettingsIcon className="h-4 w-4" /> },
  { id: "preferences", label: "Preferences", icon: <LockIcon className="h-4 w-4" /> },
  { id: "contact", label: "Contact & QR", icon: <SmartphoneIcon className="h-4 w-4" /> },
  { id: "bank", label: "Bank accounts", icon: <WalletIcon className="h-4 w-4" /> },
  { id: "sounds", label: "Sounds", icon: <HeadphonesIcon className="h-4 w-4" /> },
  { id: "users", label: "Users & roles", icon: <UserIcon className="h-4 w-4" />, hint: "Manage staff" },
];

type GroupProps = { children: React.ReactNode };

function Group({ children }: GroupProps) {
  return <div className="divide-y divide-ink-100 overflow-hidden rounded-2xl bg-white">{children}</div>;
}

type RowProps = {
  icon?: React.ReactNode;
  iconBg?: string;
  label: string;
  value?: React.ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
};

function Row({ icon, iconBg = "bg-brand-500", label, value, chevron = false, onClick, children }: RowProps) {
  const interactive = onClick !== undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left ${
        interactive ? "cursor-pointer transition hover:bg-ink-50" : "cursor-default"
      }`}
    >
      {icon && (
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white ${iconBg}`}>
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 text-sm font-medium text-ink-900">{label}</span>
      {value && <span className="shrink-0 text-sm text-ink-400">{value}</span>}
      {chevron && <ChevronIcon />}
      {children}
    </button>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-ink-300" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink-500">{label}</label>
      {children}
    </div>
  );
}

function PaneTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-ink-900">{title}</h2>
        {subtitle && <p className="text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { data, loading } = useApi<CompanyProfile>("/settings/company");
  const { toast } = useToast();
  const [tab, setTab] = useState<TabId>("shop");
  const [form, setForm] = useState<Partial<CompanyProfile>>({});
  const [savedProfile, setSavedProfile] = useState<Partial<CompanyProfile> | null>(null);
  const [pendingTab, setPendingTab] = useState<TabId | null>(null);
  const [saving, setSaving] = useState(false);
  const [sounds, setSounds] = useState<SoundPrefs>(DEFAULT_SOUNDS);
  const [soundsOn, setSoundsOn] = useState(true);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [accountForm, setAccountForm] = useState(EMPTY_ACCOUNT);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [addingAccount, setAddingAccount] = useState(false);

  const profileDirty = savedProfile !== null && JSON.stringify(form) !== JSON.stringify(savedProfile);
  const accountDirty = addingAccount && Object.values(accountForm).some(Boolean);
  const dirty = profileDirty || accountDirty;

  useEffect(() => {
    setUnsaved(dirty);
  }, [dirty]);

  useEffect(() => () => setUnsaved(false), []);

  useEffect(() => {
    if (data) {
      setForm(data);
      setSavedProfile(data);
    }
  }, [data]);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function onTabClick(next: TabId) {
    if (dirty && next !== tab) {
      setPendingTab(next);
      return;
    }
    setTab(next);
  }

  function confirmDiscard() {
    if (pendingTab) setTab(pendingTab);
    if (savedProfile) setForm(savedProfile);
    setAccountForm(EMPTY_ACCOUNT);
    setEditingAccount(null);
    setAddingAccount(false);
    setPendingTab(null);
  }

  useEffect(() => {
    let cancelled = false;
    apiRequest<BankAccount[]>("/bank-account")
      .then((list) => {
        if (!cancelled) setAccounts(list ?? []);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiRequest<SoundPrefs>("/settings/sound", { method: "GET" })
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
  }, []);

  function updateSounds(next: SoundPrefs) {
    setSounds(next);
    setSoundPrefs(next);
    void apiRequest("/settings/sound", { method: "PUT", body: next }).catch(() => {
      toast("Failed to save sound settings", "error");
    });
  }

  const canEdit = hasPermission(user, PERMISSIONS.settingsWrite);

  async function save() {
    setSaving(true);
    try {
      await apiRequest("/settings/company", {
        method: "PUT",
        body: {
          name: form.name ?? APP.nameFull,
          tagline: form.tagline || undefined,
          address: form.address || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          footerText: form.footerText || undefined,
          logoUrl: form.logoUrl || undefined,
          currency: form.currency ?? "PKR",
          taxRate: parseFloat(form.taxRate ?? "0") || 0,
          compactPrices: form.compactPrices ?? true,
          timezone: form.timezone || DEFAULT_TIMEZONE,
          whatsapp: form.whatsapp || undefined,
          website: form.website || undefined,
        },
      });
      toast("Settings saved", "success");
      setSavedProfile(form);
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
          body: accountForm,
        });
        setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        toast("Bank account updated", "success");
      } else {
        const created = await apiRequest<BankAccount>("/bank-account", {
          method: "POST",
          body: { ...accountForm, active: true },
        });
        setAccounts((prev) => [...prev, created]);
        toast("Bank account added", "success");
      }
      setAccountForm(EMPTY_ACCOUNT);
      setEditingAccount(null);
      setAddingAccount(false);
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
      });
      setAccounts((prev) => prev.map((a) => (a.id === id ? updated : { ...a, isDefault: false })));
      toast("Default account updated", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to set default", "error");
    }
  }

  async function removeAccount(id: string) {
    try {
      await apiRequest(`/bank-account/${id}`, { method: "DELETE" });
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      toast("Bank account removed", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to remove account", "error");
    }
  }

  function startEdit(account: BankAccount) {
    setEditingAccount(account);
    setAddingAccount(true);
    setAccountForm({
      name: account.name,
      bankName: account.bankName,
      accountNo: account.accountNo,
      holderName: account.holderName ?? "",
      iban: account.iban ?? "",
    });
  }

  return (
    <div className="flex h-full overflow-hidden rounded-3xl border border-ink-100 bg-white">
      <aside className="w-56 shrink-0 overflow-y-auto overscroll-none border-r border-ink-100 bg-ink-50/60 px-4 py-5">
        <div className="mb-5 flex items-center gap-2">
          {form.logoUrl ? (
            <img src={form.logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-base font-bold text-white">
              {(form.name ?? APP.nameFull).charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900">{form.name ?? APP.nameFull}</p>
            <p className="truncate text-xs text-ink-500">{user?.name}</p>
          </div>
        </div>

        <p className="mb-1 px-1 text-xs font-medium uppercase tracking-wide text-ink-400">Settings</p>
        <div className="space-y-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabClick(t.id)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition ${
                tab === t.id ? "bg-brand-500 text-white" : "text-ink-700 hover:bg-ink-100"
              }`}
            >
              <span className={tab === t.id ? "text-white" : "text-ink-500"}>{t.icon}</span>
              <span className="flex-1 text-left">{t.label}</span>
              {t.hint && <span className={`text-[10px] ${tab === t.id ? "text-white/70" : "text-ink-400"}`}>{t.hint}</span>}
              {dirty && t.id === tab && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                    tab === t.id ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  Unsaved
                </span>
              )}
            </button>
          ))}
        </div>

        <p className="mb-1 mt-6 px-1 text-xs font-medium uppercase tracking-wide text-ink-400">Tools</p>
        <div className="space-y-0.5">
          <a
            href="/print"
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-100"
          >
            <span className="text-ink-500"><PrinterIcon className="h-4 w-4" /></span>
            Print Studio
          </a>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto overscroll-none px-7 py-6">
        {tab === "shop" && (
          <>
            <PaneTitle
              title="Shop details"
              subtitle="Shown on receipts, reservation slips and printed documents."
              action={
                canEdit && (
                  <Button onClick={save} loading={saving} loadingText="Saving…">
                    <CheckIcon className="h-4 w-4" />
                    Save changes
                  </Button>
                )
              }
            />
            {loading ? (
              <p className="text-sm text-ink-400">Loading…</p>
            ) : (
              <Group>
                <div className="px-4 py-3">
                  <Field label="Store logo">
                    <ImagePicker
                      shape="square"
                      value={form.logoUrl ?? ""}
                      onChange={(v) => setForm({ ...form, logoUrl: v || null })}
                    />
                  </Field>
                </div>
                <div className="px-4 py-3">
                  <Field label="Store name">
                    <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Store name" disabled={!canEdit} />
                  </Field>
                </div>
                <div className="px-4 py-3">
                  <Field label="Tagline">
                    <Input value={form.tagline ?? ""} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="One-line description" disabled={!canEdit} />
                  </Field>
                </div>
                <div className="px-4 py-3">
                  <Field label="Address">
                    <Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Shop address" disabled={!canEdit} />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-2">
                  <Field label="Phone">
                    <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0300-1234567" inputMode="tel" disabled={!canEdit} />
                  </Field>
                  <Field label="Email">
                    <Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="shop@example.com" type="email" disabled={!canEdit} />
                  </Field>
                </div>
              </Group>
            )}
          </>
        )}

        {tab === "preferences" && (
          <>
            <PaneTitle
              title="Preferences"
              subtitle="Region and receipt defaults."
              action={
                canEdit && (
                  <Button onClick={save} loading={saving} loadingText="Saving…">
                    <CheckIcon className="h-4 w-4" />
                    Save changes
                  </Button>
                )
              }
            />
            <Group>
              <div className="px-4 py-3">
                <Field label="Timezone">
                  <Dropdown
                    value={form.timezone ?? DEFAULT_TIMEZONE}
                    options={TIMEZONES.map((tz) => ({ value: tz.value, label: tz.label }))}
                    onChange={(v) => setForm({ ...form, timezone: v })}
                    triggerClassName={!canEdit ? "opacity-60" : ""}
                    placeholder="Select timezone…"
                  />
                </Field>
              </div>
              <div className="px-4 py-3">
                <Field label="Currency">
                  <Dropdown
                    value={form.currency ?? "PKR"}
                    options={CURRENCIES.map((c) => ({
                      value: c.code,
                      label: `${c.symbol} — ${c.label} (${c.code})`,
                    }))}
                    onChange={(v) => setForm({ ...form, currency: v })}
                    triggerClassName={!canEdit ? "opacity-60" : ""}
                    placeholder="Select currency…"
                  />
                  <p className="mt-1 text-xs text-ink-400">
                    Symbol used on receipts and the dashboard:{" "}
                    <span className="font-semibold text-ink-600">
                      {currencyOf(form.currency ?? "PKR")?.symbol ?? "Rs"}
                    </span>
                  </p>
                </Field>
              </div>
              <div className="px-4 py-3">
                <Field label="Tax rate" hint="Applied to invoices">
                  <div className="flex items-center gap-2">
                    <Input
                      value={form.taxRate ?? "0"}
                      onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                      placeholder="0"
                      inputMode="decimal"
                      disabled={!canEdit}
                    />
                    <span className="shrink-0 text-sm text-ink-500">%</span>
                  </div>
                </Field>
              </div>
              <div className="px-4 py-3">
                <Checkbox
                  checked={form.compactPrices ?? true}
                  onChange={(on) => setForm({ ...form, compactPrices: on })}
                  disabled={!canEdit}
                  label="Show compact prices"
                  description="Display large amounts like 375k instead of 375,000 on the dashboard."
                />
              </div>
              <div className="px-4 py-3">
                <Field label="Receipt footer">
                  <Input value={form.footerText ?? ""} onChange={(e) => setForm({ ...form, footerText: e.target.value })} placeholder="Message printed at the bottom of receipts" disabled={!canEdit} />
                </Field>
              </div>
            </Group>
          </>
        )}

        {tab === "contact" && (
          <>
            <PaneTitle
              title="Contact & QR"
              subtitle="Used by the Print Studio for receipts and slips."
              action={
                canEdit && (
                  <Button onClick={save} loading={saving} loadingText="Saving…">
                    <CheckIcon className="h-4 w-4" />
                    Save changes
                  </Button>
                )
              }
            />
            <Group>
              <div className="px-4 py-3">
                <Field label="WhatsApp number">
                  <Input value={form.whatsapp ?? ""} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="03001234567" inputMode="tel" disabled={!canEdit} />
                </Field>
              </div>
              <div className="px-4 py-3">
                <Field label="Raast ID" hint="For receiving payments via Raast">
                  <Input value={form.raastId ?? ""} onChange={(e) => setForm({ ...form, raastId: e.target.value })} placeholder="03xxxxxxxxx or IBAN" disabled={!canEdit} />
                </Field>
              </div>
              <div className="px-4 py-3">
                <Field label="Website">
                  <Input value={form.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://example.com" type="url" disabled={!canEdit} />
                </Field>
              </div>
            </Group>
          </>
        )}

        {tab === "bank" && (
          <>
            <PaneTitle title="Bank accounts" subtitle="Shown on receipts when “Bank accounts” is toggled in the Print Studio." />
            <Group>
              {accounts.length === 0 && !canEdit && (
                <Row icon={<WalletIcon className="h-4 w-4" />} iconBg="bg-violet-500" label="No bank accounts yet" />
              )}
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500 text-white">
                    <WalletIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-medium text-ink-900">
                      {account.bankName} · {account.name}
                      {account.isDefault && <Badge variant="brand">Default</Badge>}
                    </p>
                    <p className="truncate text-xs text-ink-400">
                      {[account.holderName, account.accountNo, account.iban].filter(Boolean).join(" · ") || "—"}
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
                    <Button variant="ghost" className="px-2 py-1.5 text-xs text-red-500" onClick={() => removeAccount(account.id)}>
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {(addingAccount || accounts.length === 0) && canEdit && (
                <div className="space-y-2 px-4 py-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Account name">
                      <Input value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} placeholder="e.g. Business" />
                    </Field>
                    <Field label="Bank name">
                      <Input value={accountForm.bankName} onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })} placeholder="e.g. Meezan" />
                    </Field>
                    <Field label="Account number">
                      <Input value={accountForm.accountNo} onChange={(e) => setAccountForm({ ...accountForm, accountNo: e.target.value })} placeholder="Account number" />
                    </Field>
                    <Field label="Account title">
                      <Input value={accountForm.holderName} onChange={(e) => setAccountForm({ ...accountForm, holderName: e.target.value })} placeholder="Account title (optional)" />
                    </Field>
                    <div className="col-span-2">
                      <Field label="IBAN">
                        <Input value={accountForm.iban} onChange={(e) => setAccountForm({ ...accountForm, iban: e.target.value })} placeholder="IBAN (optional)" />
                      </Field>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    {editingAccount && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingAccount(null);
                          setAddingAccount(false);
                          setAccountForm(EMPTY_ACCOUNT);
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button onClick={saveAccount} disabled={savingAccount}>
                      <CheckIcon className="h-4 w-4" />
                      {savingAccount ? "Saving…" : editingAccount ? "Update" : "Add account"}
                    </Button>
                  </div>
                </div>
              )}
              {!addingAccount && accounts.length > 0 && canEdit && (
                <Row
                  icon={<PlusIcon className="h-4 w-4" />}
                  iconBg="bg-brand-500"
                  label="Add bank account"
                  onClick={() => { setAddingAccount(true); setEditingAccount(null); setAccountForm(EMPTY_ACCOUNT); }}
                  chevron
                />
              )}
            </Group>
          </>
        )}

        {tab === "sounds" && (
          <>
            <PaneTitle title="Sounds" subtitle="Feedback sounds across the app." />
            <Group>
              <div className="px-4 py-3">
                <Checkbox
                  checked={soundsOn}
                  onChange={(on) => {
                    setSoundsOn(on);
                    updateSounds(on ? sounds : DEFAULT_SOUNDS);
                  }}
                  label={SOUND.enabled}
                  description="Play feedback sounds across the app."
                />
              </div>
              <div className="divide-y divide-ink-100">
                {SOUND.kinds.map((kind) => (
                  <div key={kind.value} className="px-4 py-3">
                    <Checkbox
                      checked={sounds[kind.value]}
                      onChange={(checked) => updateSounds({ ...sounds, [kind.value]: checked })}
                      label={kind.label}
                      description={kind.description}
                      disabled={!soundsOn}
                    />
                  </div>
                ))}
              </div>
            </Group>
          </>
        )}

        {tab === "users" && (
          <>
            <PaneTitle title="Users & roles" subtitle="Manage staff accounts and permissions." />
            <UsersManager />
          </>
        )}
      </main>

      <Dialog
        open={pendingTab !== null}
        title="Discard unsaved changes?"
        message="You have unsaved changes in Settings. Leave this section without saving?"
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        destructive
        onConfirm={confirmDiscard}
        onCancel={() => setPendingTab(null)}
      />
    </div>
  );
}
