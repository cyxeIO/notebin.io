// src/components/ui/LeftSidebar.tsx
"use client";

import React from "react";
import Link from "next/link";
import { Home, Archive as ArchiveIcon, Users as UsersIcon } from "lucide-react";
import ProfileMenu from "./profilemenu";

export default function LeftSidebar() {
  const links = [
    { href: "/", label: "Home", Icon: Home },
    { href: "/archive", label: "Archive", Icon: ArchiveIcon },
    { href: "/communities", label: "Communities", Icon: UsersIcon }, // Added Communities link
  ];

  return (
    <nav className="flex flex-col h-full w-64 bg-gray-900 text-white p-6 space-y-8">
      {/* Branding */}
      <Link href="/" className="text-2xl font-bold hover:text-gray-300">
        blocknostr
      </Link>

      {/* Navigation Links */}
      <ul className="space-y-4">
        {links.map(({ href, label, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center px-3 py-2 rounded hover:bg-gray-800 transition"
            >
              <Icon className="w-5 h-5 mr-3" />
              <span className="font-medium">{label}</span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Profile Menu at bottom */}
      <div className="mt-auto">
        <ProfileMenu />
      </div>
    </nav>
  );
}