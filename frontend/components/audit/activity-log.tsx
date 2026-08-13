"use client";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import { useAuth } from "@/lib/auth-context";
import type { AuditLogPage, AuditMeta } from "@/lib/api-types";
import { useApi } from "@/lib/use-api";
import { AUDIT_TEXT, auditActionLabel } from "@/lib/constants";
import { hasPermission } from "@/lib/roles";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { toISODate, formatDateTime } from "@/lib/dates";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Dropdown } from "@/components/ui/dropdown";
import { TypePill, type TypePillTone } from "@/components/ui/type-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  HistoryIcon,
  FilterIcon,
  RefreshIcon,
  ChevronRightIcon,
  XIcon,
} from "@/components/icons";

const PAGE_SIZE = 25;

type ActionFilter = "ALL" | string;
type EntityFilter = "ALL" | string;
type UserFilter = "ALL" | string;
type RangeKey = "all" | "today" | "7" | "30" | "90" | "custom";

const RANGE_PRESETS: { key: RangeKey; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "today", label: "Today" },
  { key: "7", label: "Last 7 days" },
  { key: "30", label: "Last 30 days" },
  { key: "90", label: "Last 90 days" },
];

const ENTITY_TONE: Record<string, TypePillTone> = {
  Transaction: "brand",
  Expense: "brand",
  Voucher: "brand",
  CompanyProfile: "grey",
  Product: "grey",
  Unit: "grey",
  Reservation: "grey",
  User: "white",
  Contact: "white",
  BankAccount: "white",
  Brand: "white",
  Category: "white",
  Color: "white",
};

function rangeToDates(range: RangeKey): { from?: string; to?: string } {
  if (range === "all") return { from: undefined, to: undefined };
  if (range === "today") {
    const today = toISODate(new Date());
    return { from: today, to: today };
  }
  const days = Number(range);
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: toISODate(from), to: toISODate(new Date()) };
}

function prettyDetails(details: string | null): { label: string; value: string }[] | null {
  if (!details) return null;
  try {
    const parsed = JSON.parse(details) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    const entries = Object.entries(parsed);
    if (entries.length === 0) return null;
    return entries.map(([k, v]) => ({
      label: k.replace(/[A-Z]/g, (c) => ` ${c.toLowerCase()}`).trim(),
      value: v === null || v === undefined ? "—" : String(v),
    }));
  } catch {
    return null;
  }
}

