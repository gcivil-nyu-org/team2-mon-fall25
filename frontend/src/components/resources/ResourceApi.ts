// API for Resources feature - integrates with backend
import {
  fetchResources as apiFetchResources,
  uploadResource as apiUploadResource,
  downloadResource as apiDownloadResource,
  deleteResourceById as apiDeleteResource,
  getResourcePreviewUrlById,
  type BackendResource
} from '../../lib/api';

export interface Resource {
  id: string;
  name: string;
  fileName: string;
  fileType: string; // "pdf", "docx", "xlsx", "jpg", etc.
  fileSize: number; // in bytes
  fileUrl: string; // URL or file path
  uploadedBy: string; // username
  uploadedById: number; // user ID
  uploaded: string; // ISO date string (matches backend "uploaded")
  tags: string[];
}

// Local persistence for tags and name overrides (since backend doesn't support them yet)
const TAGS_STORAGE_KEY = 'collabdesk-resource-tags';
const NAME_OVERRIDES_STORAGE_KEY = 'collabdesk-resource-name-overrides';

type TagsMap = Record<string, string[]>; // resourceId -> tags
type NameMap = Record<string, string>;   // resourceId -> name

function loadTagsMap(): TagsMap {
  try {
    const raw = localStorage.getItem(TAGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveTagsMap(map: TagsMap) {
  localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(map));
}

function getTags(resourceId: string): string[] {
  const map = loadTagsMap();
  return map[resourceId] || [];
}

function setTags(resourceId: string, tags: string[]) {
  const map = loadTagsMap();
  map[resourceId] = tags;
  saveTagsMap(map);
}

function removeTags(resourceId: string) {
  const map = loadTagsMap();
  if (resourceId in map) {
    delete map[resourceId];
    saveTagsMap(map);
  }
}

function loadNameMap(): NameMap {
  try {
    const raw = localStorage.getItem(NAME_OVERRIDES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveNameMap(map: NameMap) {
  localStorage.setItem(NAME_OVERRIDES_STORAGE_KEY, JSON.stringify(map));
}

function getNameOverride(resourceId: string): string | undefined {
  const map = loadNameMap();
  return map[resourceId];
}

function setNameOverride(resourceId: string, name: string) {
  const map = loadNameMap();
  map[resourceId] = name;
  saveNameMap(map);
}

function removeNameOverride(resourceId: string) {
  const map = loadNameMap();
  if (resourceId in map) {
    delete map[resourceId];
    saveNameMap(map);
  }
}

// Convert backend resource to frontend resource format
function convertBackendResource(backendResource: BackendResource): Resource {
  const id = backendResource.profile_id;
  const nameOverride = getNameOverride(id);
  return {
    id,
    name: nameOverride ?? backendResource.name,
    fileName: backendResource.file.split('/').pop() || backendResource.name,
    fileType: backendResource.type.toLowerCase(),
    fileSize: backendResource.size,
    fileUrl: backendResource.file,
    uploadedBy: backendResource.uploaded_by,
    uploadedById: backendResource.uploaded_by_id,
    uploaded: backendResource.uploaded,
    tags: backendResource.tags && backendResource.tags.length > 0 ? backendResource.tags : getTags(id),
  };
}

// Get all resources
export const getResources = async (): Promise<Resource[]> => {
  try {
    const backendResources = await apiFetchResources();
    return backendResources.map(convertBackendResource);
  } catch (error) {
    console.error('Failed to fetch resources:', error);
    throw error;
  }
};

// Create a new resource
export const createResource = async (
  file: File,
  name: string,
  tags: string[]
): Promise<Resource> => {
  try {
    const backendResource = await apiUploadResource(file, name, tags);
    // Persist tags locally and return converted resource including tags
    const id = backendResource.profile_id;
    setTags(id, tags);
    const converted = convertBackendResource(backendResource);
    return { ...converted, tags };
  } catch (error) {
    console.error('Failed to upload resource:', error);
    throw error;
  }
};

// Update a resource (edit name/tags)
export const updateResource = async (
  id: string,
  updates: Partial<Pick<Resource, 'name' | 'tags'>>
): Promise<Resource> => {
  // Since backend doesn't yet support PATCH for resources, persist locally
  if (typeof updates.name === 'string') {
    setNameOverride(id, updates.name);
  }
  if (Array.isArray(updates.tags)) {
    setTags(id, updates.tags);
  }

  // Retrieve latest resource from backend and apply overrides
  const backendResources = await apiFetchResources();
  const backend = backendResources.find(r => r.profile_id === id);
  if (!backend) {
    throw new Error('Resource not found');
  }
  const converted = convertBackendResource(backend);
  return {
    ...converted,
    name: updates.name ?? converted.name,
    tags: updates.tags ?? converted.tags,
  };
};

// Delete a resource
export const deleteResource = async (id: string): Promise<void> => {
  try {
    await apiDeleteResource(id);
    // Clean up local persistence
    removeTags(id);
    removeNameOverride(id);
  } catch (error) {
    console.error('Failed to delete resource:', error);
    throw error;
  }
};

// Download a resource
export const downloadResource = async (resource: Resource): Promise<void> => {
  try {
    await apiDownloadResource(resource.id);
  } catch (error) {
    console.error('Failed to download resource:', error);
    throw error;
  }
};
// Get a previewable URL for a resource (presigned URL or blob URL)
export const getResourcePreviewUrl = async (resource: Resource): Promise<{ url: string; revoke?: () => void; }> => {
  return getResourcePreviewUrlById(resource.id);
};

// Get unique file types from all resources (for filter dropdown)
export const getUniqueFileTypes = (resources: Resource[]): string[] => {
  const types = new Set(resources.map((r) => r.fileType));
  return Array.from(types).sort();
};

// Get unique tags from all resources (for filter dropdown)
export const getUniqueTags = (resources: Resource[]): string[] => {
  const tags = new Set(resources.flatMap((r) => r.tags));
  return Array.from(tags).sort();
};

// Helper to format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

// Helper to format date
export const formatDate = (isoString: string): string => {
  // Ensure consistency with backend timezone by extracting
  // the date/time portion directly from the ISO string
  // without converting to the client's local timezone.
  if (typeof isoString === 'string') {
    const m = isoString.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (m) {
      const [, Y, MM, DD, HH, mm] = m;
      return `${Y}-${MM}-${DD} ${HH}:${mm}`;
    }
  }
  // Fallback: use Date if format unexpected
  const date = new Date(isoString);
  const y = date.getFullYear();
  const mon = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hrs = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${mon}-${day} ${hrs}:${mins}`;
};

// Helper to get file icon emoji
export const getFileIcon = (fileType: string): string => {
  const icons: Record<string, string> = {
    // Documents
    pdf: "📄",
    docx: "📝",
    doc: "📝",
    xlsx: "📊",
    xls: "📊",
    pptx: "📽️",
    ppt: "📽️",
    // Images
    png: "🖼️",
    jpg: "🖼️",
    jpeg: "🖼️",
    gif: "🖼️",
    svg: "🖼️",
    bmp: "🖼️",
    webp: "🖼️",
    ico: "🖼️",
    // Videos
    mp4: "🎥",
    mov: "🎥",
    avi: "🎥",
    wmv: "🎥",
    webm: "🎥",
    // Audio
    mp3: "🎵",
    wav: "🎵",
    ogg: "🎵",
    // Archives
    zip: "📦",
    rar: "📦",
    tar: "📦",
    gz: "📦",
    // Text/Code
    txt: "📃",
    csv: "📊",
    json: "📋",
    xml: "📋",
    md: "📝",
    html: "🌐",
    css: "🎨",
    js: "⚙️",
    py: "🐍",
  };
  return icons[fileType.toLowerCase()] || "📁";
};

// Helper to check if file type can be previewed
export const canPreview = (fileType: string): boolean => {
  const previewableTypes = [
    // Documents
    "pdf", "docx", "doc", "pptx", "ppt", "xlsx", "xls",
    // Images
    "png", "jpg", "jpeg", "gif", "svg", "bmp", "webp", "ico",
    // Videos
    "mp4", "webm", "ogg", "mov",
    // Text/Code files
    "txt", "csv", "json", "xml", "md", "html", "css", "js", "py",
  ];
  return previewableTypes.includes(fileType.toLowerCase());
};
