'use client';

import { useState, useRef } from 'react';
import { Upload, CheckCircle } from 'lucide-react';

interface ProofUploadProps {
  onCIDReady: (cid: string) => void;
}

export default function ProofUpload({ onCIDReady }: ProofUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [cid, setCid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') + '/api/ipfs/upload',
        { method: 'POST', body: formData }
      );

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      setCid(data.cid);
      onCIDReady(data.cid);
    } catch {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('pinataMetadata', JSON.stringify({ name: `proof-${Date.now()}` }));

        const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
        const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
          method: 'POST',
          headers: { Authorization: `Bearer ${jwt}` },
          body: formData,
        });

        if (!res.ok) throw new Error('Pinata upload failed');

        const data = await res.json();
        setCid(data.IpfsHash);
        onCIDReady(data.IpfsHash);
      } catch {
        setError('Failed to upload. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-[#1A0F08] mb-2 font-label">
        📸 Upload Proof Photo
      </label>

      {!preview ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-[#F5DEC8] rounded-xl p-8 text-center cursor-pointer hover:border-[#FF8C42] transition bg-[#FFFAF5]"
        >
          <Upload size={32} className="mx-auto mb-2 text-[#A07858]" />
          <p className="text-[#6B5040] text-sm">Click to upload photo proof</p>
          <p className="text-[#A07858] text-xs mt-1">JPG, PNG, WEBP up to 10MB</p>
        </div>
      ) : (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Proof preview"
            className="w-full rounded-xl border border-[#F5DEC8] max-h-64 object-cover"
          />
          {uploading && (
            <div className="absolute inset-0 bg-white/60 rounded-xl flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF8C42]"></div>
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

      {cid && (
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="text-xs text-green-700 mb-1 flex items-center gap-1">
            <CheckCircle size={12} /> Uploaded to IPFS
          </div>
          <a
            href={`https://gateway.pinata.cloud/ipfs/${cid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#1A0F08] font-mono break-all hover:text-[#D4700A]"
          >
            {cid}
          </a>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="text-xs text-red-600">{error}</div>
        </div>
      )}
    </div>
  );
}
