"use client";

import { useMemo, useState } from "react";
import type { SVGProps } from "react";
import {
  AlertIcon,
  ArrowRightIcon,
  CalendarIcon,
  CameraIcon,
  ChartPieIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  DashboardIcon,
  DownloadIcon,
  EyeIcon,
  FilterIcon,
  GripIcon,
  HeadphonesIcon,
  HistoryIcon,
  InventoryIcon,
  LockIcon,
  LogoutIcon,
  MoreIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  PosIcon,
  PrinterIcon,
  ProductsIcon,
  PurchasesIcon,
  RefundIcon,
  RefreshIcon,
  ReportsIcon,
  ReservationIcon,
  ReturnsIcon,
  SearchIcon,
  SettingsIcon,
  SmartphoneIcon,
  TagIcon,
  TrashIcon,
  TrendingUpIcon,
  UploadIcon,
  UserIcon,
  UsersIcon,
  VoucherIcon,
  WalletIcon,
  XIcon,
} from "@/components/icons";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ICONS_PAGE } from "@/lib/constants/icons";

type IconComponent = (props: SVGProps<SVGSVGElement>) => React.JSX.Element;

const ICONS: { name: string; Icon: IconComponent }[] = [
  { name: "DashboardIcon", Icon: DashboardIcon },
  { name: "PosIcon", Icon: PosIcon },
  { name: "PurchasesIcon", Icon: PurchasesIcon },
  { name: "ReturnsIcon", Icon: ReturnsIcon },
  { name: "InventoryIcon", Icon: InventoryIcon },
  { name: "ProductsIcon", Icon: ProductsIcon },
  { name: "UserIcon", Icon: UserIcon },
  { name: "UsersIcon", Icon: UsersIcon },
  { name: "LockIcon", Icon: LockIcon },
  { name: "ReportsIcon", Icon: ReportsIcon },
  { name: "SettingsIcon", Icon: SettingsIcon },
  { name: "CameraIcon", Icon: CameraIcon },
  { name: "SmartphoneIcon", Icon: SmartphoneIcon },
  { name: "HeadphonesIcon", Icon: HeadphonesIcon },
  { name: "FilterIcon", Icon: FilterIcon },
  { name: "LogoutIcon", Icon: LogoutIcon },
  { name: "PlusIcon", Icon: PlusIcon },
  { name: "TagIcon", Icon: TagIcon },
  { name: "SearchIcon", Icon: SearchIcon },
  { name: "WalletIcon", Icon: WalletIcon },
  { name: "TrendingUpIcon", Icon: TrendingUpIcon },
  { name: "CalendarIcon", Icon: CalendarIcon },
  { name: "ArrowRightIcon", Icon: ArrowRightIcon },
  { name: "ChevronRightIcon", Icon: ChevronRightIcon },
  { name: "ChevronLeftIcon", Icon: ChevronLeftIcon },
  { name: "ChevronUpIcon", Icon: ChevronUpIcon },
  { name: "ChevronDownIcon", Icon: ChevronDownIcon },
  { name: "AlertIcon", Icon: AlertIcon },
  { name: "CheckIcon", Icon: CheckIcon },
  { name: "GripIcon", Icon: GripIcon },
  { name: "MoreIcon", Icon: MoreIcon },
  { name: "EyeIcon", Icon: EyeIcon },
  { name: "XIcon", Icon: XIcon },
  { name: "PrinterIcon", Icon: PrinterIcon },
  { name: "RefundIcon", Icon: RefundIcon },
  { name: "RefreshIcon", Icon: RefreshIcon },
  { name: "PauseIcon", Icon: PauseIcon },
  { name: "PlayIcon", Icon: PlayIcon },
  { name: "ChartPieIcon", Icon: ChartPieIcon },
  { name: "TrashIcon", Icon: TrashIcon },
  { name: "UploadIcon", Icon: UploadIcon },
  { name: "DownloadIcon", Icon: DownloadIcon },
  { name: "HistoryIcon", Icon: HistoryIcon },
  { name: "ReservationIcon", Icon: ReservationIcon },
  { name: "VoucherIcon", Icon: VoucherIcon },
];

export default function IconsPage() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ICONS;
    return ICONS.filter((i) => i.name.toLowerCase().includes(q));
  }, [query]);

  async function copyName(name: string) {
    try {
      await navigator.clipboard.writeText(name);
      toast(ICONS_PAGE.copied, "success");
    } catch {
      toast(ICONS_PAGE.copy, "error");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-ink-900">{ICONS_PAGE.title}</h1>
          <p className="text-sm text-ink-500">
            {ICONS.length} {ICONS_PAGE.total} — {ICONS_PAGE.subtitle}
          </p>
        </div>
        <div className="w-64">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={ICONS_PAGE.searchPlaceholder}
            variant="white"
            className="bg-ink-100"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-none rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="sticky top-0 bg-white text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
              <th className="w-12 px-4 py-3">#</th>
              <th className="w-20 px-4 py-3">{ICONS_PAGE.icon}</th>
              <th className="px-4 py-3">{ICONS_PAGE.name}</th>
              <th className="w-24 px-4 py-3 text-right">{ICONS_PAGE.copy}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, i) => (
              <tr key={item.name} className="border-t border-ink-100 hover:bg-ink-50">
                <td className="px-4 py-2.5 text-ink-400">{i + 1}</td>
                <td className="px-4 py-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-50 text-ink-900">
                    <item.Icon className="h-5 w-5" />
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs font-semibold text-ink-900">{item.name}</td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => copyName(item.name)}
                    className="rounded-lg bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-900 transition hover:bg-brand-100 hover:text-brand-700"
                  >
                    {ICONS_PAGE.copy}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-400">
                  {ICONS_PAGE.noResults}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
