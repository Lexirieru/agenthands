'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle, Camera, X, Loader2 } from 'lucide-react';

interface ProofUploadProps {
  onCIDReady: (cid: string) => void;
  taskId?: string | number | bigint;
}

const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

function draftKey(taskId: ProofUploadProps['taskId']) {
  if (taskId === undefined || taskId === null) return null;
  return `agenthands-proof-draft-${String(taskId)}`;
}

export default function ProofUpload({ onCIDReady, taskId }: ProofUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [cid, setCid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Stop the browser from navigating to a dropped file when the user misses
  // the dropzone — Chrome/Brave's default is to open the file URL, which
  // looks like a broken upload to the user.
  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  // Re-hydrate the upload across page refreshes. The CID is the stable
  // pointer; the preview can be re-fetched from the IPFS gateway.
  useEffect(() => {
    const key = draftKey(taskId);
    if (!key) return;
    const saved = window.localStorage.getItem(key);
    if (!saved) return;
    setCid(saved);
    setPreview(`${PINATA_GATEWAY}/${saved}`);
    onCIDReady(saved);
  }, [taskId, onCIDReady]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Uploads go through the backend — the Pinata JWT stays server-side.
      // If this call fails, surface the error; do NOT fall back to a
      // client-side Pinata call that would leak the JWT via the bundle.
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || 'https://agenthands-production.up.railway.app') + '/api/ipfs/upload',
        { method: 'POST', body: formData }
      );

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Upload failed (${res.status}) ${detail.slice(0, 120)}`);
      }

      const data = (await res.json()) as { cid?: string };
      if (!data.cid) throw new Error('Upload response missing cid');
      setCid(data.cid);
      onCIDReady(data.cid);
      const key = draftKey(taskId);
      if (key) window.localStorage.setItem(key, data.cid);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload. Please try again.');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setPreview(null);
    setCid(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
    const key = draftKey(taskId);
    if (key) window.localStorage.removeItem(key);
    onCIDReady('');
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-[#5C2D0A] mb-2 font-label">
        <Camera size={14} className="inline mr-1" /> Upload Proof Photo
      </label>

      {!preview ? (
        <div
          onClick={() => fileRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!dragActive) setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
            const file = e.dataTransfer.files?.[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) {
              setError('Only image files are accepted (JPG, PNG, WEBP).');
              return;
            }
            handleUpload(file);
          }}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
            dragActive
              ? 'border-[#D4700A] bg-[#D4700A]/10'
              : 'border-[var(--border)] hover:border-[#D4700A] bg-[var(--card)]'
          }`}
        >
          <Upload size={32} className="mx-auto mb-2 text-[#8B4513]" />
          <p className="text-[#5C2D0A] text-sm">
            {dragActive ? 'Drop to upload' : 'Click or drag photo here'}
          </p>
          <p className="text-[#8B4513] text-xs mt-1">JPG, PNG, WEBP up to 10MB</p>
        </div>
      ) : (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Proof preview"
            className="w-full rounded-xl border border-[var(--border)] max-h-64 object-cover"
          />
          {!uploading && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Remove uploaded photo"
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition"
            >
              <X size={16} />
            </button>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-[var(--card-solid)]/70 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-2">
              <Loader2 size={28} className="animate-spin text-[#D4700A]" />
              <p className="text-sm font-medium text-[#5C2D0A]">Uploading to IPFS…</p>
              <p className="text-xs text-[#8B4513]">Pinning your photo on Pinata</p>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />

      {cid && !uploading && (
        <div className="p-3 bg-green-900/10 rounded-lg border border-green-400/30">
          <div className="text-xs text-green-700 mb-1 flex items-center gap-1">
            <CheckCircle size={12} /> Uploaded to IPFS
          </div>
          <a
            href={`${PINATA_GATEWAY}/${cid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#5C2D0A] font-mono break-all hover:text-[#D4700A]"
          >
            {cid}
          </a>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-900/10 rounded-lg border border-red-400/30">
          <div className="text-xs text-red-600">{error}</div>
        </div>
      )}
    </div>
  );
}
