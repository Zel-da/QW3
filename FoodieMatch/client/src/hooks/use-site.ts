import { create } from 'zustand';

export type Site = '아산' | '화성';

interface SiteState {
  site: Site;
  setSite: (site: Site) => void;
}

export const useSite = create<SiteState>((set) => ({
  site: '아산', // Default site
  setSite: (site) => set({ site }),
}));
