import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ImageInfo {
  url: string;
  uploadedAt?: string;
  rotation?: number; // 0, 90, 180, 270
}

interface ImageViewerProps {
  images: ImageInfo[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onRotate?: (index: number, newRotation: number) => void; // 회전 변경 콜백 (편집 모드용)
  readOnly?: boolean; // true면 회전 버튼 숨김
}

export function ImageViewer({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  onRotate,
  readOnly = true
}: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [localRotation, setLocalRotation] = useState(0); // 뷰어 내 임시 회전 (저장 안됨)
  const [zoom, setZoom] = useState(1);

  // 이미지 변경 시 초기화
  useEffect(() => {
    setCurrentIndex(initialIndex);
    setLocalRotation(0);
    setZoom(1);
  }, [initialIndex, isOpen]);

  // 현재 이미지
  const currentImage = images[currentIndex];

  // 최종 회전 각도 (저장된 rotation + 로컬 회전)
  const totalRotation = ((currentImage?.rotation || 0) + localRotation) % 360;

  // 이전 이미지
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setLocalRotation(0);
    setZoom(1);
  }, [images.length]);

  // 다음 이미지
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setLocalRotation(0);
    setZoom(1);
  }, [images.length]);

  // 회전 (로컬 - 저장 안됨)
  const handleRotate = useCallback(() => {
    setLocalRotation((prev) => (prev + 90) % 360);
  }, []);

  // 회전 저장 (편집 모드용)
  const handleSaveRotation = useCallback(() => {
    if (onRotate && currentImage) {
      const newRotation = totalRotation;
      onRotate(currentIndex, newRotation);
      setLocalRotation(0); // 저장 후 로컬 회전 초기화
    }
  }, [onRotate, currentImage, currentIndex, totalRotation]);

  // 줌
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.5, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.5, 0.5));
  }, []);

  // 키보드 이벤트
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case 'Escape':
          onClose();
          break;
        case 'r':
        case 'R':
          handleRotate();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToPrevious, goToNext, onClose, handleRotate]);

  // body 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !currentImage) return null;

  const showNavigation = images.length > 1;

  const content = (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* 닫기 버튼 */}
      <button
        className="absolute top-4 right-4 z-[10000] bg-black/60 hover:bg-black/80 text-white rounded-full h-12 w-12 flex items-center justify-center transition-colors"
        onClick={onClose}
      >
        <X className="h-7 w-7" />
      </button>

      {/* 이미지 카운터 */}
      {showNavigation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[10000] bg-black/60 text-white px-4 py-2 rounded-full text-base font-medium">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* 이전 버튼 */}
      {showNavigation && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 z-[10000] bg-black/60 hover:bg-black/80 text-white rounded-full h-16 w-16 flex items-center justify-center transition-colors shadow-xl"
          onClick={goToPrevious}
        >
          <ChevronLeft className="h-12 w-12" />
        </button>
      )}

      {/* 다음 버튼 */}
      {showNavigation && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 z-[10000] bg-black/60 hover:bg-black/80 text-white rounded-full h-16 w-16 flex items-center justify-center transition-colors shadow-xl"
          onClick={goToNext}
        >
          <ChevronRight className="h-12 w-12" />
        </button>
      )}

      {/* 컨트롤 바 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-2 bg-black/60 rounded-full px-4 py-2">
        <button
          className="text-white hover:bg-white/20 h-10 w-10 rounded-full flex items-center justify-center disabled:opacity-50 transition-colors"
          onClick={handleZoomOut}
          disabled={zoom <= 0.5}
        >
          <ZoomOut className="h-6 w-6" />
        </button>
        <span className="text-white text-sm min-w-[3.5rem] text-center font-medium">
          {Math.round(zoom * 100)}%
        </span>
        <button
          className="text-white hover:bg-white/20 h-10 w-10 rounded-full flex items-center justify-center disabled:opacity-50 transition-colors"
          onClick={handleZoomIn}
          disabled={zoom >= 3}
        >
          <ZoomIn className="h-6 w-6" />
        </button>
        <div className="w-px h-6 bg-white/30 mx-1" />
        <button
          className="text-white hover:bg-white/20 h-10 w-10 rounded-full flex items-center justify-center transition-colors"
          onClick={handleRotate}
          title="회전 (R)"
        >
          <RotateCw className="h-6 w-6" />
        </button>
        {/* 편집 모드에서 회전 저장 버튼 */}
        {!readOnly && onRotate && localRotation !== 0 && (
          <button
            className="text-white hover:bg-white/20 px-3 py-1 rounded-full text-sm transition-colors"
            onClick={handleSaveRotation}
          >
            회전 저장
          </button>
        )}
      </div>

      {/* 이미지 */}
      <div
        className="flex items-center justify-center"
        style={{
          width: 'calc(100vw - 160px)',
          height: 'calc(100vh - 120px)',
        }}
      >
        <img
          src={currentImage.url}
          alt={`이미지 ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain transition-transform duration-300"
          style={{
            transform: `rotate(${totalRotation}deg) scale(${zoom})`,
          }}
          draggable={false}
        />
      </div>

      {/* 썸네일 네비게이션 (이미지 3개 이상일 때) */}
      {images.length >= 3 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[10000] flex gap-2 bg-black/60 rounded-lg p-2 max-w-[80vw] overflow-x-auto">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentIndex(idx);
                setLocalRotation(0);
                setZoom(1);
              }}
              className={cn(
                "w-14 h-14 rounded overflow-hidden flex-shrink-0 border-2 transition-colors",
                idx === currentIndex
                  ? "border-white"
                  : "border-transparent hover:border-white/50"
              )}
            >
              <img
                src={img.url}
                alt={`썸네일 ${idx + 1}`}
                className="w-full h-full object-cover"
                style={{
                  transform: `rotate(${img.rotation || 0}deg)`,
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}

// 단일 이미지용 간단한 뷰어
interface SimpleImageViewerProps {
  imageUrl: string | null;
  rotation?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function SimpleImageViewer({
  imageUrl,
  rotation = 0,
  isOpen,
  onClose
}: SimpleImageViewerProps) {
  if (!imageUrl) return null;

  return (
    <ImageViewer
      images={[{ url: imageUrl, rotation }]}
      isOpen={isOpen}
      onClose={onClose}
      readOnly={true}
    />
  );
}

export default ImageViewer;
