import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ExternalLink, Bot, User } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line
} from 'recharts';

// 차트 데이터 타입
export interface ChartData {
  type: 'bar' | 'pie' | 'line';
  title?: string;
  data: Array<{ name: string; value: number; [key: string]: any }>;
  dataKey?: string;
}

export interface ChatMessageType {
  id: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  actions?: { label: string; path: string }[];
  chart?: ChartData;
  timestamp: Date;
}

interface ChatMessageProps {
  message: ChatMessageType;
  onNavigate: (path: string) => void;
}

// 차트 색상
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// 마크다운 테이블 스타일
const markdownComponents = {
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full text-xs border-collapse">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-muted/50">{children}</thead>
  ),
  th: ({ children }: any) => (
    <th className="border border-border px-2 py-1 text-left font-semibold">{children}</th>
  ),
  td: ({ children }: any) => (
    <td className="border border-border px-2 py-1">{children}</td>
  ),
  tr: ({ children }: any) => (
    <tr className="even:bg-muted/30">{children}</tr>
  ),
  p: ({ children }: any) => (
    <p className="mb-1 last:mb-0">{children}</p>
  ),
  ul: ({ children }: any) => (
    <ul className="list-disc list-inside my-1 space-y-0.5">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal list-inside my-1 space-y-0.5">{children}</ol>
  ),
  li: ({ children }: any) => (
    <li className="text-sm">{children}</li>
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold">{children}</strong>
  ),
  code: ({ children }: any) => (
    <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>
  ),
};

// 차트 컴포넌트
function ChatChart({ chart }: { chart: ChartData }) {
  if (!chart.data || chart.data.length === 0) return null;

  const dataKey = chart.dataKey || 'value';

  return (
    <div className="mt-2 p-2 bg-background/50 rounded-lg">
      {chart.title && (
        <p className="text-xs font-semibold mb-2 text-center">{chart.title}</p>
      )}
      <ResponsiveContainer width="100%" height={180}>
        {chart.type === 'bar' ? (
          <BarChart data={chart.data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Bar dataKey={dataKey} fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : chart.type === 'pie' ? (
          <PieChart>
            <Pie
              data={chart.data}
              dataKey={dataKey}
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={60}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {chart.data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 11 }} />
          </PieChart>
        ) : (
          <LineChart data={chart.data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey={dataKey} stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function ChatMessage({ message, onNavigate }: ChatMessageProps) {
  const isBot = message.type === 'bot' || message.type === 'system';

  // 마크다운 컨텐츠 메모이제이션
  const renderedContent = useMemo(() => {
    if (!isBot) {
      return <p className="text-sm whitespace-pre-wrap">{message.content}</p>;
    }

    return (
      <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    );
  }, [message.content, isBot]);

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
          "max-w-[85%] rounded-2xl px-4 py-2.5",
          isBot
            ? "bg-muted text-foreground rounded-tl-sm"
            : "bg-primary text-primary-foreground rounded-tr-sm"
        )}
      >
        {renderedContent}

        {/* 차트 렌더링 */}
        {message.chart && <ChatChart chart={message.chart} />}

        {/* 액션 버튼 */}
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
