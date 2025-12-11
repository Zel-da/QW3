import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { ChatButton } from './ChatButton';
import { ChatWindow } from './ChatWindow';
import { ChatMessage, ChatMessageType, ChartData } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { QuickActions } from './QuickActions';
import { getQuickQuestions, FAQItem } from './faqData';

// 초기 인사 메시지
const WELCOME_MESSAGE: ChatMessageType = {
  id: 'welcome',
  type: 'bot',
  content: '안녕하세요! 저는 "안전이"입니다. 🦺\n안전관리 시스템에 대해 무엇이든 물어보세요!\n이전 대화 내용도 기억하고 있어요.',
  timestamp: new Date(),
};

// 스트리밍 사용 여부
const USE_STREAMING = true;

// 세션 ID 생성
const generateSessionId = () => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageType[]>([WELCOME_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => generateSessionId());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // 빠른 질문 목록
  const quickQuestions = getQuickQuestions(user?.role);

  // 스크롤 하단으로 이동
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 스트리밍 AI API 호출
  const askAIStream = async (question: string, botMessageId: string): Promise<ChartData | undefined> => {
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chatbot/ask-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, sessionId }),
        credentials: 'include',
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let accumulatedText = '';
      let chart: ChartData | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.text) {
                accumulatedText += parsed.text;
                // 메시지 업데이트 (스트리밍 중)
                setMessages(prev => prev.map(msg =>
                  msg.id === botMessageId
                    ? { ...msg, content: accumulatedText }
                    : msg
                ));
              }

              if (parsed.done && parsed.chart) {
                chart = parsed.chart;
              }

              if (parsed.sessionId) {
                setSessionId(parsed.sessionId);
              }
            } catch (e) {
              // JSON 파싱 실패 무시
            }
          }
        }
      }

      return chart;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream aborted');
        return undefined;
      }
      console.error('Stream error:', error);
      throw error;
    }
  };

  // 일반 AI API 호출 (폴백용)
  const askAI = async (question: string): Promise<{ answer: string; chart?: ChartData }> => {
    try {
      const response = await axios.post('/api/chatbot/ask', { question, sessionId });
      if (response.data.sessionId) {
        setSessionId(response.data.sessionId);
      }
      return {
        answer: response.data.answer,
        chart: response.data.chart || undefined
      };
    } catch (error: any) {
      console.error('AI API error:', error);
      return {
        answer: error.response?.data?.answer || '죄송합니다. 일시적인 오류가 발생했습니다.'
      };
    }
  };

  // 메시지 전송 처리
  const handleSend = useCallback(async (text: string) => {
    // 사용자 메시지 추가
    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // AI 응답 처리 (FAQ는 서버 AI가 참고하여 문맥에 맞게 답변)
    const botMessageId = `bot-${Date.now()}`;

    if (USE_STREAMING) {
      // 스트리밍 모드
      setIsStreaming(true);

      // 빈 봇 메시지 먼저 추가
      const initialBotMessage: ChatMessageType = {
        id: botMessageId,
        type: 'bot',
        content: '',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, initialBotMessage]);

      try {
        const chart = await askAIStream(text, botMessageId);

        // 차트가 있으면 최종 메시지에 추가
        if (chart) {
          setMessages(prev => prev.map(msg =>
            msg.id === botMessageId
              ? { ...msg, chart }
              : msg
          ));
        }
      } catch (error) {
        // 스트리밍 실패 시 에러 메시지
        setMessages(prev => prev.map(msg =>
          msg.id === botMessageId
            ? { ...msg, content: '죄송합니다. 응답 중 오류가 발생했습니다. 다시 시도해주세요.' }
            : msg
        ));
      }

      setIsStreaming(false);
    } else {
      // 일반 모드 (폴백)
      setIsTyping(true);

      const aiResult = await askAI(text);
      const botResponse: ChatMessageType = {
        id: botMessageId,
        type: 'bot',
        content: aiResult.answer,
        chart: aiResult.chart,
        timestamp: new Date(),
      };

      setIsTyping(false);
      setMessages((prev) => [...prev, botResponse]);
    }
  }, [user?.role, sessionId]);

  // 페이지 네비게이션
  const handleNavigate = useCallback((path: string) => {
    setIsOpen(false);
    navigate(path);
  }, [navigate]);

  // 빠른 질문 선택
  const handleQuickQuestion = useCallback((question: string) => {
    handleSend(question);
  }, [handleSend]);

  // 피드백 처리 (서버에 저장 가능)
  const handleFeedback = useCallback((messageId: string, feedback: 'like' | 'dislike') => {
    // 로컬 상태 업데이트
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, feedback } : msg
    ));
    // TODO: 서버에 피드백 저장 (향후 AI 개선용)
    console.log(`Feedback for ${messageId}: ${feedback}`);
  }, []);

  // 관련 질문 클릭 처리
  const handleSuggestedQuestion = useCallback((question: string) => {
    handleSend(question);
  }, [handleSend]);

  // 대화 초기화 (서버 히스토리도 함께)
  const resetChat = useCallback(async () => {
    // 진행 중인 스트리밍 중단
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 서버 측 히스토리 초기화 (로그인 상태에서만)
    if (user) {
      try {
        await axios.post('/api/chatbot/reset', { sessionId });
      } catch (e) {
        // 실패해도 클라이언트는 초기화
      }
    }

    // 새 세션 ID 생성
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    setMessages([WELCOME_MESSAGE]);
    setIsTyping(false);
    setIsStreaming(false);
  }, [sessionId, user]);

  // 로그인 상태 변경 시 대화 초기화
  useEffect(() => {
    resetChat();
  }, [user?.id]);

  // 컴포넌트 언마운트 시 스트림 정리
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <>
      <ChatButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} />

      <ChatWindow isOpen={isOpen} onClose={() => setIsOpen(false)}>
        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onNavigate={handleNavigate}
              onFeedback={handleFeedback}
              onSuggestedQuestion={handleSuggestedQuestion}
            />
          ))}

          {/* 타이핑 인디케이터 */}
          {isTyping && (
            <div className="flex gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs">...</span>
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 빠른 질문 */}
        {messages.length <= 2 && (
          <QuickActions
            questions={quickQuestions}
            onSelect={handleQuickQuestion}
          />
        )}

        {/* 입력 영역 */}
        <ChatInput onSend={handleSend} disabled={isTyping || isStreaming} />
      </ChatWindow>
    </>
  );
}
