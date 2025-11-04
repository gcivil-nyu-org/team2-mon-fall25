// Mock API for Resources feature
// In production, this would make real HTTP requests to the backend

export interface Resource {
  id: string;
  name: string;
  fileName: string;
  fileType: string; // "pdf", "docx", "xlsx", "jpg", etc.
  fileSize: number; // in bytes
  fileUrl: string; // mock URL
  uploadedBy: string; // username
  uploadedAt: string; // ISO date string
  tags: string[];
}

// Mock data - 15 sample documents
const mockResources: Resource[] = [
  {
    id: "1",
    name: "Q4 2024 Marketing Strategy",
    fileName: "marketing_strategy_q4.pdf",
    fileType: "pdf",
    fileSize: 2457600, // 2.4 MB
    fileUrl: "/mock/marketing_strategy_q4.pdf",
    uploadedBy: "Sarah Chen",
    uploadedAt: "2025-01-15T10:30:00Z",
    tags: ["marketing", "strategy", "q4"],
  },
  {
    id: "2",
    name: "Product Roadmap 2025",
    fileName: "product_roadmap_2025.pptx",
    fileType: "pptx",
    fileSize: 5242880, // 5 MB
    fileUrl: "/mock/product_roadmap_2025.pptx",
    uploadedBy: "Alex Johnson",
    uploadedAt: "2025-01-14T14:20:00Z",
    tags: ["product", "roadmap", "2025"],
  },
  {
    id: "3",
    name: "Brand Guidelines v3",
    fileName: "brand_guidelines_v3.pdf",
    fileType: "pdf",
    fileSize: 8388608, // 8 MB
    fileUrl: "/mock/brand_guidelines_v3.pdf",
    uploadedBy: "Mike Ross",
    uploadedAt: "2025-01-13T09:15:00Z",
    tags: ["design", "brand", "guidelines"],
  },
  {
    id: "4",
    name: "Budget Allocation Spreadsheet",
    fileName: "budget_2025.xlsx",
    fileType: "xlsx",
    fileSize: 1048576, // 1 MB
    fileUrl: "/mock/budget_2025.xlsx",
    uploadedBy: "Priya Nair",
    uploadedAt: "2025-01-12T16:45:00Z",
    tags: ["finance", "budget", "2025"],
  },
  {
    id: "5",
    name: "User Research Findings",
    fileName: "user_research_jan_2025.docx",
    fileType: "docx",
    fileSize: 3145728, // 3 MB
    fileUrl: "/mock/user_research_jan_2025.docx",
    uploadedBy: "Sarah Chen",
    uploadedAt: "2025-01-11T11:00:00Z",
    tags: ["research", "ux", "users"],
  },
  {
    id: "6",
    name: "Homepage Redesign Mockup",
    fileName: "homepage_redesign.png",
    fileType: "png",
    fileSize: 4194304, // 4 MB
    fileUrl: "/mock/homepage_redesign.png",
    uploadedBy: "Mike Ross",
    uploadedAt: "2025-01-10T13:30:00Z",
    tags: ["design", "mockup", "homepage"],
  },
  {
    id: "7",
    name: "API Documentation",
    fileName: "api_docs_v2.pdf",
    fileType: "pdf",
    fileSize: 1572864, // 1.5 MB
    fileUrl: "/mock/api_docs_v2.pdf",
    uploadedBy: "Alex Johnson",
    uploadedAt: "2025-01-09T10:00:00Z",
    tags: ["api", "documentation", "technical"],
  },
  {
    id: "8",
    name: "Sales Report December 2024",
    fileName: "sales_report_dec_2024.xlsx",
    fileType: "xlsx",
    fileSize: 2097152, // 2 MB
    fileUrl: "/mock/sales_report_dec_2024.xlsx",
    uploadedBy: "John Miller",
    uploadedAt: "2025-01-08T15:20:00Z",
    tags: ["sales", "report", "december"],
  },
  {
    id: "9",
    name: "Team Photo Spring 2024",
    fileName: "team_photo_spring_2024.jpg",
    fileType: "jpg",
    fileSize: 6291456, // 6 MB
    fileUrl: "/mock/team_photo_spring_2024.jpg",
    uploadedBy: "Sarah Chen",
    uploadedAt: "2025-01-07T12:00:00Z",
    tags: ["team", "photo", "culture"],
  },
  {
    id: "10",
    name: "Employee Handbook 2025",
    fileName: "employee_handbook_2025.pdf",
    fileType: "pdf",
    fileSize: 5767168, // 5.5 MB
    fileUrl: "/mock/employee_handbook_2025.pdf",
    uploadedBy: "Priya Nair",
    uploadedAt: "2025-01-06T09:30:00Z",
    tags: ["hr", "handbook", "policies"],
  },
  {
    id: "11",
    name: "Meeting Notes Template",
    fileName: "meeting_notes_template.docx",
    fileType: "docx",
    fileSize: 524288, // 512 KB
    fileUrl: "/mock/meeting_notes_template.docx",
    uploadedBy: "Alex Johnson",
    uploadedAt: "2025-01-05T14:00:00Z",
    tags: ["template", "meetings"],
  },
  {
    id: "12",
    name: "Logo Assets Package",
    fileName: "logo_assets.zip",
    fileType: "zip",
    fileSize: 10485760, // 10 MB
    fileUrl: "/mock/logo_assets.zip",
    uploadedBy: "Mike Ross",
    uploadedAt: "2025-01-04T11:45:00Z",
    tags: ["design", "logo", "assets"],
  },
  {
    id: "13",
    name: "Project Timeline Gantt Chart",
    fileName: "project_timeline_q1.xlsx",
    fileType: "xlsx",
    fileSize: 1310720, // 1.25 MB
    fileUrl: "/mock/project_timeline_q1.xlsx",
    uploadedBy: "John Miller",
    uploadedAt: "2025-01-03T10:15:00Z",
    tags: ["project", "timeline", "q1"],
  },
  {
    id: "14",
    name: "Customer Feedback Summary",
    fileName: "customer_feedback_2024.txt",
    fileType: "txt",
    fileSize: 102400, // 100 KB
    fileUrl: "/mock/customer_feedback_2024.txt",
    uploadedBy: "Sarah Chen",
    uploadedAt: "2025-01-02T16:30:00Z",
    tags: ["feedback", "customers", "insights"],
  },
  {
    id: "15",
    name: "Onboarding Presentation",
    fileName: "new_hire_onboarding.pptx",
    fileType: "pptx",
    fileSize: 7340032, // 7 MB
    fileUrl: "/mock/new_hire_onboarding.pptx",
    uploadedBy: "Priya Nair",
    uploadedAt: "2025-01-01T13:00:00Z",
    tags: ["hr", "onboarding", "training"],
  },
];

