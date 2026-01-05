import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Site = '아산' | '화성' | '전체';

interface SiteState {
  site: Site;
  setSite: (site: Site) => void;
  // 사용자 로그인 시 site 초기화 (비관리자는 user.site 강제 적용)
  initSiteFromUser: (userSite: string | null | undefined, isAdmin: boolean) => void;
}

export const useSite = create<SiteState>()(
  persist(
    (set) => ({
      site: '아산', // Default to 아산 site
      setSite: (site) => set({ site }),
      initSiteFromUser: (userSite, isAdmin) => {
        // 비관리자이고 user.site가 있으면 강제로 해당 사이트로 설정
        if (!isAdmin && userSite && (userSite === '아산' || userSite === '화성')) {
          set({ site: userSite as Site });
        }
      },
    }),
    {
      name: 'site-storage', // localStorage key
    }
  )
);
