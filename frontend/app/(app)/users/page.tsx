"use client";

import { UsersManager } from "@/components/users/users-manager";
import { PageHeader } from "@/components/ui/page-header";
import { USER_TEXT } from "@/lib/constants/users";

export default function UsersPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title={USER_TEXT.title} subtitle={USER_TEXT.subtitle} />
      <div className="min-h-0 flex-1">
        <UsersManager />
      </div>
    </div>
  );
}
