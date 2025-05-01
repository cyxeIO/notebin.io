// src/app/layout.tsx
import React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "~/styles/globals.css";
import { ThemeProvider } from "~/providers/theme-provider";
import AuthProvider from "~/providers/auth-provider";
import QueryClientProviderWrapper from "~/providers/query-client-provider";
import { Toaster } from "sonner";
import { AlephiumWalletProvider } from "@alephium/web3-react";
import RightSidebar from "~/components/ui/rightsidebar";
import Analytics from "~/components/analytics";
import QueryDevtoolsClient from "~/components/ui/QueryDevtoolsClient";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "notebin.io",
  description: "A minimal snippet sharing app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head />
      <body className="min-h-screen bg-gray-900 font-sans antialiased text-white">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryClientProviderWrapper>
            <AuthProvider>
              <AlephiumWalletProvider network="testnet">
                <div className="flex h-screen">
                  {/* ─── Main Snippet Area ─── */}
                  <main className="flex-1 bg-gray-800 p-6 overflow-auto">
                    {children}
                  </main>

                  {/* ─── Right “Explore” Sidebar ─── */}
                  <RightSidebar />
                </div>

                {/* global toasts & devtools */}
                <Toaster />
                <QueryDevtoolsClient />
              </AlephiumWalletProvider>
            </AuthProvider>
          </QueryClientProviderWrapper>
        </ThemeProvider>

        {/* analytics snippet */}
        <Analytics />
      </body>
    </html>
  );
}