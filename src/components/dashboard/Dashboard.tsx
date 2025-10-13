import { useState, useEffect } from "react";
import { WorkspaceInfoCard } from "../dashboard/WorkspaceInfoCard";
// import { MembersModal } from "../dashboard/MembersModal";
import axios from "axios";

interface Member {
  id: string;
  name: string;
  role: string;
}

interface Workspace {
  workspace_id: string;
  name: string;
  description: string;
  created_at: string;
  member_count: number;
  is_member: boolean;
  is_public: boolean;
}

export function Dashboard({ workspaceId }: { workspaceId: string }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // const workspace_id = "cdb5abfe-dc99-4394-ac0e-e50a2f21d960";
    if (!workspaceId) return;
    console.log("🔁 Fetching workspace info for:", workspaceId);
    setLoading(true);
    setError("");
    const user_id = 1;

    axios
      .get(
        `http://127.0.0.1:8000/api/workspaces/information/?workspace_id=${workspaceId}&user_id=${user_id}`
      )
      .then((res) => {
        setWorkspace(res.data);
      })
      .catch((err) => {
        console.error("Error fetching workspace:", err);
        setError("Failed to load workspace.");
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading) return <div className="p-6">Loading workspace...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!workspace) return null;

  return (
    <div className="w-full p-6">
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>

      <WorkspaceInfoCard workspace={workspace} />
      {/* No members modal yet since API doesn’t return members */}
    </div>
  );
}