import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ExternalLink, Bot, User } from 'lucide-react';

export interface ChatMessageType {
  id: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  actions?: { label: string; path: string }[];
  timestamp: Date;
}

interface ChatMessageProps {
  message: ChatMessageType;
  onNavigate: (path: string) => void;
}

export function ChatMessage({ message, onNavigate }: ChatMessageProps) {
  const isBot = message.type === 'bot' || message.type === 'system';

  return (
    <div
      className={cn(
        "flex gap-2 mb-3",
        isBot ? "justify-start" : "justify-end"
      )}
    >
      {isBot && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5",
          isBot
            ? "bg-muted text-foreground rounded-tl-sm"
            : "bg-primary text-primary-foreground rounded-tr-sm"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {message.actions && message.actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.actions.map((action, idx) => (
              <Button
                key={idx}
                size="sm"
                variant="secondary"
                className="h-8 text-xs"
                onClick={() => onNavigate(action.path)}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {!isBot && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}
