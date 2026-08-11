"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { CameraIcon } from "@/components/icons";

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          const scale = Math.min(MAX / width, MAX / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ImagePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [urlDraft, setUrlDraft] = useState(value);

  async function onFile(file: File) {
    setBusy(true);
    try {
      const dataUrl = await compressImage(file);
      onChange(dataUrl);
    } finally {
      setBusy(false);
    }
  }

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragging(false);
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void onFile(file);
  }

  if (urlMode) {
    return (
      <div>
        <Input
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          placeholder="https://…"
          autoFocus
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onChange(urlDraft.trim());
              setUrlMode(false);
            }}
            className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
          >
            Apply URL
          </button>
          <button
            type="button"
            onClick={() => setUrlMode(false)}
            className="text-xs font-medium text-ink-500 hover:underline"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {value ? (
        <div
          className={`flex items-center gap-3 rounded-2xl p-3 transition ${
            dragging ? "border-2 border-dashed border-brand-500 bg-brand-50" : "border-2 border-transparent bg-ink-50"
          }`}
        >
          <img src={value} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
          <div className="flex flex-col items-start gap-1.5">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-ink-700 shadow-sm hover:bg-ink-100"
            >
              Change image
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-xs font-medium text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={`flex h-28 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-ink-50 transition ${
            dragging
              ? "border-brand-500 bg-brand-50 text-brand-600"
              : "border-ink-200 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
          }`}
        >
          <CameraIcon className="h-6 w-6" />
          <span className="text-xs font-semibold">
            {busy ? "Processing…" : dragging ? "Drop to upload" : "Click or drag to add image"}
          </span>
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFile(file);
          e.target.value = "";
        }}
      />
      {!value && (
        <button
          type="button"
          onClick={() => {
            setUrlDraft(value);
            setUrlMode(true);
          }}
          className="mt-1.5 text-xs font-medium text-brand-600 hover:underline"
        >
          or paste an image URL
        </button>
      )}
    </div>
  );
}
