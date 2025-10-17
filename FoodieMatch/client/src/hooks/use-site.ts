import { create } from 'zustand';

export type Site = 'Asan' | 'Hwaseong';

interface SiteState {
  site: Site;
  setSite: (site: Site) => void;
}

export const useSite = create<SiteState>((set) => ({
  site: 'Asan', // Default site
  setSite: (site) => set({ site }),
}));
