export type StoredEvent = {
    id: string;
    title: string;
    startISO: string;
    endISO: string;
  };
  
  const KEY = (ws: string) => `cd.events.${ws}`;
  
  export function loadEvents(workspace: string): StoredEvent[] {
    try {
      const raw = localStorage.getItem(KEY(workspace));
      return raw ? (JSON.parse(raw) as StoredEvent[]) : [];
    } catch {
      return [];
    }
  }
  
  export function saveEvents(workspace: string, events: StoredEvent[]) {
    localStorage.setItem(KEY(workspace), JSON.stringify(events));
  }