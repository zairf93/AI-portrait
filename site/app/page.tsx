"use client";

import { useState } from "react";
import { ServerStatusBadge } from "@/components/ServerStatusBadge";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const api = {
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
};

// Icons
const UploadIcon = () => (
  <svg className="w-6 h-6 text-neutral-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
);
const SparklesIcon = () => (
  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
);
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

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [style, setStyle] = useState("corporate");
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [modelId, setModelId] = useState<string | null>(null);

  // Initial bulk upload or replacing everything if empty
  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (loading) return; // Disable while processing
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).slice(0, 3);

      // Cleanup old
      previews.forEach(url => URL.revokeObjectURL(url));

      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setFiles(newFiles);
      setPreviews(newPreviews);
    }
  };

  // Add a single file to the existing list
  const handleAddFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (loading) return; // Disable while processing
    if (e.target.files && e.target.files[0]) {
      if (files.length >= 3) return;

      const file = e.target.files[0];
      const preview = URL.createObjectURL(file);

      setFiles([...files, file]);
      setPreviews([...previews, preview]);
    }
  };

  const handleRemoveFile = (index: number) => {
    if (loading) return; // Disable while processing
    const newFiles = [...files];
    const newPreviews = [...previews];

    // Revoke the URL being removed
    URL.revokeObjectURL(newPreviews[index]);

    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);

    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  const handleGenerate = async () => {
    if (files.length === 0) return alert("Please upload at least one image.");

    setLoading(true);
    setStatus("Uploading images...");

    try {
      // Step 1: Create model (upload images)
      let currentModelId = modelId;
      if (!currentModelId) {
        const model = await api.createModel(files);
        currentModelId = model.model_id;
        setModelId(currentModelId);
        console.log("Model created:", currentModelId);
      }

      // Step 2: Start generation
      setStatus("Starting generation...");
      const job = await api.generatePhoto(currentModelId, style);
      console.log("Job started:", job.job_id);

      // Step 3: Redirect to result page
      window.location.href = `/result?job=${job.job_id}`;
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Something went wrong!";
      alert(errorMessage);
      setStatus("");
      setLoading(false);
    }
  };

  const handleReset = () => {
    setGeneratedImage(null);
    setStatus("");
    // Keep files and model for regeneration with different styles
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-indigo-500/30 flex flex-col font-sans overflow-hidden relative">
      {/* Background Ambience - Centered Glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-indigo-600/30 rounded-full blur-[120px] animate-float mix-blend-screen" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px] animate-float-reverse mix-blend-screen" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute top-1/4 right-1/4 w-[450px] h-[450px] bg-teal-500/25 rounded-full blur-[110px] animate-float" />
      </div>

      <div className="relative z-10 grow flex flex-col items-center justify-center p-6 w-full max-w-2xl mx-auto">
        
        {/* VIEW 1: INPUT FORM */}
        {!generatedImage && (
            <div className="w-full space-y-8 animate-in fade-in zoom-in duration-300">
                <div className="text-center space-y-3">
                    <div className="flex items-center justify-center gap-3">
                        <LogoIcon />
                        <h1 className="text-4xl font-bold tracking-tight bg-linear-to-b from-white to-white/60 bg-clip-text text-transparent">
                            AI Photo Booth
                        </h1>
                    </div>
                    <p className="text-sm uppercase tracking-widest text-white/60 font-light">
                        Generate Professional AI Portraits
                    </p>
                </div>

                <div className="bg-[#0f0f0f] border border-neutral-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                    {/* Step 1 */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-baseline">
                             <label className="text-sm font-semibold uppercase tracking-wider text-neutral-400">1. Upload Reference</label>
                             <span className="text-xs text-neutral-500">Max 3 photos</span>
                        </div>
                        <div className="group relative min-h-28">
                            
                            <div className={`
                                w-full h-full border border-dashed rounded-xl transition-all duration-300 overflow-hidden relative
                                ${files.length > 0
                                ? 'border-neutral-700 bg-neutral-900/50 p-3'
                                : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 hover:bg-neutral-800 flex items-center justify-center min-h-[140px]'}
                                ${loading ? 'opacity-50 pointer-events-none' : ''}
                            `}>
                                {files.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-3 h-28">
                                        {previews.map((src, i) => (
                                            <div key={i} className="relative w-full h-full rounded-lg overflow-hidden border border-neutral-700 group/img">
                                                <img src={src} className="w-full h-full object-cover" alt="preview" />
                                                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors" />
                                                <button 
                                                    onClick={() => handleRemoveFile(i)}
                                                    className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/img:opacity-100 transition-all backdrop-blur-sm"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                        
                                        {/* Add Button Slots */}
                                        {files.length < 3 && (
                                             <div className="relative w-full h-full rounded-lg border border-neutral-800 bg-neutral-900/40 flex items-center justify-center hover:bg-neutral-800 hover:border-neutral-700 transition-all cursor-pointer group/add">
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    onChange={handleAddFile} 
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <div className="flex flex-col items-center">
                                                    <span className="text-neutral-500 group-hover/add:text-neutral-300 text-3xl font-light transition-colors">+</span>
                                                </div>
                                             </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <input 
                                            type="file" 
                                            multiple 
                                            accept="image/*" 
                                            onChange={handleBulkUpload} 
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                        />
                                        <div className="flex flex-col items-center py-4">
                                            <div className="text-neutral-500 mb-2 scale-125"><UploadIcon /></div>
                                            <p className="text-sm font-medium text-neutral-400 group-hover:text-neutral-300 transition-colors">Drop photos here</p>
                                            <p className="text-xs text-neutral-500 mt-1">PNG, JPG, JPEG up to 10MB</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className={`space-y-3 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                        <label className="text-sm font-semibold uppercase tracking-wider text-neutral-400">2. Select Style</label>
                        <div className="grid grid-cols-3 gap-3">
                        {[
                            { id: "corporate", label: "Corporate", desc: "Studio" },
                            { id: "bw_headshot", label: "B&W", desc: "Artistic" },
                            { id: "casual", label: "Casual", desc: "Outdoor" },
                        ].map((s) => (
                            <button
                            key={s.id}
                            onClick={() => setStyle(s.id)}
                            className={`
                                relative p-3 rounded-xl text-left border transition-all duration-200
                                ${style === s.id 
                                ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/20" 
                                : "border-neutral-800 bg-neutral-900/50 hover:border-neutral-700"}
                            `}
                            >
                            <div className={`font-semibold text-sm ${style === s.id ? 'text-white' : 'text-neutral-300'}`}>
                                {s.label}
                            </div>
                            <div className={`text-xs mt-0.5 ${style === s.id ? 'text-indigo-300' : 'text-neutral-400'}`}>
                                {s.desc}
                            </div>
                            </button>
                        ))}
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={loading || files.length === 0}
                        className={`
                        w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center transition-all duration-300
                        ${loading || files.length === 0
                            ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                            : 'bg-white text-black hover:bg-neutral-200 hover:scale-[1.01] shadow-[0_0_20px_rgba(255,255,255,0.1)]'}
                        `}
                    >
                        {loading ? (
                          <div className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-neutral-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {status || "Processing..."}
                          </div>
                        ) : (
                        <><SparklesIcon /> Generate Photo</>
                        )}
                    </button>
                </div>
            </div>
        )}

        {/* VIEW 2: RESULT */}
        {generatedImage && (
            <div className="w-full flex flex-col items-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="relative w-full max-w-md aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-neutral-900">
                     <img 
                        src={generatedImage} 
                        alt="Generated AI Portrait" 
                        className="w-full h-full object-cover"
                    />
                </div>
                
                <div className="flex gap-4 w-full max-w-md">
                    <button 
                        onClick={handleReset}
                        className="flex-1 py-3 rounded-xl border border-neutral-800 bg-black/50 hover:bg-neutral-900 text-white text-sm font-medium transition-colors flex items-center justify-center"
                    >
                        <BackIcon />
                        New Photo
                    </button>
                    <a 
                        href={generatedImage} 
                        download={`ai-photo-${style}.png`}
                        className="flex-1 py-3 rounded-xl bg-white text-black hover:bg-neutral-200 text-sm font-bold transition-colors flex items-center justify-center shadow-lg"
                    >
                        <DownloadIcon />
                        Download
                    </a>
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
