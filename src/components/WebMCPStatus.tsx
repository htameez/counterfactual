"use client";

import type { WebMCPContextType } from "@/types";
import {
  getWebMCPStatusText,
  getWebMCPStatusColor,
  getWebMCPStatusDescription,
} from "@/lib/webmcpStatus";
import { Zap } from "lucide-react";

interface WebMCPStatusProps {
  contextType: WebMCPContextType;
}

export default function WebMCPStatus({ contextType }: WebMCPStatusProps) {
  const statusText = getWebMCPStatusText(contextType);
  const statusColor = getWebMCPStatusColor(contextType);
  const statusDescription = getWebMCPStatusDescription(contextType);

  return (
    <div className="flex items-center gap-2 rounded-lg bg-neutral-100 px-4 py-2">
      <Zap className="h-4 w-4 text-indigo-600" />
      <div>
        <p className={`text-xs font-semibold ${statusColor.split(" ")[0]}`}>
          {statusText}
        </p>
        <p className="text-xs text-neutral-600">{statusDescription}</p>
      </div>
    </div>
  );
}
