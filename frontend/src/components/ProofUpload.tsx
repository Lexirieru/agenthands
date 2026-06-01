'use client';
/** @module ProofUpload — IPFS proof upload component for Celo AgentHands task completion. */

import { useState, useRef, useEffect, useCallback, useImperativeHandle, type Ref } from 'react';
import { Upload, CheckCircle, Camera, X, Loader2, FileText, Paperclip } from 'lucide-react';

/** Upload mode selected by the worker — `image` for file/drag-drop, `text` for written or code proofs. */
type Mode = 'image' | 'text';
/** Proof content kind stored in the on-chain CID and Pinata manifest — captures what the CID points to on Celo. */
type Kind = 'image' | 'text' | 'text+image';

/**
 * Proof-of-work upload widget for AgentHands tasks on Celo.
 *
 * Workers submit proof by either:
 *   - **Image mode**: drag-and-drop / file picker → pinned to Pinata IPFS
 *     via the `/api/ipfs/upload` Railway backend endpoint.
 *   - **Text / Code mode**: plain-text textarea, optionally with an attached
 *     image. On submit, text is pinned as `proof.txt`; text + image produces
 *     a JSON manifest `{ v:1, kind:'text+image', text, imageCID }` pinned as
 *     `proof.json`. The manifest CID is the value stored on-chain.
 *
 * The resulting IPFS CID is passed to `onCIDReady` and persisted in
 * `localStorage` so the draft survives a page refresh before the worker
 * submits the on-chain `submitProof(taskId, cid)` transaction on Celo.
 *
 * `ProofUploadHandle.ensureUploaded()` is the imperative API called by the
 * parent's Submit button to flush any pending text before the tx fires.
 */
/**
 * Imperative handle exposed by `ProofUpload` via `useImperativeHandle`.
 * @since 1.0.0
 */
export interface ProofUploadHandle {
  /**
   * Called by the parent's Submit button. Returns the Pinata IPFS CID — uploading
   * pending text content if needed. Returns null if there's nothing to
   * upload yet (and the parent should surface that to the user on Celo).
   */
  ensureUploaded: () => Promise<string | null>;
}

/**
 * Props for `ProofUpload`.
 * @since 1.0.0
 * `taskId` namespaces the `localStorage` draft so multiple Celo tasks can have independent drafts.
 */
interface ProofUploadProps {
  /** Called with the IPFS CID whenever a new upload completes or is cleared. */
  onCIDReady: (cid: string) => void;
  /** Fires whenever the "has something to submit" state changes — lets the parent gate the Submit button. */
  onContentChange?: (hasContent: boolean) => void;
  /** Celo task ID; scopes the draft cache so different tasks don't share state. */
  taskId?: string | number | bigint;
  ref?: Ref<ProofUploadHandle>;
}

/**
 * Shape of the JSON object stored in `localStorage` to persist Celo proof upload drafts across page refreshes.
 * @since 1.0.0
 */
interface DraftPayload {
  cid: string;
  mode: Mode;
  kind?: Kind;
  textPreview?: string;
  attachedImageCID?: string;
}

/** Pinata dedicated gateway for previewing uploaded Celo proof CIDs before on-chain `submitProof`. */
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://agenthands-production.up.railway.app';

/**
 * Returns the namespaced `localStorage` key for a Celo task's proof draft, or `null` when `taskId` is absent.
 * @since 1.0.0
 */
function draftKey(taskId: ProofUploadProps['taskId']) {
  if (taskId === undefined || taskId === null) return null;
  return `agenthands-proof-draft-${String(taskId)}`;
}

/**
 * Read and parse a proof draft from localStorage for the given task.
 * Handles the legacy schema where only a raw CID string was stored (treats it as an image draft).
 * Returns null on SSR, missing key, or invalid JSON.
 *
 * @since 1.0.0
 * @param taskId Celo task ID used to namespace the draft key in localStorage.
 * @returns      Parsed `DraftPayload` or `null` if nothing is stored or the key is absent.
 */
function loadDraft(taskId: ProofUploadProps['taskId']): DraftPayload | null {
  const key = draftKey(taskId);
  if (!key) return null;
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DraftPayload;
    if (parsed && typeof parsed.cid === 'string' && (parsed.mode === 'image' || parsed.mode === 'text')) {
      return parsed;
    }
  } catch {
    // Legacy schema: localStorage previously stored just the CID string.
    return { cid: raw, mode: 'image', kind: 'image' };
  }
  return null;
}

/**
 * Persist a proof draft to localStorage so it survives page refresh before the on-chain `submitProof` tx.
 * @since 1.0.0
 */
function saveDraft(taskId: ProofUploadProps['taskId'], payload: DraftPayload) {
  const key = draftKey(taskId);
  if (!key) return;
  window.localStorage.setItem(key, JSON.stringify(payload));
}

