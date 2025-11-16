import { useState, useRef } from "react";
import { Modal } from "../modals/Modal";
import type { Resource } from "./ResourceApi";
import { createResource } from "./ResourceApi";

interface ResourceUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (resource: Resource) => void;
}

export function ResourceUploadModal({
  open,
  onClose,
  onUpload,
}: ResourceUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      // Auto-fill name if empty
      if (!name) {
        setName(selectedFile.name.replace(/\.[^/.]+$/, "")); // Remove extension
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      // Auto-fill name if empty
      if (!name) {
        setName(droppedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file to upload");
      return;
    }

    if (!name.trim()) {
      alert("Please provide a name for the document");
      return;
    }

    setIsUploading(true);

    try {
      // Parse tags (comma-separated)
      const tagArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      // Upload file with name to backend; persist tags locally
      const newResource = await createResource(file, name.trim(), tagArray);

      onUpload(newResource);

      // Reset form
      setFile(null);
      setName("");
      setTags("");
      onClose();
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload document. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setFile(null);
      setName("");
      setTags("");
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={<div>Upload Document</div>}>
      <div className="space-y-4">
        {/* File Upload Area */}
        <div>
          <label className="text-sm text-zinc-600 dark:text-zinc-400 block mb-2">
            File
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
              ${
                isDragging
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600"
              }
            `}
          >
            {file ? (
              <div className="space-y-2">
                <div className="text-4xl">📄</div>
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {file.name}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Change file
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-4xl">📁</div>
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Drop file here or click to browse
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  All file types accepted
                </div>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
            accept="*/*"
          />
        </div>

        {/* Document Name */}
        <div>
          <label className="text-sm text-zinc-600 dark:text-zinc-400 block mb-2">
            Document Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Q4 Marketing Strategy"
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-blue-900"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-sm text-zinc-600 dark:text-zinc-400 block mb-2">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., marketing, strategy, q4"
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-blue-900"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Separate multiple tags with commas
          </p>
        </div>

        {/* Upload Button */}
        <div className="pt-2">
          <button
            onClick={handleUpload}
            disabled={isUploading || !file || !name.trim()}
            className="w-full rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {isUploading ? "Uploading..." : "Upload Document"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
