// API utility for backend communication
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
// const API_BASE_URL = 'http://localhost:8000';

export type BackendEvent = {
  event_id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  event_type: 'INDIVIDUAL' | 'GROUP';
  location: string;
  created_by: number;
  workspace_id: string;
  created_at: string;
  updated_at: string;
};

export type CreateEventPayload = {
  title: string;
  description?: string;
  start_time: string; // ISO string
  end_time: string; // ISO string
  event_type: 'INDIVIDUAL' | 'GROUP';
  location?: string;
  // workspace and created_by are now set automatically by the backend
  // from the X-Workspace-ID header and authenticated user
};

export type Workspace = {
  workspace_id: string;
  name: string;
  description?: string;
  created_at?: string;
  member_count?: number;
  is_member?: boolean;
  is_public?: boolean;
  created_by_id?: number;
  invite_code?: string;
  owner?: {
  id: number;
  email: string;
  username: string;
};
};

export type WorkspaceListItem = {
  workspace_id: string;
  name: string;
};

// Helper to make authenticated requests
let getAccessToken: (() => Promise<string | null>) | null = null;
let isTokenGetterReady = false;

export function setTokenGetter(getter: () => Promise<string | null>) {
  getAccessToken = getter;
  isTokenGetterReady = true;
  console.log('✅ Token getter configured and ready');
}

export function isTokenReady(): boolean {
  return isTokenGetterReady;
}

export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Add Authorization header if token is available
  if (getAccessToken) {
    const token = await getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('✅ Token added to request:', url);
    } else {
      console.warn('⚠️ No token available for request:', url);
    }
  } else {
    console.warn('⚠️ Token getter not configured for request:', url);
  }

  // Add workspace context header if workspace is selected
  const currentWorkspace = localStorage.getItem('cd.workspace');
  if (currentWorkspace) {
    headers['X-Workspace-ID'] = currentWorkspace;
    console.log('✅ Workspace context added to request:', currentWorkspace);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

export async function fetchEvents(): Promise<BackendEvent[]> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/events/`);
  if (!response.ok) {
    throw new Error('Failed to fetch events');
  }
  return response.json();
}

export async function createEvent(payload: CreateEventPayload): Promise<BackendEvent> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/events/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to create event');
  }

  return response.json();
}

export async function fetchWorkspaceList(): Promise<WorkspaceListItem[]> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/workspaces/list/`);
  if (!response.ok) {
    throw new Error('Failed to fetch workspace list');
  }
  return response.json();
}

export async function fetchWorkspaceInformation(
  workspaceId: string
): Promise<Workspace> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/workspaces/information/?workspace_id=${workspaceId}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch workspace information');
  }
  return response.json();
}

export async function deleteEvent(eventId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/events/${eventId}/`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to delete event');
  }
}

export type User = {
  id: number;
  user_id: string;
  email: string;
  full_name: string;
  profile_picture: string | null;
  username: string;
};

export async function fetchCurrentUser(): Promise<User> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/users/me/`);
  if (!response.ok) {
    throw new Error('Failed to fetch current user');
  }
  return response.json();
}

export async function fetchAllUsers(): Promise<User[]> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/users/list/`);
  if (!response.ok) {
    throw new Error('Failed to fetch user list');
  }
  const data = await response.json();
  return data;
}

interface CreateWorkspacePayload {
  name: string;
  description?: string;
  members?: String[]; // optional, can be empty
}

export async function createWorkspace(
  payload: CreateWorkspacePayload
): Promise<Workspace> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/workspaces/create/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to create workspace:", errorText);
  throw new Error("Failed to create workspace");
  }

  const data = await response.json();
  console.log("Workspace created successfully:", data);
  return data;
}

interface UpdateWorkspacePayload {
  name?: string;
  description?: string;
}

export async function updateWorkspace(
  workspaceId: string,
  payload: UpdateWorkspacePayload
): Promise<Workspace> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to update workspace:", errorText);
    throw new Error("Failed to update workspace");
  }

  const data = await response.json();
  console.log("Workspace updated successfully:", data);
  return data;
}

export async function joinWorkspace(inviteCode: string): Promise<Workspace> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/workspaces/join/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ invite_code: inviteCode }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to join workspace:", errorText);
    throw new Error("Failed to join workspace");
  }

  const data = await response.json();
  console.log("Joined workspace successfully:", data);
  return data;
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/workspaces/${workspaceId}/delete/`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to delete workspace:", errorText);
    throw new Error(`Failed to delete workspace: ${response.statusText}`);
  }

  console.log(`Workspace ${workspaceId} deleted successfully`);
}