/** Remove the stored proof draft from localStorage after the on-chain submitProof tx confirms or the user clears the upload. */
function clearDraft(taskId: ProofUploadProps['taskId']) {
  const key = draftKey(taskId);
  if (key) window.localStorage.removeItem(key);
}

/**
 * Upload a single file to Pinata IPFS via the AgentHands Railway backend.
 * Returns the Pinata IPFS CID string on success, or throws with a descriptive
 * message (HTTP status + first 120 chars of the error body) on failure.
 *
 * The returned CID is a base-32 CIDv1 (e.g. `bafybei…`) from Pinata; it is
 * stored on-chain via `submitProof(taskId, cid)` on Celo and retrievable at
 * `https://gateway.pinata.cloud/ipfs/<cid>`.
 *
 * @param file The `File` object to pin (image or text blob).
 * @returns    Pinata IPFS CID of the pinned file.
 * @throws     Error with HTTP status detail if the Railway endpoint returns non-2xx.
 */
async function pinFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/ipfs/upload`, { method: 'POST', body: formData });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Upload failed (${res.status}) ${detail.slice(0, 120)}`);
  }
  const data = (await res.json()) as { cid?: string };
  if (!data.cid) throw new Error('Upload response missing cid');
  return data.cid;
}

export default function ProofUpload({ ref, onCIDReady, onContentChange, taskId }: ProofUploadProps) {
  const [mode, setMode] = useState<Mode>('image');
  const [uploading, setUploading] = useState(false);
  const [uploadingLabel, setUploadingLabel] = useState('Uploading to IPFS…');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [attachEnabled, setAttachEnabled] = useState(false);
  const [attachedImageFile, setAttachedImageFile] = useState<File | null>(null);
  const [attachedImagePreview, setAttachedImagePreview] = useState<string | null>(null);
  const [attachDragActive, setAttachDragActive] = useState(false);
  const [cid, setCid] = useState<string | null>(null);
  const [cidKind, setCidKind] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const attachRef = useRef<HTMLInputElement>(null);

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
  // pointer; for images the preview is the IPFS gateway URL, for text we
  // fetch the content (and image attachment, if any) from the gateway.
  useEffect(() => {
    const draft = loadDraft(taskId);
    if (!draft) return;
    const kind: Kind = draft.kind ?? (draft.mode === 'image' ? 'image' : 'text');
    setCid(draft.cid);
    setCidKind(kind);
    setMode(draft.mode);
    onCIDReady(draft.cid);

    if (kind === 'image') {
      setImagePreview(`${PINATA_GATEWAY}/${draft.cid}`);
      return;
    }

    if (draft.textPreview) setTextPreview(draft.textPreview);
    if (draft.attachedImageCID) {
      setAttachEnabled(true);
      setAttachedImagePreview(`${PINATA_GATEWAY}/${draft.attachedImageCID}`);
    }

    fetch(`${PINATA_GATEWAY}/${draft.cid}`)
      .then((r) => (r.ok ? r.text() : null))
      .then((body) => {
        if (body === null) return;
        if (kind === 'text+image') {
          try {
            const manifest = JSON.parse(body) as { text?: string; imageCID?: string };
            if (typeof manifest.text === 'string') {
              setText(manifest.text);
              setTextPreview(manifest.text);
            }
            if (typeof manifest.imageCID === 'string') {
              setAttachedImagePreview(`${PINATA_GATEWAY}/${manifest.imageCID}`);
            }
          } catch {
            // Fall back to showing the raw body.
            setText(body);
            setTextPreview(body);
          }
        } else {
          setText(body);
          setTextPreview(body);
        }
      })
      .catch(() => {
        // Network hiccup — keep the cached preview.
      });
  }, [taskId, onCIDReady]);

  // Notify the parent whenever there is *something* to submit, so the
  // parent's Submit button can be enabled even before we've uploaded.
  useEffect(() => {
    if (!onContentChange) return;
    const has =
      !!cid ||
      !!imagePreview ||
      text.trim().length > 0 ||
      !!attachedImageFile;
    onContentChange(has);
  }, [cid, imagePreview, text, attachedImageFile, onContentChange]);

  const handleImageUpload = useCallback(
    async (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);

      setUploading(true);
      setUploadingLabel('Uploading to IPFS…');
      setError(null);
      try {
        const newCid = await pinFile(file);
        setCid(newCid);
        setCidKind('image');
        onCIDReady(newCid);
        saveDraft(taskId, { cid: newCid, mode: 'image', kind: 'image' });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to upload. Please try again.');
        setImagePreview(null);
      } finally {
        setUploading(false);
      }
    },
    [onCIDReady, taskId]
  );

  const handleAttachImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Attachment must be an image (JPG, PNG, WEBP).');
      return;
    }
    setAttachedImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setAttachedImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setError(null);
  };

  const clearAttachedImage = () => {
    setAttachedImageFile(null);
    setAttachedImagePreview(null);
    if (attachRef.current) attachRef.current.value = '';
  };

  // Pin the current text draft (and optional attached image) to IPFS.
  // - text only             → pin text as proof.txt → return its CID
  // - text + attached image → pin image, then pin a JSON manifest
  //                           {kind:'text+image', text, imageCID} → return
  //                           the manifest's CID. The agent fetches the
  //                           manifest and uses it to render both.
  const uploadTextNow = useCallback(async (): Promise<string | null> => {
    const trimmed = text.trim();
    if (!trimmed && !attachedImageFile) {
      setError('Type something or attach an image before submitting.');
      return null;
    }

    setUploading(true);
    setError(null);

    try {
      if (attachedImageFile) {
        setUploadingLabel('Uploading attached image…');
        const imageCID = await pinFile(attachedImageFile);

        setUploadingLabel('Pinning manifest to IPFS…');
        const manifest = { v: 1, kind: 'text+image' as const, text, imageCID };
        const manifestBlob = new Blob([JSON.stringify(manifest)], {
          type: 'application/json',
        });
        const manifestFile = new File([manifestBlob], 'proof.json', {
          type: 'application/json',
        });
        const manifestCID = await pinFile(manifestFile);

        setCid(manifestCID);
        setCidKind('text+image');
        onCIDReady(manifestCID);
        setTextPreview(text.slice(0, 800));
        saveDraft(taskId, {
          cid: manifestCID,
          mode: 'text',
          kind: 'text+image',
          textPreview: text.slice(0, 800),
          attachedImageCID: imageCID,
        });
        return manifestCID;
      }

      setUploadingLabel('Uploading text to IPFS…');
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const file = new File([blob], 'proof.txt', { type: 'text/plain;charset=utf-8' });
      const newCid = await pinFile(file);
      setCid(newCid);
      setCidKind('text');
      onCIDReady(newCid);
      setTextPreview(text.slice(0, 800));
      saveDraft(taskId, {
        cid: newCid,
        mode: 'text',
        kind: 'text',
        textPreview: text.slice(0, 800),
      });
      return newCid;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload. Please try again.');
      return null;
    } finally {
      setUploading(false);
    }
  }, [text, attachedImageFile, onCIDReady, taskId]);

  // Imperative API for the parent: pin the current draft (text or already
  // uploaded image) to IPFS and return the CID. Image uploads happen
  // automatically the moment a file is picked, so by the time the parent
  // calls this, the only outstanding case is unpinned text.
  useImperativeHandle(
    ref,
    () => ({
      async ensureUploaded() {
        if (cid) return cid;
        if (uploading) return null;
        if (mode === 'text') return uploadTextNow();
        return null;
      },
    }),
    [cid, uploading, mode, uploadTextNow]
  );

  const handleClear = () => {
    setImagePreview(null);
    setTextPreview(null);
    setText('');
    setAttachedImageFile(null);
    setAttachedImagePreview(null);
    setCid(null);
    setCidKind(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
    if (attachRef.current) attachRef.current.value = '';
    clearDraft(taskId);
    onCIDReady('');
  };

  const submitted = !!cid && cidKind !== null;
  const showImageDropzone = !submitted && mode === 'image' && !imagePreview;
  const showImagePreview = mode === 'image' && imagePreview;
  const showTextEditor = !submitted && mode === 'text';
  const showTextPreview = submitted && (cidKind === 'text' || cidKind === 'text+image');

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-[#5C2D0A] mb-2 font-label">
        <Camera size={14} className="inline mr-1" /> Submit Proof
      </label>

      {!submitted && (
        <div className="relative flex mb-2 p-1 bg-[var(--card)] rounded-xl border border-[var(--border)]">
          {/* Sliding pill indicator — translates between the two tabs in
              sync with the button click. The pill spans 50%-of-container
              minus the 4 px padding, so translateX(100%) = its own width
              lands it exactly over the right tab. */}
          <span
            aria-hidden
            className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] bg-[#5C2D0A] rounded-lg transition-transform duration-300 ease-out will-change-transform"
            style={{ transform: mode === 'text' ? 'translateX(100%)' : 'translateX(0)' }}
          />
          <button
            type="button"
            onClick={() => setMode('image')}
            className={`flex-1 relative z-10 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors duration-300 ${
              mode === 'image' ? 'text-white' : 'text-[#8B4513] hover:text-[#5C2D0A]'
            }`}
          >
            <Camera size={14} /> Image
          </button>
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`flex-1 relative z-10 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors duration-300 ${
              mode === 'text' ? 'text-white' : 'text-[#8B4513] hover:text-[#5C2D0A]'
            }`}
          >
            <FileText size={14} /> Text / Code
          </button>
        </div>
      )}

      {showImageDropzone && (
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
            handleImageUpload(file);
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
      )}

      {showImagePreview && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreview!}
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
              <p className="text-sm font-medium text-[#5C2D0A]">{uploadingLabel}</p>
              <p className="text-xs text-[#8B4513]">Pinning your photo on Pinata</p>
            </div>
          )}
        </div>
      )}

      {showTextEditor && (
        <div className="space-y-2 relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your code, write a report, drop a link — anything text-shaped."
            rows={10}
            disabled={uploading}
            className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[#5C2D0A] placeholder-[#8B4513] focus:outline-none focus:border-[#D4700A] text-sm font-mono resize-y min-h-[180px]"
          />

          {/* Attach-image toggle */}
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-[#5C2D0A] inline-flex items-center gap-1.5 font-label">
              <Paperclip size={12} /> Attach an image <span className="text-[#A8763B]">(optional)</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={attachEnabled}
              onClick={() => {
                setAttachEnabled((v) => {
                  if (v) clearAttachedImage();
                  return !v;
                });
              }}
              disabled={uploading}
              className={`relative h-5 w-9 rounded-full transition ${
                attachEnabled ? 'bg-[#5C2D0A]' : 'bg-[#8B4513]/40'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                  attachEnabled ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Animated container: slides + fades in when toggle is on. We
              keep the children mounted (just clipped via max-height + opacity)
              so the close transition runs cleanly instead of popping. */}
          <div
            className={`grid transition-all duration-300 ease-out ${
              attachEnabled
                ? 'grid-rows-[1fr] opacity-100 mt-1'
                : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'
            }`}
            aria-hidden={!attachEnabled}
          >
            <div className="overflow-hidden">
              {!attachedImagePreview ? (
                <div
                  onClick={() => attachRef.current?.click()}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setAttachDragActive(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!attachDragActive) setAttachDragActive(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setAttachDragActive(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setAttachDragActive(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleAttachImage(file);
                  }}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    attachDragActive
                      ? 'border-[#D4700A] bg-[#D4700A]/10'
                      : 'border-[var(--border)] hover:border-[#D4700A] bg-[var(--card)]'
                  }`}
                >
                  <Upload size={24} className="mx-auto mb-1.5 text-[#8B4513]" />
                  <p className="text-[#5C2D0A] text-sm">
                    {attachDragActive ? 'Drop to attach' : 'Click or drag photo here'}
                  </p>
                  <p className="text-[#8B4513] text-xs mt-0.5">JPG, PNG, WEBP up to 10MB</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-2 bg-[var(--card)] border border-[var(--border)] rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={attachedImagePreview}
                    alt="Attached preview"
                    className="w-14 h-14 rounded-md object-cover border border-[var(--border)]"
                  />
                  <span className="text-xs text-[#5C2D0A] flex-1 truncate">
                    {attachedImageFile?.name ?? 'Image attachment'}
                  </span>
                  <button
                    type="button"
                    onClick={clearAttachedImage}
                    disabled={uploading}
                    aria-label="Remove attached image"
                    className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="text-xs text-[#8B4513] text-right">
            {text.length.toLocaleString()} chars
          </div>

          {uploading && (
            <div className="absolute inset-0 -inset-x-1 bg-[var(--card-solid)]/70 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-2">
              <Loader2 size={28} className="animate-spin text-[#D4700A]" />
              <p className="text-sm font-medium text-[#5C2D0A]">{uploadingLabel}</p>
            </div>
          )}
        </div>
      )}

      {showTextPreview && (
        <div className="space-y-2">
          <div className="relative">
            <pre className="w-full max-h-64 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-xs font-mono text-[#5C2D0A] whitespace-pre-wrap break-words">
              {textPreview ?? text ?? '(loading…)'}
            </pre>
            {!uploading && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear text submission"
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {attachedImagePreview && (
            <div className="flex items-center gap-3 p-2 bg-[var(--card)] border border-[var(--border)] rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachedImagePreview}
                alt="Attached"
                className="w-14 h-14 rounded-md object-cover border border-[var(--border)]"
              />
              <span className="text-xs text-[#5C2D0A] flex-1">Attached image</span>
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
          if (file) handleImageUpload(file);
        }}
      />
      <input
        ref={attachRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleAttachImage(file);
        }}
      />

      {cid && !uploading && (
        <div className="p-3 bg-green-900/10 rounded-lg border border-green-400/30">
          <div className="text-xs text-green-700 mb-1 flex items-center gap-1">
            <CheckCircle size={12} /> Uploaded to IPFS{' '}
            {cidKind === 'text+image' ? '(text + image)' : cidKind === 'text' ? '(text)' : '(image)'}
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
