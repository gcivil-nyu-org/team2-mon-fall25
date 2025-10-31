// API utility for backend communication
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
  created_by: number;
  workspace_id: string;
};

export type Workspace = {
  workspace_id: string;
  name: string;
  description?: string;
  created_at?: string;
  member_count?: number;
  is_member?: boolean;
  is_public?: boolean;
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

async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
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
  workspaceId: string,
  userId: number
): Promise<Workspace> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/workspaces/information/?workspace_id=${workspaceId}&user_id=${userId}`
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