export function ActivityLog() {
  const { user } = useAuth();
  const { data: meta } = useApi<AuditMeta>("/audit/meta");
  const canView = hasPermission(user, PERMISSIONS.auditView);

  const [range, setRange] = useState<RangeKey>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [action, setAction] = useState<ActionFilter>("ALL");
  const [entity, setEntity] = useState<EntityFilter>("ALL");
  const [userFilter, setUserFilter] = useState<UserFilter>("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageData, setPageData] = useState<AuditLogPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDetail, setOpenDetail] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [range, action, entity, userFilter, debouncedSearch]);

  const users = useMemo(() => {
    const seen = new Set<string>();
    const list: { value: string; label: string }[] = [];
    for (const item of pageData?.items ?? []) {
      if (seen.has(item.user.id)) continue;
      seen.add(item.user.id);
      list.push({ value: item.user.id, label: item.user.name || item.user.username });
    }
    return list;
  }, [pageData]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const dates = range === "custom" ? { from: customFrom, to: customTo } : rangeToDates(range);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    if (action !== "ALL") params.set("action", action);
    if (entity !== "ALL") params.set("entity", entity);
    if (userFilter !== "ALL") params.set("userId", userFilter);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (dates.from) params.set("from", dates.from);
    if (dates.to) params.set("to", dates.to);

    (async () => {
      try {
        const data = await apiRequest<AuditLogPage>(`/audit?${params.toString()}`);
        if (!cancelled) setPageData(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load activity");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, action, entity, userFilter, debouncedSearch, range, customFrom, customTo]);

  const actionOptions = useMemo(
    () =>
      (meta?.actions ?? []).map((a) => ({
        value: a,
        label: auditActionLabel(a),
      })),
    [meta],
  );
  const entityOptions = useMemo(
    () => (meta?.entities ?? []).map((e) => ({ value: e, label: e })),
    [meta],
  );

  const hasFilters =
    action !== "ALL" ||
    entity !== "ALL" ||
    userFilter !== "ALL" ||
    debouncedSearch !== "" ||
    range !== "all";

  const totalPages = pageData ? Math.max(1, Math.ceil(pageData.total / PAGE_SIZE)) : 1;

  if (!canView) {
    return (
      <EmptyState
        icon={<HistoryIcon className="h-10 w-10 text-ink-300" />}
        title="You don't have permission to view the activity log."
      />
    );
  }

  const detail = pageData?.items.find((i) => i.id === openDetail) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink-900">{AUDIT_TEXT.title}</h2>
          <p className="text-sm text-ink-500">{AUDIT_TEXT.subtitle}</p>
        </div>
        <Button variant="grey" onClick={() => setPage(1)} disabled={loading}>
          <RefreshIcon className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <SegmentedControl
          options={RANGE_PRESETS.map((r) => ({ value: r.key, label: r.label }))}
          value={range}
          onChange={(v) => setRange(v as typeof range)}
        />
        {range === "custom" && (
          <div className="ml-1 flex h-9 items-center gap-2">
            <DatePicker value={customFrom} onChange={setCustomFrom} className="w-36" />
            <span className="text-ink-400">–</span>
            <DatePicker value={customTo} onChange={setCustomTo} className="w-36" />
          </div>
        )}
        {range === "custom" && (
          <button
            type="button"
            onClick={() => {
              setRange("all");
              setCustomFrom("");
              setCustomTo("");
            }}
            className="flex h-9 items-center rounded-full px-2 text-xs font-medium text-ink-400 transition hover:text-ink-700"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          variant="white"
          placeholder={AUDIT_TEXT.searchPlaceholder}
          wrapperClassName="min-w-64 flex-1 sm:max-w-xs"
        />
        <Dropdown
          value={action === "ALL" ? null : action}
          options={[{ value: "", label: AUDIT_TEXT.allActions }, ...actionOptions]}
          onChange={(v) => setAction(v ? v : "ALL")}
          placeholder={AUDIT_TEXT.allActions}
          searchable
          triggerClassName="min-w-44"
          className="shrink-0"
        />
        <Dropdown
          value={entity === "ALL" ? null : entity}
          options={[{ value: "", label: AUDIT_TEXT.allEntities }, ...entityOptions]}
          onChange={(v) => setEntity(v ? v : "ALL")}
          placeholder={AUDIT_TEXT.allEntities}
          searchable
          triggerClassName="min-w-40"
          className="shrink-0"
        />
        <Dropdown
          value={userFilter === "ALL" ? null : userFilter}
          options={[{ value: "", label: AUDIT_TEXT.allUsers }, ...users]}
          onChange={(v) => setUserFilter(v ? v : "ALL")}
          placeholder={AUDIT_TEXT.allUsers}
          searchable
          triggerClassName="min-w-40"
          className="shrink-0"
        />
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setAction("ALL");
              setEntity("ALL");
              setUserFilter("ALL");
              setSearch("");
              setRange("all");
            }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-ink-500 transition hover:bg-white hover:text-ink-900"
          >
            <FilterIcon className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>

      {error ? (
        <p className="py-10 text-center text-sm text-error">{error}</p>
      ) : loading && !pageData ? (
        <p className="py-10 text-center text-sm text-ink-400">{AUDIT_TEXT.loading}</p>
      ) : pageData && pageData.items.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon className="h-10 w-10 text-ink-300" />}
          title={
            hasFilters || pageData.total > 0
              ? AUDIT_TEXT.noMatch
              : AUDIT_TEXT.noData
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white">
          <div className="divide-y divide-ink-100">
            {(pageData?.items ?? []).map((item) => {
              const isOpen = openDetail === item.id;
              const parsed = prettyDetails(item.details);
              return (
                <div key={item.id}>
                  <button
                    type="button"
                    onClick={() => setOpenDetail(isOpen ? null : item.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-ink-50"
                  >
                    <TypePill tone={ENTITY_TONE[item.entity] ?? "grey"}>
                      {item.entity}
                    </TypePill>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">
                      {auditActionLabel(item.action)}
                    </span>
                    <span className="hidden shrink-0 items-center gap-2 text-xs text-ink-400 sm:flex">
                      <span className="font-medium text-ink-600">
                        {item.user.name || item.user.username}
                      </span>
                      <span>·</span>
                      <span className="whitespace-nowrap">
                        {formatDateTime(item.createdAt)}
                      </span>
                    </span>
                    <ChevronRightIcon
                      className={`h-4 w-4 shrink-0 text-ink-300 transition ${
                        isOpen ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-dashed border-ink-100 bg-ink-50/50 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-ink-500">
                        <span>
                          <span className="font-medium text-ink-700">{AUDIT_TEXT.entity}:</span>{" "}
                          {item.entity}
                        </span>
                        <span>
                          <span className="font-medium text-ink-700">{AUDIT_TEXT.action}:</span>{" "}
                          {auditActionLabel(item.action)}
                        </span>
                        {item.entityId && (
                          <span className="font-mono text-[11px] text-ink-500">
                            {item.entityId}
                          </span>
                        )}
                        <span>
                          <span className="font-medium text-ink-700">By:</span>{" "}
                          {item.user.name || item.user.username}
                        </span>
                        <span>{formatDateTime(item.createdAt)}</span>
                      </div>
                      {parsed && (
                        <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                          {parsed.map((row) => (
                            <div
                              key={row.label}
                              className="flex items-baseline justify-between gap-3 text-xs"
                            >
                              <span className="shrink-0 text-ink-400">{row.label}</span>
                              <span className="truncate font-medium text-ink-700">
                                {row.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pageData && pageData.total > 0 && (
        <div className="flex shrink-0 items-center justify-between border-t border-ink-100 bg-white px-1 pt-3">
          <p className="text-xs text-ink-400">
            {pageData.total} {AUDIT_TEXT.rows}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="grey"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-xs font-medium text-ink-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="grey"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
