// src/components/ui/rightsidebar.tsx
"use client";

import React from "react";
import Link from "next/link";

export default function RightSidebar() {
  return (
    <aside className="flex flex-col h-full w-64 bg-gray-900 text-white p-6 space-y-8">
      {/* Section Header */}
      <h2 className="text-xl font-semibold">Explore</h2>

      {/* Widget: Trending */}
      <div className="p-4 rounded-lg bg-gray-800 space-y-2">
        <p className="text-sm uppercase text-gray-400">Trending</p>
        <Link
          href="/trending"
          className="text-lg font-bold hover:underline"
        >
          View Trending Snippets
        </Link>
      </div>

      {/* Widget: Today’s Snippets */}
      <div className="p-4 rounded-lg bg-gray-800 space-y-2">
        <p className="text-sm uppercase text-gray-400">Snippets Today</p>
        <p className="text-2xl font-bold">56</p>
      </div>

      {/* …you can drop more widgets here */}

      {/* Call-to-Action at bottom */}
      <div className="mt-auto">
        <button className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition">
          New Snippet
        </button>
      </div>
    </aside>
  );
}