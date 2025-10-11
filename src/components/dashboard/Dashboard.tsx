import { useState } from "react";
import { WorkspaceInfoCard } from "../dashboard/WorkspaceInfoCard";
import { MembersModal } from "../dashboard/MembersModal";

interface Member {
  id: string;
  name: string;
  role: string;
}

interface Workspace {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  members: Member[];
}

export function Dashboard() {
  const [workspace] = useState<Workspace>({
    id: "w1",
    name: "Product Team",
    description:
      "Collaborating on building and optimizing the CollabDesk platform.",
    createdAt: "2024-02-15",
    members: [
      { id: "m1", name: "Alex Johnson", role: "Manager" },
      { id: "m2", name: "Sarah Chen", role: "Developer" },
      { id: "m3", name: "Mike Ross", role: "Designer" },
    ],
  });

  const [showMembers, setShowMembers] = useState(false);

  return (
    <div className="w-full p-6">
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>

      <WorkspaceInfoCard workspace={workspace} onShowMembers={() => setShowMembers(true)} />

      <MembersModal
        open={showMembers}
        onClose={() => setShowMembers(false)}
        members={workspace.members}
      />
    </div>
  );
}