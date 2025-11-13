import { useSite, type Site } from '@/hooks/use-site';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';

const SITES: Site[] = ['아산', '화성'];

interface SiteSelectorProps {
  className?: string;
}

export function SiteSelector({ className = '' }: SiteSelectorProps) {
  const { site, setSite } = useSite();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <MapPin className="h-4 w-4 text-muted-foreground" />
      <div className="flex gap-1 bg-muted/30 rounded-md p-1">
        {SITES.map((s) => (
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
