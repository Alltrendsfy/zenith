import { useState, useRef } from "react";
import type { ReactNode, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, Upload, FileImage, FileText } from "lucide-react";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: { successful: { uploadURL: string; name: string }[] }) => void;
  buttonClassName?: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link";
  children: ReactNode;
}

export function ObjectUploader({
  maxFileSize = 5242880,
  allowedFileTypes = ['image/*', 'application/pdf'],
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  buttonVariant = "outline",
  children,
}: ObjectUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");

    if (file.size > maxFileSize) {
      setError(`Arquivo muito grande. Tamanho máximo: ${(maxFileSize / 1024 / 1024).toFixed(1)}MB`);
      return;
    }

    const fileType = file.type;
    const allowedExtensions = allowedFileTypes.some(type => {
      if (type === 'image/*') return fileType.startsWith('image/');
      if (type === 'application/pdf') return fileType === 'application/pdf';
      return false;
    });

    if (!allowedExtensions) {
      setError("Tipo de arquivo não permitido. Use imagens ou PDFs.");
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress(0);
    setError("");

    try {
      const { url } = await onGetUploadParameters();
      
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentage = Math.round((e.loaded / e.total) * 100);
          setProgress(percentage);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onComplete?.({
            successful: [{
              uploadURL: url,
              name: selectedFile.name,
            }]
          });
          setSelectedFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } else {
          setError("Falha no upload. Tente novamente.");
        }
        setUploading(false);
        setProgress(0);
      });

      xhr.addEventListener('error', () => {
        setError("Erro ao fazer upload. Verifique sua conexão.");
        setUploading(false);
        setProgress(0);
      });

      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', selectedFile.type);
      xhr.send(selectedFile);
    } catch (err) {
      setError("Erro ao obter URL de upload.");
      setUploading(false);
      setProgress(0);
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return <Upload className="h-4 w-4" />;
    return selectedFile.type.startsWith('image/') 
      ? <FileImage className="h-4 w-4" />
      : <FileText className="h-4 w-4" />;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedFileTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload-input"
          disabled={uploading}
        />
        <Button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={buttonClassName}
          variant={buttonVariant}
          data-testid="button-upload-document"
          disabled={uploading}
        >
          {children}
        </Button>
        
        {selectedFile && !uploading && (
          <Button
            type="button"
            onClick={handleUpload}
            size="sm"
            data-testid="button-confirm-upload"
          >
            <Upload className="h-4 w-4 mr-2" />
            Enviar
          </Button>
        )}
      </div>

      {selectedFile && (
        <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
          {getFileIcon()}
          <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
          <span className="text-xs text-muted-foreground">
            {(selectedFile.size / 1024).toFixed(1)} KB
          </span>
          {!uploading && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {uploading && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">{progress}% enviado</p>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
