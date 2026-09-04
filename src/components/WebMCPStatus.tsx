"use client";

import type { WebMCPContextType } from "@/types";
import {
  getWebMCPStatusText,
  getWebMCPStatusColor,
  getWebMCPStatusDescription,
  getWebMCPStatusDotClass,
} from "@/lib/webmcpStatus";

interface WebMCPStatusProps {
  contextType: WebMCPContextType;
}

export default function WebMCPStatus({ contextType }: WebMCPStatusProps) {
  const statusText = getWebMCPStatusText(contextType);
  const statusColor = getWebMCPStatusColor(contextType);
  const statusDescription = getWebMCPStatusDescription(contextType);
  const dotClass = getWebMCPStatusDotClass(contextType);

  return (
    <div className={`flex max-w-[240px] items-center gap-2.5 rounded-xl border border-night-600 px-3 py-2 ${statusColor}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
      <div>
        <p className="text-xs font-semibold text-frost">{statusText}</p>
        <p className="text-xs text-fog">{statusDescription}</p>
      </div>
    </div>
  );
}
