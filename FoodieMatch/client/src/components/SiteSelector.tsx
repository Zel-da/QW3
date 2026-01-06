import { useSite, type Site } from '@/hooks/use-site';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';

interface SiteSelectorProps {
  className?: string;
}

export function SiteSelector({ className = '' }: SiteSelectorProps) {
  const { site, setSite, availableSites } = useSite();

  // 사이트가 1개만 접근 가능하면 선택 UI 숨김
  if (availableSites.length <= 1) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{site}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <MapPin className="h-4 w-4 text-muted-foreground" />
      <div className="flex gap-1 bg-muted/30 rounded-md p-1">
        {availableSites.map((s) => (
          <Button
            key={s}
            variant={site === s ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSite(s)}
            className={`px-3 py-1 h-8 text-sm transition-all ${
              site === s
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'hover:bg-muted'
            }`}
          >
            {s}
          </Button>
        ))}
      </div>
    </div>
  );
}
