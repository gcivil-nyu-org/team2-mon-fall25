import type { Resource } from "./ResourceApi";

interface FileTypeBadgeProps {
  fileType: string;
  size?: "sm" | "md" | "lg";
}

const FILE_TYPE_CONFIG: Record<
  string,
  { color: string; label: string; icon: string }
> = {
  pdf: {
    color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    label: "PDF",
    icon: "document",
  },
  docx: {
    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    label: "DOCX",
    icon: "document",
  },
  doc: {
    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    label: "DOC",
    icon: "document",
  },
  xlsx: {
    color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    label: "XLSX",
    icon: "table",
  },
  xls: {
    color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    label: "XLS",
    icon: "table",
  },
  csv: {
    color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    label: "CSV",
    icon: "table",
  },
  pptx: {
    color:
      "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
    label: "PPTX",
    icon: "presentation",
  },
  ppt: {
    color:
      "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
    label: "PPT",
    icon: "presentation",
  },
  png: {
    color:
      "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    label: "PNG",
    icon: "image",
  },
  jpg: {
    color:
      "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    label: "JPG",
    icon: "image",
  },
  jpeg: {
    color:
      "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    label: "JPEG",
    icon: "image",
  },
  gif: {
    color:
      "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    label: "GIF",
    icon: "image",
  },
  svg: {
    color:
      "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    label: "SVG",
    icon: "image",
  },
  zip: {
    color:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    label: "ZIP",
    icon: "archive",
  },
  rar: {
    color:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    label: "RAR",
    icon: "archive",
  },
  txt: {
    color: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
    label: "TXT",
    icon: "document",
  },
  json: {
    color: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300",
    label: "JSON",
    icon: "code",
  },
  xml: {
    color: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300",
    label: "XML",
    icon: "code",
  },
  mp4: {
    color:
      "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
    label: "MP4",
    icon: "video",
  },
  mov: {
    color:
      "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
    label: "MOV",
    icon: "video",
  },
  avi: {
    color:
      "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
    label: "AVI",
    icon: "video",
  },
};

function FileTypeIcon({ icon, size = "md" }: { icon: string; size?: string }) {
  const sizeClass = size === "sm" ? "w-3 h-3" : size === "lg" ? "w-5 h-5" : "w-4 h-4";

  if (icon === "document") {
    return (
      <svg
        className={sizeClass}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    );
  }

  if (icon === "table") {
    return (
      <svg
        className={sizeClass}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
    );
  }

  if (icon === "presentation") {
    return (
      <svg
        className={sizeClass}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
        />
      </svg>
    );
  }

  if (icon === "image") {
    return (
      <svg
        className={sizeClass}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    );
  }

  if (icon === "archive") {
    return (
      <svg
        className={sizeClass}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
        />
      </svg>
    );
  }

  if (icon === "code") {
    return (
      <svg
        className={sizeClass}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
        />
      </svg>
    );
  }

  if (icon === "video") {
    return (
      <svg
        className={sizeClass}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
    );
  }

  // Default file icon
  return (
    <svg
      className={sizeClass}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

export function FileTypeBadge({ fileType, size = "md" }: FileTypeBadgeProps) {
  const config =
    FILE_TYPE_CONFIG[fileType.toLowerCase()] ||
    FILE_TYPE_CONFIG["txt"] || {
      color: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
      label: fileType.toUpperCase(),
      icon: "document",
    };

  const paddingClass = size === "sm" ? "px-1.5 py-0.5" : size === "lg" ? "px-3 py-1.5" : "px-2 py-1";
  const textClass = size === "sm" ? "text-xs" : size === "lg" ? "text-sm" : "text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1 ${paddingClass} rounded-md ${textClass} font-medium ${config.color}`}
    >
      <FileTypeIcon icon={config.icon} size={size} />
      <span>{config.label}</span>
    </span>
  );
}
