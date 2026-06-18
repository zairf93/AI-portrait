"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/client";
import { ServerStatusBadge } from "@/components/ServerStatusBadge";

const DownloadIcon = () => (
  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
);
const BackIcon = () => (
  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
);
const LogoIcon = () => (
  <svg className="w-10 h-10" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{ stopColor: 'white', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: 'white', stopOpacity: 0.6 }} />
      </linearGradient>
    </defs>
    {/* Camera body */}
    <rect x="6" y="14" width="36" height="24" rx="3" stroke="url(#logoGradient)" strokeWidth="2.5" fill="none" />
    {/* Lens */}
    <circle cx="24" cy="26" r="7" stroke="url(#logoGradient)" strokeWidth="2.5" fill="none" />
    <circle cx="24" cy="26" r="3.5" fill="url(#logoGradient)" />
    {/* Flash/viewfinder */}
    <rect x="18" y="8" width="12" height="6" rx="1.5" fill="url(#logoGradient)" />
    {/* Sparkle accent */}
    <path d="M38 18 L39.5 20 L38 22 L36.5 20 Z" fill="url(#logoGradient)" />
  </svg>
);

function ResultContent() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("job");

  const [status, setStatus] = useState<string>("pending");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setError("No job ID provided");
      return;
    }

    const pollForResult = async () => {
      try {
        const result = await api.pollJobCompletion(jobId, {
          maxWaitMs: 30000, // 30 second timeout
          intervalMs: 2000,
          onStatusChange: (newStatus : string) => {
            setStatus(newStatus);
            console.log("Job status:", newStatus);
          },
        });

        if (result.status === "completed") {
          setImageUrl(api.getJobImageUrl(jobId));
          setStatus("completed");
        }
      } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : "Something went wrong!";

        if (errorMessage.includes("timed out")) {
          setTimedOut(true);
          setError("Generation is taking longer than expected. The image may still be processing.");
        } else {
          setError(errorMessage);
        }
      }
    };

    pollForResult();
  }, [jobId]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-indigo-500/30 flex flex-col font-sans overflow-hidden relative">
      {/* Background Ambience - Centered Glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-indigo-600/30 rounded-full blur-[120px] animate-float mix-blend-screen" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px] animate-float-reverse mix-blend-screen" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute top-1/4 right-1/4 w-[450px] h-[450px] bg-teal-500/25 rounded-full blur-[110px] animate-float" />
      </div>

      <div className="relative z-10 flex-grow flex flex-col items-center justify-center p-6 w-full max-w-2xl mx-auto">
        <div className="text-center space-y-3 mb-8">
          <div className="flex items-center justify-center gap-3">
            <LogoIcon />
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
              AI Photo Booth
            </h1>
          </div>
          <p className="text-sm uppercase tracking-widest text-white/60 font-light">
            Generate Professional AI Portraits
          </p>
        </div>

        {/* Loading State */}
        {!imageUrl && !error && (
          <div className="w-full flex flex-col items-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="relative w-full max-w-md aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-neutral-900/50 flex items-center justify-center">
              <div className="flex flex-col items-center space-y-4">
                <svg className="animate-spin h-16 w-16 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <div className="text-center">
                  <div className="text-sm font-medium text-neutral-300">
                    {status === "pending" && "Queued..."}
                    {status === "processing" && "Generating your photo..."}
                  </div>
                  <div className="text-sm text-neutral-400 mt-1">
                    This may take up to 30 seconds
                  </div>
                </div>
              </div>
            </div>

            <a
              href="/"
              className="px-6 py-3 rounded-xl border border-neutral-800 bg-black/50 hover:bg-neutral-900 text-white text-sm font-medium transition-colors flex items-center justify-center"
            >
              <BackIcon />
              Cancel
            </a>
          </div>
        )}

        {/* Success State */}
        {imageUrl && (
          <div className="w-full flex flex-col items-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="relative w-full max-w-md aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-neutral-900">
              <img
                src={imageUrl}
                alt="Generated AI Portrait"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex gap-4 w-full max-w-md">
              <a
                href="/"
                className="flex-1 py-3 rounded-xl border border-neutral-800 bg-black/50 hover:bg-neutral-900 text-white text-sm font-medium transition-colors flex items-center justify-center"
              >
                <BackIcon />
                New Photo
              </a>
              <a
                href={imageUrl}
                download={`ai-photo-${jobId}.png`}
                className="flex-1 py-3 rounded-xl bg-white text-black hover:bg-neutral-200 text-sm font-bold transition-colors flex items-center justify-center shadow-lg"
              >
                <DownloadIcon />
                Download
              </a>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="w-full flex flex-col items-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="relative w-full max-w-md rounded-2xl overflow-hidden border border-red-500/20 shadow-2xl bg-neutral-900/50 p-8">
              <div className="flex flex-col items-center space-y-4 text-center">
                <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="text-lg font-semibold text-white mb-2">
                    {timedOut ? "Taking Longer Than Expected" : "Generation Failed"}
                  </div>
                  <div className="text-sm text-neutral-400">
                    {error}
                  </div>
                  {timedOut && jobId && (
                    <div className="text-xs text-neutral-500 mt-3">
                      Job ID: {jobId}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4 w-full max-w-md">
              <a
                href="/"
                className="flex-1 py-3 rounded-xl border border-neutral-800 bg-black/50 hover:bg-neutral-900 text-white text-sm font-medium transition-colors flex items-center justify-center"
              >
                <BackIcon />
                Try Again
              </a>
              {timedOut && jobId && (
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 py-3 rounded-xl bg-white text-black hover:bg-neutral-200 text-sm font-bold transition-colors flex items-center justify-center shadow-lg"
                >
                  Refresh
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-3 pb-4">
        <ServerStatusBadge />
        <footer className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/60 font-semibold">
          <span>AI Photo Booth</span>
          <img src="/pixegami-logo.svg" alt="" className="w-4 h-4" />
          <span>App by Pixegami</span>
        </footer>
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-16 w-16 text-indigo-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-neutral-400">Loading...</p>
        </div>
      </div>
    }>
      <ResultContent />
    </Suspense>
  );
}