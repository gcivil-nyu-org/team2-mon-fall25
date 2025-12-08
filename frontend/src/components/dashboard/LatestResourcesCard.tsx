export function LatestResourcesCard({ resources }: { resources: any[] }) {
if (!resources || resources.length === 0) {
  return (
    <div className="mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No recent resource updates
      </p>
    </div>
  );
}


  return (
    <div className="mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Latest Resource Updates
        </h2>
      </div>

      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {resources.map((resource) => (
          <div key={resource.id} className="px-6 py-4">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {resource.name}
              </span>

              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Updated {new Date(resource.uploaded).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
