
"use client";

import { X, File as FileIcon, Image as ImageIcon } from "lucide-react";
import { Button } from "../ui/button";
import { useEffect, useState } from "react";
import Image from "next/image";

interface FileUploadPreviewProps {
  file: File;
  onRemove: () => void;
}

export default function FileUploadPreview({ file, onRemove }: FileUploadPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isImage = file.type.startsWith("image/");

  useEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, isImage]);

  return (
    <div className="mb-2 flex items-center justify-between rounded-lg border bg-muted/50 p-2">
      <div className="flex items-center gap-2 overflow-hidden">
        {isImage && previewUrl ? (
          <Image
            src={previewUrl}
            alt="Preview"
            width={40}
            height={40}
            className="h-10 w-10 rounded-md object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
            <FileIcon className="h-6 w-6" />
          </div>
        )}
        <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-medium">{file.name}</span>
            <span className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onRemove} className="shrink-0">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

    