// Helper function to simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Get all resources
export const getResources = async (): Promise<Resource[]> => {
  await delay(500); // Simulate network delay
  return [...mockResources];
};

// Create a new resource
export const createResource = async (
  resource: Omit<Resource, "id" | "uploadedAt" | "uploadedBy">
): Promise<Resource> => {
  await delay(300);
  const newResource: Resource = {
    ...resource,
    id: crypto.randomUUID(),
    uploadedBy: "Current User", // In real app, this would come from auth
    uploadedAt: new Date().toISOString(),
  };
  mockResources.unshift(newResource); // Add to beginning of array
  return newResource;
};

// Update a resource (edit name/tags)
export const updateResource = async (
  id: string,
  updates: Partial<Pick<Resource, "name" | "tags">>
): Promise<Resource> => {
  await delay(300);
  const index = mockResources.findIndex((r) => r.id === id);
  if (index === -1) {
    throw new Error("Resource not found");
  }
  mockResources[index] = { ...mockResources[index], ...updates };
  return mockResources[index];
};

// Delete a resource
export const deleteResource = async (id: string): Promise<void> => {
  await delay(300);
  const index = mockResources.findIndex((r) => r.id === id);
  if (index === -1) {
    throw new Error("Resource not found");
  }
  mockResources.splice(index, 1);
};

// Download a resource (mock - in real app would trigger download)
export const downloadResource = async (resource: Resource): Promise<void> => {
  await delay(200);
  console.log(`Downloading: ${resource.fileName}`);
  // In real app: window.location.href = resource.fileUrl;
  alert(`Mock download: ${resource.fileName}`);
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
  const date = new Date(isoString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Helper to get file icon emoji
export const getFileIcon = (fileType: string): string => {
  const icons: Record<string, string> = {
    pdf: "📄",
    docx: "📝",
    doc: "📝",
    xlsx: "📊",
    xls: "📊",
    pptx: "📽️",
    ppt: "📽️",
    png: "🖼️",
    jpg: "🖼️",
    jpeg: "🖼️",
    gif: "🖼️",
    svg: "🖼️",
    zip: "📦",
    rar: "📦",
    txt: "📃",
    csv: "📊",
    json: "📋",
    xml: "📋",
    mp4: "🎥",
    mov: "🎥",
    avi: "🎥",
  };
  return icons[fileType.toLowerCase()] || "📁";
};

// Helper to check if file type can be previewed
export const canPreview = (fileType: string): boolean => {
  const previewableTypes = ["pdf", "png", "jpg", "jpeg", "gif", "svg"];
  return previewableTypes.includes(fileType.toLowerCase());
};
