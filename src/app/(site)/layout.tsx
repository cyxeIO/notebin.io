// src/app/layout.tsx
import React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "~/styles/globals.css";
import { ThemeProvider } from "~/providers/theme-provider";
import AuthProvider from "~/providers/auth-provider";
import QueryClientProviderWrapper from "~/providers/query-client-provider";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import LayoutShell from "~/components/ui/LayoutShell";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BlockNostr | Code Sharing",
  description: "A modern, fast, and secure platform for developers to share code snippets.",
  viewport: { width: "device-width", initialScale: 1, maximumScale: 1 },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`flex flex-col min-h-screen bg-background text-foreground ${geistSans.variable} ${geistMono.variable}`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <QueryClientProviderWrapper>
            <AuthProvider>
              <header className="h-0" />
              <LayoutShell>{children}</LayoutShell>
              <Toaster />
            </AuthProvider>
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}