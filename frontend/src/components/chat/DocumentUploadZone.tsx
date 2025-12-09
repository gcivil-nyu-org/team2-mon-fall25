import { useState, useRef } from 'react';

interface DocumentUploadZoneProps {
  onUpload: (file: File, actionType: 'summary' | 'plan') => void;
  isUploading: boolean;
}

const SUPPORTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'text/plain',
  'text/markdown',
  'text/javascript',
  'text/typescript',
  'text/python',
  'text/x-python',
  'application/javascript',
  'application/typescript',
  'image/png',
  'image/jpeg',
  'image/jpg',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function DocumentUploadZone({ onUpload, isUploading }: DocumentUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [actionType, setActionType] = useState<'summary' | 'plan' | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return 'File exceeds 10 MB limit. Please choose a smaller file.';
    }

    // Check file extension and MIME type
    const extension = file.name.split('.').pop()?.toLowerCase();
    const isValidExtension = [
      'pdf', 'docx', 'txt', 'md', 'js', 'ts', 'tsx', 'jsx',
      'py', 'java', 'cpp', 'c', 'go', 'rs', 'rb', 'php',
      'png', 'jpg', 'jpeg'
    ].includes(extension || '');

    if (!isValidExtension && !SUPPORTED_TYPES.includes(file.type)) {
      return 'File type not supported. Supported: PDF, DOCX, TXT, MD, code files, images.';
    }

    return null;
  };

  const handleFile = (file: File) => {
    setError('');
    const validationError = validateFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = () => {
    if (selectedFile && actionType) {
      onUpload(selectedFile, actionType);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-6">
      <div className="max-w-2xl w-full space-y-6">
        {/* Step 1: Choose Action Type */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Step 1: Choose an action
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setActionType('summary')}
              disabled={isUploading}
              className={`p-4 rounded-xl border-2 transition-all ${
                actionType === 'summary'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900'
              } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="text-center space-y-2">
                <svg className="w-8 h-8 mx-auto text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="font-medium text-zinc-900 dark:text-zinc-100">Create Summary</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  Generate a comprehensive summary of your document
                </div>
              </div>
            </button>

            <button
              onClick={() => setActionType('plan')}
              disabled={isUploading}
              className={`p-4 rounded-xl border-2 transition-all ${
                actionType === 'plan'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900'
              } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="text-center space-y-2">
                <svg className="w-8 h-8 mx-auto text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <div className="font-medium text-zinc-900 dark:text-zinc-100">Create Plan</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  Generate an execution plan based on your document
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Step 2: Upload File */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Step 2: Upload your document
          </h3>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleClick}
            className={`relative border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900'
            } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.docx,.txt,.md,.js,.ts,.tsx,.jsx,.py,.java,.cpp,.c,.go,.rs,.rb,.php,.png,.jpg,.jpeg"
              className="hidden"
              disabled={isUploading}
            />

            <div className="text-center space-y-3">
              {selectedFile ? (
                <>
                  <div className="text-4xl">✓</div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Choose a different file
                  </button>
                </>
              ) : (
                <>
                  <div className="text-4xl">📁</div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Drag & drop or click to upload
                  </p>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                    <p>PDF, DOCX, TXT, Markdown, Code files, Images</p>
                    <p className="text-zinc-500 dark:text-zinc-500">Max size: 10 MB</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Step 3: Submit */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Step 3: Submit
          </h3>
          <button
            onClick={handleSubmit}
            disabled={!actionType || !selectedFile || isUploading}
            className="w-full px-6 py-3 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {actionType === 'summary' ? 'Generate Summary' : actionType === 'plan' ? 'Generate Plan' : 'Submit'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
