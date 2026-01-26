import { useCallback, useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileIcon, Image, Video, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  accept?: Record<string, string[]>;
  multiple?: boolean;
  value?: File[];
  className?: string;
  disabled?: boolean;
}

export function FileDropzone({
  onFilesSelected,
  maxFiles = 50,
  maxSize = 10 * 1024 * 1024, // 10MB default
  accept,
  multiple = true,
  value = [],
  className,
  disabled = false,
}: FileDropzoneProps) {
  // value prop을 직접 사용하고 내부 상태는 제거
  const files = value;
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // 새로운 파일만 전달 (기존 파일 상태를 누적하지 않음)
      const limitedFiles = acceptedFiles.slice(0, maxFiles);
      onFilesSelected(limitedFiles);
    },
    [maxFiles, onFilesSelected]
  );

  // Ctrl+V 이미지 붙여넣기 핸들러
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (disabled) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // 이미지 파일만 처리
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            // 파일 크기 체크
            if (file.size > maxSize) {
              toast({
                title: '파일 크기 초과',
                description: `${file.name}이(가) 최대 크기를 초과했습니다.`,
                variant: 'destructive',
              });
              continue;
            }

            // accept 타입 체크 (지정된 경우)
            if (accept) {
              const acceptedTypes = Object.values(accept).flat();
              const isAccepted = acceptedTypes.some(type => {
                if (type.endsWith('/*')) {
                  return file.type.startsWith(type.replace('/*', ''));
                }
                return file.type === type;
              });

              if (!isAccepted) {
                toast({
                  title: '파일 형식 오류',
                  description: '지원하지 않는 파일 형식입니다.',
                  variant: 'destructive',
                });
                continue;
              }
            }

            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();

        // 새로운 이미지 파일만 전달 (기존 파일을 누적하지 않음)
        const limitedFiles = imageFiles.slice(0, maxFiles);
        onFilesSelected(limitedFiles);

        toast({
          title: '이미지 추가됨',
          description: `${limitedFiles.length}개의 이미지가 추가되었습니다.`,
        });
      }
    };

    // 전역 paste 이벤트 리스너 등록
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [maxFiles, maxSize, accept, disabled, onFilesSelected, toast]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    accept,
    multiple,
    disabled,
  });

  const removeFile = (index: number) => {
    // 해당 인덱스의 파일만 제거한 배열을 부모에게 전달
    const remaining = files.filter((_, i) => i !== index);
    onFilesSelected(remaining);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-8 w-8" />;
    if (file.type.startsWith('video/')) return <Video className="h-8 w-8" />;
    if (file.type.includes('pdf') || file.type.includes('document'))
      return <FileText className="h-8 w-8" />;
    return <FileIcon className="h-8 w-8" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div ref={containerRef} className={cn('space-y-4', className)}>
      {/* Dropzone */}
      <Card
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed p-8 text-center cursor-pointer transition-colors',
          isDragActive && 'border-primary bg-primary/5',
          isDragReject && 'border-destructive bg-destructive/5',
          disabled && 'cursor-not-allowed opacity-50',
          !isDragActive && !isDragReject && 'border-border hover:border-primary/50'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <Upload
            className={cn(
              'h-12 w-12',
              isDragActive ? 'text-primary' : 'text-muted-foreground'
            )}
          />
          {isDragActive ? (
            <p className="text-sm font-medium text-primary">파일을 여기에 놓으세요...</p>
          ) : (
            <>
              <p className="text-sm font-medium">
                파일을 드래그하거나 클릭하여 업로드
              </p>
              <p className="text-xs text-muted-foreground">
                파일당 최대 {formatFileSize(maxSize)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                💡 Ctrl+V로 클립보드 이미지를 바로 붙여넣을 수 있습니다
              </p>
            </>
          )}
        </div>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">선택된 파일 ({files.length})</p>
          <div className="space-y-2">
            {files.map((file, index) => (
              <Card
                key={`${file.name}-${index}`}
                className="p-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="text-primary">{getFileIcon(file)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
