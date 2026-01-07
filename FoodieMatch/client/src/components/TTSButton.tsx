import React from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, Pause, Square, Play } from 'lucide-react';
import { useTTS } from '@/hooks/useTTS';

interface TTSButtonProps {
  text: string;
  size?: 'sm' | 'default' | 'icon';
  showStopButton?: boolean;
  className?: string;
}

/**
 * TTS (Text-to-Speech) 버튼 컴포넌트
 * - 재생/일시정지/정지 기능
 * - 한국어 음성 지원
 */
export function TTSButton({
  text,
  size = 'icon',
  showStopButton = false,
  className = ''
}: TTSButtonProps) {
  const { speak, togglePause, stop, isSpeaking, isPaused, isSupported } = useTTS();

  // 브라우저가 TTS를 지원하지 않으면 렌더링하지 않음
  if (!isSupported) return null;

  const handleClick = () => {
    if (!isSpeaking) {
      speak(text);
    } else {
      togglePause();
    }
  };

  const getIcon = () => {
    if (!isSpeaking) {
      return <Volume2 className="h-4 w-4" />;
    }
    if (isPaused) {
      return <Play className="h-4 w-4" />;
    }
    return <Pause className="h-4 w-4" />;
  };

  const getTitle = () => {
    if (!isSpeaking) return '음성으로 듣기';
    if (isPaused) return '재생 계속';
    return '일시정지';
  };

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <Button
        type="button"
        variant="ghost"
        size={size}
        onClick={handleClick}
        title={getTitle()}
        className="h-8 w-8 p-0"
      >
        {getIcon()}
      </Button>

      {showStopButton && isSpeaking && (
        <Button
          type="button"
          variant="ghost"
          size={size}
          onClick={stop}
          title="정지"
          className="h-8 w-8 p-0"
        >
          <Square className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/**
 * 인라인 TTS 버튼 (텍스트와 함께 표시)
 */
interface TTSTextProps {
  children: React.ReactNode;
  text?: string;
  className?: string;
}

export function TTSText({ children, text, className = '' }: TTSTextProps) {
  // text prop이 없으면 children의 텍스트 컨텐츠 사용
  const textToSpeak = text || (typeof children === 'string' ? children : '');

  return (
    <div className={`flex items-start gap-2 ${className}`}>
      <TTSButton text={textToSpeak} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
