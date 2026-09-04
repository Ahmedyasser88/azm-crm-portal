"use client";

import { Menu, PanelRightClose, ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { CurrentUser } from "@/lib/types/identity";
import { logout } from "@/app/login/actions";

export default function Header({
  onToggle,
  user,
}: {
  onToggle: () => void;
  user: CurrentUser | null;
}) {
  const userDisplayName = user?.fullName || user?.username || "مستخدم واصل";

  return (
    <header className="bg-white h-16 flex items-center justify-between px-4 lg:px-16 sticky top-0 z-30 shadow-sm">
      <Button variant="ghost" size="icon" onClick={onToggle} aria-label="تبديل القائمة الجانبية">
        <span className="block md:hidden">
          <Menu size={24} />
        </span>
        <span className="hidden md:block">
          <PanelRightClose size={24} />
        </span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center py-1.5 gap-2 h-auto">
            <Avatar>
              <AvatarFallback>
                <UserIcon size={18} />
              </AvatarFallback>
            </Avatar>
            <p className="hidden md:block font-medium text-xs text-text-default">
              {userDisplayName}
            </p>
            <div className="hidden md:flex items-center justify-center bg-surface size-8 rounded-full">
              <ChevronDown className="size-5 text-text-default" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <UserIcon />
            الملف الشخصي
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => logout()}>
            <LogOut />
            تسجيل الخروج
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
