import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Site = '아산' | '화성' | '전체';

interface SiteState {
  site: Site;
  setSite: (site: Site) => void;
}

export const useSite = create<SiteState>()(
  persist(
    (set) => ({
      site: '아산', // Default to 아산 site
      setSite: (site) => set({ site }),
    }),
    {
      name: 'site-storage', // localStorage key
    }
  )
);