export async function leaveWorkspace(workspaceId: string): Promise<void> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/workspaces/${workspaceId}/leave/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to leave workspace:", errorText);
    throw new Error("Failed to leave workspace");
  }

  console.log("Successfully left workspace:", workspaceId);
}

// Workspace Members Management
const USE_MOCK_MEMBERS = true; // Set to false when backend is ready
const MEMBERS_STORAGE_KEY_PREFIX = 'collabdesk-workspace-members-';

export type WorkspaceMember = {
  id: number;
  user_id: string;
  email: string;
  full_name: string;
  profile_picture: string | null;
  username: string;
  role?: 'owner' | 'member';
  joined_at?: string;
};

// Mock data helpers
function getMembersStorageKey(workspaceId: string): string {
  return `${MEMBERS_STORAGE_KEY_PREFIX}${workspaceId}`;
}

function getMembersFromStorage(workspaceId: string): WorkspaceMember[] {
  const stored = localStorage.getItem(getMembersStorageKey(workspaceId));
  return stored ? JSON.parse(stored) : [];
}

function saveMembersToStorage(workspaceId: string, members: WorkspaceMember[]): void {
  localStorage.setItem(getMembersStorageKey(workspaceId), JSON.stringify(members));
}

/**
 * Fetch all members of a workspace
 */
export async function fetchWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  if (USE_MOCK_MEMBERS) {
    // Check if we have mock data, if not initialize with current user as owner
    let members = getMembersFromStorage(workspaceId);
    if (members.length === 0) {
      try {
        const currentUser = await fetchCurrentUser();
        members = [{
          ...currentUser,
          role: 'owner',
          joined_at: new Date().toISOString(),
        }];
        saveMembersToStorage(workspaceId, members);
      } catch (err) {
        console.warn('Could not fetch current user for mock members');
      }
    }
    return members;
  }

  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/workspaces/${workspaceId}/members/`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch workspace members');
  }

  return response.json();
}

/**
 * Add members to a workspace
 */
export async function addWorkspaceMembers(
  workspaceId: string,
  userIds: string[]
): Promise<void> {
  if (USE_MOCK_MEMBERS) {
    const currentMembers = getMembersFromStorage(workspaceId);
    const allUsers = await fetchAllUsers();

    // Filter users to add (not already members)
    const newMembers: WorkspaceMember[] = allUsers
      .filter(user => userIds.includes(user.user_id))
      .filter(user => !currentMembers.some(m => m.user_id === user.user_id))
      .map(user => ({
        ...user,
        role: 'member',
        joined_at: new Date().toISOString(),
      }));

    const updatedMembers = [...currentMembers, ...newMembers];
    saveMembersToStorage(workspaceId, updatedMembers);
    return;
  }

  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/workspaces/${workspaceId}/members/add/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_ids: userIds }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to add workspace members');
  }
}

/**
 * Remove a member from a workspace
 */
export async function removeWorkspaceMember(
  workspaceId: string,
  userId: string
): Promise<void> {
  if (USE_MOCK_MEMBERS) {
    const currentMembers = getMembersFromStorage(workspaceId);
    const updatedMembers = currentMembers.filter(m => m.user_id !== userId);
    saveMembersToStorage(workspaceId, updatedMembers);
    return;
  }

  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/workspaces/${workspaceId}/members/${userId}/`,
    {
      method: 'DELETE',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to remove workspace member');
  }
}

