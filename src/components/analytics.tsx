"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export default function Analytics() {
  useEffect(() => {
    // Initialize PostHog (replace 'your-key' with your actual PostHog key)
    posthog.init("your-key", {
      api_host: "https://app.posthog.com",
      capture_pageview: true, // Automatically capture page views
    });

    // Cleanup on unmount
    return () => {
      posthog.opt_out_capturing(); // Optional: Stop tracking on unmount
    };
  }, []);

  return null;
}