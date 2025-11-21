
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X, File, Image, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

interface FileUploaderProps {
  onFileSelect: (files: FileInfo[]) => void;
  selectedFiles: FileInfo[];
  isLoading?: boolean;
}

export interface FileInfo {
  id: string;
  file: File;
  preview?: string;
  isUploaded?: boolean;
  path?: string;
  url?: string;
  base64Data?: string; // Add base64 data for Flowise
}

// Flowise upload format
export interface FlowiseUpload {
  data: string; // base64 data URI format: "data:mime/type;base64,..."
  type: "file" | "file:full"; // "file" for images (AI can see), "file:full" for documents
  name: string;
  mime: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 5;
const MAX_IMAGE_DIMENSION = 2000; // Maximum width or height for images
const IMAGE_QUALITY = 0.8; // JPEG quality (0-1)
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // PDFs
  'application/pdf',
  // Document files
  'text/plain',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// File types supported by Claude API directly
export const CLAUDE_SUPPORTED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf'
];

// File types supported via tools
export const CLAUDE_TOOL_SUPPORTED_FILE_TYPES = [
  'text/plain',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// All supported file types
export const ALL_SUPPORTED_FILE_TYPES = [
  ...CLAUDE_SUPPORTED_FILE_TYPES,
  ...CLAUDE_TOOL_SUPPORTED_FILE_TYPES
];

const FileUploader: React.FC<FileUploaderProps> = ({ 
  onFileSelect,
  selectedFiles,
  isLoading = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const generatePreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = () => {
          resolve(undefined);
        };
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  // Compress image if needed
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions if image is too large
          if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
            if (width > height) {
              height = (height / width) * MAX_IMAGE_DIMENSION;
              width = MAX_IMAGE_DIMENSION;
            } else {
              width = (width / height) * MAX_IMAGE_DIMENSION;
              height = MAX_IMAGE_DIMENSION;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }

              // Create a new File object from the blob
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });

              console.log(`Image compressed: ${(file.size / 1024).toFixed(2)}KB -> ${(compressedFile.size / 1024).toFixed(2)}KB`);
              resolve(compressedFile);
            },
            'image/jpeg',
            IMAGE_QUALITY
          );
        };
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  };

  // Convert file to base64 data URI for Flowise
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList) return;
    
    // Check if adding these files would exceed the limit
    if (selectedFiles.length + fileList.length > MAX_FILES) {
      toast.error(`You can upload a maximum of ${MAX_FILES} files.`);
      return;
    }
    
    const newFiles: FileInfo[] = [];

    for (let i = 0; i < fileList.length; i++) {
      let file = fileList[i];

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File ${file.name} exceeds the maximum size of 10MB.`);
        continue;
      }

      // Check file type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        toast.error(`File type ${file.type} is not supported.`);
        continue;
      }

      // Compress image if it's an image file
      if (file.type.startsWith('image/')) {
        try {
          file = await compressImage(file);
        } catch (error) {
          console.error(`Error compressing image ${file.name}:`, error);
          toast.error(`Failed to process image ${file.name}`);
          continue;
        }
      }

      // Generate preview for images
      const preview = await generatePreview(file);

      // Convert to base64 for Flowise
      let base64Data: string | undefined;
      try {
        base64Data = await convertToBase64(file);
      } catch (error) {
        console.error(`Error converting file ${file.name} to base64:`, error);
        toast.error(`Failed to process file ${file.name}`);
        continue;
      }

      // Check file support level and show appropriate toast
      if (CLAUDE_SUPPORTED_FILE_TYPES.includes(file.type)) {
        toast.success(`File ${file.name} will be processed directly by Claude AI.`);
      } else if (CLAUDE_TOOL_SUPPORTED_FILE_TYPES.includes(file.type)) {
        toast.success(`File ${file.name} will be processed using text extraction tools.`);
      } else {
        toast.warning(`File ${file.name} will be attached but Claude AI can only view its content if you extract and share the text.`);
      }

      newFiles.push({
        id: uuidv4(),
        file,
        preview,
        isUploaded: false,
        base64Data
      });
    }
    
    if (newFiles.length > 0) {
      onFileSelect([...selectedFiles, ...newFiles]);
    }
    
    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (id: string) => {
    onFileSelect(selectedFiles.filter(file => file.id !== id));
  };

  // Function to get the appropriate icon based on file type
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-5 w-5 mr-1 text-gray-600" />;
    } else if (fileType === 'application/pdf' || 
               fileType === 'application/msword' || 
               fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
               fileType === 'text/plain') {
      return <FileText className="h-5 w-5 mr-1 text-gray-600" />;
    } else if (fileType === 'text/csv' || 
               fileType === 'application/vnd.ms-excel' ||
               fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return <FileSpreadsheet className="h-5 w-5 mr-1 text-green-600" />;
    } else {
      return <File className="h-5 w-5 mr-1 text-gray-600" />;
    }
  };

  return (
    <div className="w-full">
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedFiles.map((fileInfo) => (
            <div
              key={fileInfo.id}
              className="relative flex items-center bg-gray-100 rounded-md p-2 pr-8"
            >
              {fileInfo.preview ? (
                <div className="h-6 w-6 mr-1">
                  <img
                    src={fileInfo.preview}
                    alt={fileInfo.file.name}
                    className="h-full w-full object-cover rounded"
                  />
                </div>
              ) : (
                getFileIcon(fileInfo.file.type)
              )}
              <span className="text-xs max-w-[120px] truncate">
                {fileInfo.file.name}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveFile(fileInfo.id)}
                className="absolute top-1 right-1 text-gray-500 hover:text-gray-700"
                disabled={isLoading}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          multiple
          className="hidden"
          accept={ALLOWED_MIME_TYPES.join(',')}
          disabled={isLoading || selectedFiles.length >= MAX_FILES}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || selectedFiles.length >= MAX_FILES}
          className="mr-2 text-xs"
        >
          <Paperclip className="h-3 w-3 mr-1" />
          {selectedFiles.length === 0 ? 'Attach files' : 'Add more'}
        </Button>
        {selectedFiles.length > 0 && (
          <span className="text-xs text-gray-500 self-center">
            {selectedFiles.length} of {MAX_FILES} files
          </span>
        )}
      </div>
    </div>
  );
};

export default FileUploader;
