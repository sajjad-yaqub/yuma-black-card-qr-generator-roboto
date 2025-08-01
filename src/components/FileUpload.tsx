
import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, X, File } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  accept: string;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  placeholder: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  accept,
  onFileSelect,
  selectedFile,
  placeholder
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const removeFile = useCallback(() => {
    onFileSelect(null);
  }, [onFileSelect]);

  return (
    <div className="space-y-4">
      <Card
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          selectedFile && "border-green-500 bg-green-50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="p-6 text-center">
          {selectedFile ? (
            <div className="space-y-2">
              <File className="w-8 h-8 mx-auto text-green-600" />
              <p className="text-sm font-medium text-green-700">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={removeFile}
                className="gap-2"
              >
                <X className="w-3 h-3" />
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{placeholder}</p>
              <p className="text-xs text-muted-foreground">
                Drag & drop or click to browse
              </p>
            </div>
          )}
        </div>
      </Card>
      
      <input
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        id={`file-input-${placeholder.replace(/\s+/g, '-')}`}
      />
      
      {!selectedFile && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            const input = document.getElementById(`file-input-${placeholder.replace(/\s+/g, '-')}`);
            input?.click();
          }}
        >
          <Upload className="w-4 h-4 mr-2" />
          Choose File
        </Button>
      )}
    </div>
  );
};
