import { useState } from "react";
import { Modal } from "./Modal";

interface JoinWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
  onJoin: (code: string) => void;
}

export function JoinWorkspaceModal({
  open,
  onClose,
  onJoin,
}: JoinWorkspaceModalProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleCodeChange = (value: string) => {
    // Only allow alphanumeric characters and limit to 8 characters
    const filtered = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    setCode(filtered);
    setError("");
  };

  const handleJoin = () => {
    if (code.length !== 8) {
      setError("Invite code must be exactly 8 characters");
      return;
    }
    onJoin(code);
    setCode("");
    setError("");
  };

  const handleClose = () => {
    setCode("");
    setError("");
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Join Workspace">
      <div className="space-y-4 p-1">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Enter the 8-digit invite code shared by your workspace administrator.
        </p>

        <div>
          <label className="text-sm font-medium">Invite Code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="ABC123"
            className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm text-center text-2xl font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={8}
          />
          {error && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleClose}
            className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            onClick={handleJoin}
            disabled={code.length !== 8}
            className="flex-1 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 dark:disabled:bg-emerald-800 text-white px-4 py-2 text-sm font-medium transition whitespace-nowrap"
          >
            Join Workspace
          </button>
        </div>
      </div>
    </Modal>
  );
}
