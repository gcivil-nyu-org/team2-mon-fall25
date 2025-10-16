import { useState } from "react";

export function ProfileSection() {
  const [email, setEmail] = useState("tanish.rana@example.com");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [name] = useState("Tanish Rana");
  const [profilePic] = useState("https://ui-avatars.com/api/?name=Tanish+Rana");

  const handleSaveEmail = () => setIsEditingEmail(false);

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <img
          src={profilePic}
          alt="Profile"
          className="w-20 h-20 rounded-full border border-zinc-300 dark:border-zinc-700"
        />
        <div>
          <h2 className="text-lg font-semibold">{name}</h2>
          <div className="flex items-center gap-2">
            {isEditingEmail ? (
              <>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border border-zinc-300 dark:border-zinc-700 rounded-md px-2 py-1 text-sm bg-transparent"
                />
                <button
                  onClick={handleSaveEmail}
                  className="px-2 py-1 text-sm rounded-md border dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Save
                </button>
              </>
            ) : (
              <>
                <span className="text-zinc-500 text-sm">{email}</span>
                <button
                  onClick={() => setIsEditingEmail(true)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Edit
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => alert("Password change flow coming soon")}
        className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        Change Password
      </button>
    </div>
  );
}