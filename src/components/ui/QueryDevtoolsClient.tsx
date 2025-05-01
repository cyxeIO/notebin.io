"use client";

import dynamic from "next/dynamic";

// Dynamically import the React Query Devtools — client only
const Devtools = dynamic(
  () =>
    import("@tanstack/react-query-devtools").then(
      (mod) => mod.ReactQueryDevtools
    ),
  { ssr: false }
);

export default function QueryDevtoolsClient() {
  return <Devtools initialIsOpen={false} />;
}