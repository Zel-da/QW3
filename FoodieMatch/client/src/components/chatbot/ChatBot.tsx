import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { ChatButton } from './ChatButton';
import { ChatWindow } from './ChatWindow';
import { ChatMessage, ChatMessageType } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { QuickActions } from './QuickActions';
import { findFAQMatch, getQuickQuestions, FAQItem } from './faqData';

// 초기 인사 메시지
const WELCOME_MESSAGE: ChatMessageType = {
  id: 'welcome',
  type: 'bot',
  content: '안녕하세요! 안전관리 시스템 도우미입니다.\n궁금한 점을 물어보시거나, 아래 자주 묻는 질문을 선택해주세요.',
  timestamp: new Date(),
};

// 매칭 실패 시 기본 응답
const DEFAULT_RESPONSE = '죄송합니다. 해당 질문에 대한 답변을 찾지 못했습니다.\n다른 키워드로 다시 질문해주시거나, 자주 묻는 질문을 선택해주세요.';

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageType[]>([WELCOME_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

    // 타이핑 표시
    setIsTyping(true);

    // FAQ 매칭 시도
    await new Promise((resolve) => setTimeout(resolve, 500)); // 자연스러운 딜레이

    const match = findFAQMatch(text, user?.role);

    let botResponse: ChatMessageType;

    if (match) {
      botResponse = {
        id: `bot-${Date.now()}`,
        type: 'bot',
        content: match.answer,
        actions: match.navigateTo
          ? [{ label: '해당 페이지로 이동', path: match.navigateTo }]
          : undefined,
        timestamp: new Date(),
      };
    } else {
      botResponse = {
        id: `bot-${Date.now()}`,
        type: 'bot',
        content: DEFAULT_RESPONSE,
        timestamp: new Date(),
      };
    }

    setIsTyping(false);
    setMessages((prev) => [...prev, botResponse]);
  }, [user?.role]);

  // 페이지 네비게이션
  const handleNavigate = useCallback((path: string) => {
    setIsOpen(false);
    navigate(path);
  }, [navigate]);

  // 빠른 질문 선택
  const handleQuickQuestion = useCallback((question: string) => {
    handleSend(question);
  }, [handleSend]);

  // 대화 초기화
  const resetChat = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
  }, []);

  // 로그인 상태 변경 시 대화 초기화
  useEffect(() => {
    resetChat();
  }, [user?.id, resetChat]);

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
        <ChatInput onSend={handleSend} disabled={isTyping} />
      </ChatWindow>
    </>
  );
}
