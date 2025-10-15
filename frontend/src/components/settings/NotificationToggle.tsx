interface Props {
    enabled: boolean;
    onToggle: () => void;
  }
  
  export function NotificationToggle({ enabled, onToggle }: Props) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-base">Notifications</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Toggle app notifications on or off.
          </p>
        </div>
  
        <button
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-400 dark:bg-zinc-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    );
  }