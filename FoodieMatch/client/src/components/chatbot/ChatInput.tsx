import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Send, Command, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// 슬래시 커맨드 정의
interface SlashCommand {
  command: string;
  label: string;
  description: string;
  action: string; // 실행할 질문/명령
}

const SLASH_COMMANDS: SlashCommand[] = [
  { command: '/법규', label: '법규 검색', description: '산업안전보건법 관련 질문', action: '산업안전보건법에 대해 알려주세요' },
  { command: '/교육', label: '교육 안내', description: '안전교육 관련 정보', action: '안전교육 시간과 종류에 대해 알려주세요' },
  { command: '/tbm', label: 'TBM 안내', description: 'TBM 작성 방법', action: 'TBM은 어떻게 작성하나요?' },
  { command: '/점검', label: '점검 안내', description: '안전점검 방법', action: '안전점검은 어떻게 하나요?' },
  { command: '/보호구', label: '보호구 기준', description: 'PPE 착용 기준', action: '개인보호구 착용 기준을 알려주세요' },
  { command: '/추락', label: '추락 예방', description: '추락재해 예방 기준', action: '추락재해 예방 기준은 무엇인가요?' },
  { command: '/전기', label: '전기 안전', description: '전기작업 안전', action: '전기작업 안전기준은 무엇인가요?' },
  { command: '/밀폐', label: '밀폐공간', description: '밀폐공간 작업 주의사항', action: '밀폐공간 작업 시 주의사항은?' },
  { command: '/산재', label: '산재 보고', description: '산업재해 발생 시 조치', action: '산업재해 발생 시 어떻게 해야 하나요?' },
  { command: '/도움말', label: '도움말', description: '챗봇 사용법', action: '안전이가 할 수 있는 것들을 알려주세요' },
];

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder = "질문을 입력하세요... ( / 로 빠른 명령)" }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [showCommands, setShowCommands] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<SlashCommand[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const commandListRef = useRef<HTMLDivElement>(null);

  // 입력값 변경 시 슬래시 커맨드 필터링
  useEffect(() => {
    if (value.startsWith('/')) {
      const query = value.toLowerCase();
      const filtered = SLASH_COMMANDS.filter(cmd =>
        cmd.command.toLowerCase().startsWith(query) ||
        cmd.label.includes(query.slice(1))
      );
      setFilteredCommands(filtered);
      setShowCommands(filtered.length > 0);
      setSelectedIndex(0);
    } else {
      setShowCommands(false);
    }
  }, [value]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (trimmed) {
      // 슬래시 커맨드인 경우 해당 액션 실행
      if (trimmed.startsWith('/')) {
        const cmd = SLASH_COMMANDS.find(c => c.command === trimmed);
        if (cmd) {
          onSend(cmd.action);
          setValue('');
          setShowCommands(false);
          return;
        }
      }
      onSend(trimmed);
      setValue('');
      setShowCommands(false);
    }
  };

  const handleCommandSelect = (command: SlashCommand) => {
    onSend(command.action);
    setValue('');
    setShowCommands(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (showCommands) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          handleCommandSelect(filteredCommands[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowCommands(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative">
      {/* 슬래시 커맨드 목록 */}
      {showCommands && (
        <div
          ref={commandListRef}
          className="absolute bottom-full left-0 right-0 mb-1 mx-3 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto z-50"
        >
          <div className="p-2 border-b bg-muted/50">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Zap className="h-3 w-3" />
              <span>빠른 명령어</span>
            </div>
          </div>
          <div className="py-1">
            {filteredCommands.map((cmd, idx) => (
              <button
                key={cmd.command}
                onClick={() => handleCommandSelect(cmd)}
                className={cn(
                  "w-full px-3 py-2 flex items-center gap-3 text-left transition-colors",
                  idx === selectedIndex ? "bg-primary/10" : "hover:bg-muted"
                )}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                  <Command className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-primary">{cmd.command}</span>
                    <span className="text-sm font-medium">{cmd.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{cmd.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 입력 영역 */}
      <div className="flex gap-2 p-3 border-t bg-background">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1"
        />
        <Button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          size="icon"
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">전송</span>
        </Button>
      </div>
    </div>
  );
}
