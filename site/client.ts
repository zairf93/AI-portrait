export {}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
type JobStatus = "pending" | "processing" | "completed" | "failed";

type JobResponse = {
  job_id: string;
  status: JobStatus;
  style: string;
  image_url?: string;
  error?: string;
};

export const api = {
  createModel: async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const response = await fetch(`${BACKEND_URL}/create_model`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload images.");
    }

    return response.json() as Promise<{ model_id: string }>;
  },

  generatePhoto: async (modelId: string, style: string) => {
    const response = await fetch(`${BACKEND_URL}/generate_photo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ model_id: modelId, style }),
    });

    if (!response.ok) {
      throw new Error("Failed to start generation.");
    }

    return response.json() as Promise<{ job_id: string }>;
  },

  async pollJobCompletion(jobId : string, { maxWaitMs = 30000, intervalMs = 2000, onStatusChange } :  {maxWaitMs?: number, intervalMs?: number, onStatusChange?: (newStatus : string) => void} = {}) {
    const startTime = Date.now();
    let currentStatus = null;

    // Helper helper function to pause execution
    const delay = (ms : number) => new Promise((resolve) => setTimeout(resolve, ms));

    while (Date.now() - startTime < maxWaitMs) {
      // 1. Fetch the current status from your backend API
      const response = await fetch(`${BACKEND_URL}/jobs/${jobId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch job status: ${response.statusText}`);
      }

      const job = (await response.json()) as JobResponse;

      // 2. Trigger the callback if the status has changed
      if (job.status !== currentStatus) {
        currentStatus = job.status;
        if (typeof onStatusChange === "function") {
          onStatusChange(currentStatus);
        }
      }

      // 3. Return the result if the job is done
      if (currentStatus === "completed") {
        return job;
      }

      // 4. Throw an error if the backend job failed internally
      if (currentStatus === "failed") {
        throw new Error(job.error || "Job execution failed on the server.");
      }

      // 5. Wait for the specified interval before checking again
      await delay(intervalMs);
    }

    // 6. Throw an error if the loop exits due to the time limit
    throw new Error(`Job polling timed out after ${maxWaitMs / 1000} seconds.`);
  },
  getJobImageUrl: (jobId: string): string => `${BACKEND_URL}/jobs/${jobId}/image`
};
