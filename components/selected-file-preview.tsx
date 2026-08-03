"use client";

import { useEffect, useMemo } from "react";

type SelectedFilePreviewProps = {
  file: File | null;
};

function getFileExtensionLabel(name: string) {
  const extension = name.split(".").pop();
  return extension && extension !== name ? extension.slice(0, 4).toUpperCase() : "FILE";
}

/** Shows a thumbnail (or a file-type badge for non-images) next to the
 *  filename, so picking the wrong photo from a camera roll full of similar
 *  shots is obvious before submitting, not after finance opens it. */
export default function SelectedFilePreview({ file }: SelectedFilePreviewProps) {
  const previewUrl = useMemo(() => {
    if (!file || !file.type.startsWith("image/")) {
      return null;
    }

    return URL.createObjectURL(file);
  }, [file]);

  // The effect only revokes the object URL created above — it never touches
  // React state, so there's nothing here for the next render to race.
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!file) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-2">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          className="h-14 w-14 shrink-0 rounded-md border border-zinc-200 bg-white object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-xs font-semibold text-zinc-500">
          {getFileExtensionLabel(file.name)}
        </div>
      )}
      <p className="min-w-0 truncate text-sm text-zinc-600">{file.name}</p>
    </div>
  );
}
