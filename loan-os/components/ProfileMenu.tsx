"use client";

import Link from "next/link";
import Image from "next/image";
import { User, Home, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { handleSignOut } from "@/app/actions/auth";

interface User {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
  profilePictureUrl?: string | null;
}

interface ProfileMenuProps {
  user: User;
}

export default function ProfileMenu({ user }: ProfileMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2">
          <Image
            className="rounded-full"
            src={user?.profilePictureUrl || "/default-avatar.png"}
            alt="Profile"
            width={32}
            height={32}
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium text-gray-900">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>

        <DropdownMenuSeparator />

        <Link href="/profile" className="flex items-center w-full">
          <DropdownMenuItem className="w-full cursor-pointer">
            <div className="flex gap-2 items-center">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </div>
          </DropdownMenuItem>
        </Link>

        <Link href="/dashboard" className="flex items-center w-full">
          <DropdownMenuItem className="w-full cursor-pointer">
            <div className="flex gap-2 items-center">
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </div>
          </DropdownMenuItem>
        </Link>

        <DropdownMenuSeparator />

        <form action={handleSignOut}>
          <DropdownMenuItem asChild className="w-full cursor-pointer">
            <button type="submit" className="flex gap-2 items-center w-full">
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
