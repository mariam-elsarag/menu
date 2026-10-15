"use client";

import Image from "next/image";
import { ImagePlus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface ImagePickerProps {
  currentImageUrl?: string | null;
  selectedFile: File | null;
  currentImageRemoved: boolean;
  onFileChange: (file: File | null) => void;
  onRemoveCurrent: () => void;
  onRestoreCurrent: () => void;
  error?: string;
}

export function ImagePicker({
  currentImageUrl,
  selectedFile,
  currentImageRemoved,
  onFileChange,
  onRemoveCurrent,
  onRestoreCurrent,
  error,
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const previewUrl =
    selectedPreview ?? (currentImageRemoved ? null : (currentImageUrl ?? null));

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  function chooseFile(file: File | null) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    if (file) {
      previewUrlRef.current = URL.createObjectURL(file);
      setSelectedPreview(previewUrlRef.current);
    } else {
      setSelectedPreview(null);
    }

    onFileChange(file);
  }

  return (
    <div className="grid gap-3">
      <div
        className={`relative grid min-h-44 place-items-center overflow-hidden rounded-lg border border-dashed bg-muted ${
          error ? "border-destructive" : "border-border"
        }`}
        aria-describedby={error ? "category-image-error" : undefined}
      >
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt="معاينة صورة التصنيف"
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, 420px"
            className="object-cover"
          />
        ) : (
          <div className="grid justify-items-center gap-2 p-6 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-surface text-primary">
              <ImagePlus aria-hidden="true" size={22} />
            </span>
            <span className="text-sm font-semibold">اختر صورة للتصنيف</span>
            <span className="text-xs text-muted-foreground">
              JPEG أو PNG أو WebP، بحد أقصى ٥ ميجابايت
            </span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="اختيار صورة التصنيف"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0] ?? null;
          chooseFile(file);
          event.currentTarget.value = "";
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="ui-button ui-button-secondary min-h-10"
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus aria-hidden="true" size={16} />
          {previewUrl ? "استبدال الصورة" : "اختيار صورة"}
        </button>
        {selectedFile && (
          <button
            type="button"
            className="ui-button ui-button-ghost min-h-10 text-destructive"
            onClick={() => chooseFile(null)}
          >
            <Trash2 aria-hidden="true" size={16} />
            إزالة الصورة المحددة
          </button>
        )}
        {!selectedFile && currentImageUrl && !currentImageRemoved && (
          <button
            type="button"
            className="ui-button ui-button-ghost min-h-10 text-destructive"
            onClick={onRemoveCurrent}
          >
            <Trash2 aria-hidden="true" size={16} />
            إزالة الصورة الحالية
          </button>
        )}
        {currentImageUrl && currentImageRemoved && (
          <button
            type="button"
            className="ui-button ui-button-ghost min-h-10"
            onClick={onRestoreCurrent}
          >
            <RotateCcw aria-hidden="true" size={16} />
            استعادة الصورة الحالية
          </button>
        )}
        {selectedFile && (
          <span
            className="max-w-full truncate text-xs text-muted-foreground"
            dir="ltr"
          >
            {selectedFile.name}
          </span>
        )}
      </div>
      {error && (
        <p id="category-image-error" className="ui-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
