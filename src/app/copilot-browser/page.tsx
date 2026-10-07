"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { CopilotBrowser } from "@/components/copilot/browser/copilot-browser";

/**
 * /copilot-browser — the Co-Pilot Browser as a FULL-VIEWPORT page.
 *
 * It is opened in a real new browser tab (window.open from launch buttons),
 * so it always takes the default desktop or mobile window size of the device —
 * never a squeezed dialog box.
 *
 * Params: ?u=<initial url>&name=<app name>&app=<app slug>
 */

function Launching() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-background text-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <p className="text-xs font-semibold text-muted-foreground">Launching Co-Pilot Browser…</p>
    </div>
  );
}

function BrowserFromParams() {
  const sp = useSearchParams();
  return (
    <CopilotBrowser
      initialUrl={sp.get("u") || undefined}
      appName={sp.get("name") || undefined}
      appSlug={sp.get("app") || undefined}
    />
  );
}

export default function CopilotBrowserPage() {
  return (
    <Suspense fallback={<Launching />}>
      <BrowserFromParams />
    </Suspense>
  );
}
