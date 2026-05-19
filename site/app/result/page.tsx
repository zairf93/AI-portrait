"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

type JobStatus = "pending" | "processing" | "completed" | "failed";

type JobResponse = {
  job_id: string;
  status: JobStatus;
  style: string;
  image_url?: string;
  error?: string;
};

export default function ResultPage() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("job");
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [style, setStyle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  const imageUrl = jobId ? `${BACKEND_URL}/jobs/${jobId}/image` : null;

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      setError("Missing job ID in URL.");
      return;
    }

    let interval: number;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/jobs/${jobId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch job status: ${response.status}`);
        }

        const data = (await response.json()) as JobResponse;
        setStatus(data.status);
        setStyle(data.style);

        if (data.status === "completed") {
          setCompleted(true);
          setLoading(false);
          clearInterval(interval);
        } else if (data.status === "failed") {
          setError(data.error || "Generation failed.");
          setLoading(false);
          clearInterval(interval);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setError("Unable to load job status.");
        setLoading(false);
        clearInterval(interval);
      }
    };

    fetchStatus();
    interval = window.setInterval(fetchStatus, 2500);

    return () => window.clearInterval(interval);
  }, [jobId]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-3xl rounded-3xl border border-neutral-800 bg-[#111111]/90 p-8 shadow-2xl">
        <div className="flex flex-col gap-3 mb-6">
          <h1 className="text-4xl font-bold">AI Portrait Result</h1>
          <p className="text-sm text-neutral-400">
            This page shows the generated portrait and download button once the job completes.
          </p>
        </div>

        {!jobId ? (
          <div className="rounded-3xl border border-red-500 bg-red-500/10 p-6 text-red-200">
            Missing job ID. Please return to the upload page and try again.
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-500 bg-red-500/10 p-6 text-red-200">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        ) : loading ? (
          <div className="rounded-3xl border border-neutral-700 bg-neutral-900 p-6 text-neutral-300">
            <p className="font-semibold">Checking job status...</p>
            <p className="mt-2">Job ID: {jobId}</p>
          </div>
        ) : completed ? (
          <div className="space-y-6">
            <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
              <p className="text-sm text-neutral-500 uppercase tracking-wide">Status</p>
              <p className="mt-2 text-xl font-semibold text-green-300">Completed</p>
              <p className="mt-3 text-neutral-400">Style: {style ?? "Unknown"}</p>
            </div>

            <div className="relative w-full aspect-square overflow-hidden rounded-3xl border border-white/10 bg-neutral-900">
              <img src={imageUrl ?? ""} alt="Generated AI Portrait" className="w-full h-full object-cover" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <a
                href={imageUrl ?? "#"}
                download={`ai-photo-${style ?? "portrait"}.png`}
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-black font-semibold hover:bg-neutral-200 transition"
              >
                Download Photo
              </a>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-neutral-700 px-5 py-3 text-neutral-200 hover:border-neutral-500 transition"
              >
                Back to Upload
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-neutral-700 bg-neutral-900 p-6 text-neutral-300">
            <p className="font-semibold">Job is still processing.</p>
            <p className="mt-2">Job ID: {jobId}</p>
            <p className="mt-2">Current status: {status}</p>
          </div>
        )}
      </div>
    </div>
  );
}
