"use client";

import { useEffect, useId, useRef, useState } from "react";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 5 * 1024 * 1024; // same limit the server enforces

type Labels = {
  choose: string;
  remove: string;
  undoRemove: string;
  noImage: string;
  willRemove: string;
  newImage: string;
  badFile: string;
  hint: string;
};

/**
 * Image picker for a category: shows the current image (or the newly chosen one)
 * in a preview framed exactly like the storefront banner (object-contain on the
 * same dark gradient), so what you see here is how it will look on the site.
 *
 * Submits through the surrounding <form>:
 *   - `name`        -> the chosen file (optional)
 *   - `removeName`  -> "1" when the current image should be deleted
 */
export default function CategoryImageField({
  name = "banner",
  removeName = "removeBanner",
  currentImage,
  labels,
}: {
  name?: string;
  removeName?: string;
  currentImage?: string | null;
  labels: Labels;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [preview, setPreview] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState(false);
  const [fileName, setFileName] = useState("");

  // Free the temporary blob URL when it changes / on unmount.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const clearFile = () => {
    if (inputRef.current) inputRef.current.value = "";
    setPreview(null);
    setFileName("");
  };

  const onPick = (file: File | undefined) => {
    if (!file) {
      clearFile();
      return;
    }
    if (!ALLOWED.includes(file.type) || file.size > MAX_BYTES) {
      clearFile();
      setError(true);
      return;
    }
    setError(false);
    setRemoved(false); // choosing a new image replaces the old one
    setFileName(file.name);
    setPreview(URL.createObjectURL(file));
  };

  const shown = preview ?? (!removed && currentImage ? `/images/${currentImage}` : null);

  return (
    <div>
      <div className="flex h-36 w-full items-center justify-center overflow-hidden rounded-[var(--radius-sm)] bg-gradient-to-b from-ink-900 via-[#4a3226] to-ink-900">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob: previews can't go through next/image
          <img src={shown} alt="" className="h-full w-auto max-w-full object-contain" />
        ) : (
          <span className="text-xs text-white/60">{removed ? labels.willRemove : labels.noImage}</span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        {/* Real file input stays in the DOM (so the form submits it) but is visually
            hidden; the styled label below is the visible, always-clickable button. */}
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="file"
          accept={ALLOWED.join(",")}
          onChange={(e) => onPick(e.target.files?.[0])}
          className="sr-only"
        />
        <label
          htmlFor={inputId}
          className="btn-press inline-flex cursor-pointer items-center gap-2 rounded-full bg-coral-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-coral-600"
        >
          <span aria-hidden="true">📷</span>
          {labels.choose}
        </label>
        {fileName && (
          <span dir="ltr" className="max-w-[12rem] truncate text-xs text-ink-500">
            {fileName}
          </span>
        )}
        {preview && <span className="text-xs text-green-700">{labels.newImage}</span>}
        {currentImage && !preview && (
          <button
            type="button"
            onClick={() => setRemoved((r) => !r)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              removed
                ? "border-ink-300 text-ink-700 hover:bg-blush-50"
                : "border-red-300 text-red-700 hover:bg-red-50"
            }`}
          >
            {removed ? labels.undoRemove : labels.remove}
          </button>
        )}
      </div>

      <input type="hidden" name={removeName} value={removed && !preview ? "1" : ""} />
      <p className={`mt-1 text-xs ${error ? "text-red-700" : "text-ink-400"}`}>{error ? labels.badFile : labels.hint}</p>
    </div>
  );
}
