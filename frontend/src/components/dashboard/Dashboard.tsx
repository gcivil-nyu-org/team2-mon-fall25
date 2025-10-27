import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { WorkspaceInfoCard } from "./WorkspaceInfoCard";
import { fetchWorkspaceInformation, type Workspace } from "../../lib/api";

export function Dashboard({ workspaceId }: { workspaceId: string }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth0();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return; // Wait for Auth0 to finish checking
    if (!isAuthenticated) {
      setLoading(false);
      return; // Don't fetch if not authenticated
    }
    if (!workspaceId) return;

    console.log("🔁 Fetching workspace info for:", workspaceId);
    setLoading(true);
    setError("");
    const user_id = 1;

    fetchWorkspaceInformation(workspaceId, user_id)
      .then((data) => {
        setWorkspace(data);
      })
      .catch((err) => {
        console.error("Error fetching workspace:", err);
        setError("Failed to load workspace.");
      })
      .finally(() => setLoading(false));
  }, [workspaceId, isAuthenticated, authLoading]);

  if (loading) return <div className="p-6">Loading workspace...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!workspace) return null;

  return (
    <div className="w-full p-6">
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>

      <WorkspaceInfoCard workspace={workspace} />
      {/* No members modal yet since API doesn't return members */}
    </div>
  );
}