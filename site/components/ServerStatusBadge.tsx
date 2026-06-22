"use client";

import { useEffect, useState } from "react";

type Status = "loading" | "connected" | "error";

export function ServerStatusBadge() {
  const [status, setStatus] = useState<Status>("loading");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(apiUrl, {
          method: "GET",
          signal: AbortSignal.timeout(3000), // 3 second timeout
        });

        if (response.ok) {
          const data = await response.json();
          // Verify the response has the expected structure
          if (data.status === "online") {
            setStatus("connected");
          } else {
            setStatus("error");
          }
        } else {
          setStatus("error");
        }
      } catch (error) {
        console.error("Server status check failed:", error);
        setStatus("error");
      }
    };

    checkStatus();

    // Re-check every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  const statusConfig = {
    loading: {
      color: "bg-yellow-500",
      text: "Connecting...",
    },
    connected: {
      color: "bg-green-500",
      text: "Server Online",
    },
    error: {
      color: "bg-red-500",
      text: "Server Offline",
    },
  };

  const config = statusConfig[status];

  return (
    <div className="inline-flex items-center px-3 py-1 rounded-full border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm text-xs font-medium text-neutral-300">
      <span className={`w-2 h-2 rounded-full ${config.color} mr-2 ${status === "loading" ? "animate-pulse" : ""}`}></span>
      {config.text}
    </div>
  );
}
