import { type ReactNode } from "react";
import { Modal } from "./Modal";

export function ConfirmModal({
  open,
  onClose,
  title = "Confirm",
  children,
  confirmText = "Delete",
  confirmVariant = "danger",
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  confirmText?: string;
  confirmVariant?: "danger" | "primary";
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          {children}
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border px-3 py-1.5 text-sm dark:border-zinc-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={
              confirmVariant === "danger"
                ? "rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
                : "rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 dark:bg-zinc-200 dark:text-zinc-900"
            }
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}