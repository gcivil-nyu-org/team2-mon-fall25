import { type ReactNode } from "react";
import { Modal } from "../modals/Modal";

export function ConfirmModal({
  open,
  onClose,
  title = "Confirm",
  children,
  confirmText = "Delete",
  confirmVariant = "danger",
  onConfirm,
  isLoading = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  confirmText?: string;
  confirmVariant?: "danger" | "primary";
  onConfirm: () => void;
  isLoading?: boolean;
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
            disabled={isLoading}
            className="rounded-lg border px-3 py-1.5 text-sm dark:border-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={
              confirmVariant === "danger"
                ? "rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                : "rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 dark:bg-zinc-200 dark:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
            }
          >
            {isLoading ? "Deleting..." : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}