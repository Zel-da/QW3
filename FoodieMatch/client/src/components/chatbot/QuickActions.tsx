import { Button } from '@/components/ui/button';
import { FAQItem } from './faqData';

interface QuickActionsProps {
  questions: FAQItem[];
  onSelect: (question: string) => void;
}

export function QuickActions({ questions, onSelect }: QuickActionsProps) {
  if (questions.length === 0) return null;

  return (
    <div className="p-3 border-t bg-muted/50">
      <p className="text-xs text-muted-foreground mb-2">자주 묻는 질문</p>
      <div className="flex flex-wrap gap-2">
        {questions.map((faq) => (
          <Button
            key={faq.id}
            variant="outline"
            size="sm"
            className="h-auto py-1.5 px-3 text-xs whitespace-normal text-left"
            onClick={() => onSelect(faq.question)}
          >
            {faq.question}
          </Button>
        ))}
      </div>
    </div>
  );
}
