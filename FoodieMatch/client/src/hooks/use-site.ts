import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Site = '아산' | '화성' | '전체';

interface SiteState {
  site: Site;
  availableSites: Site[]; // 사용자가 접근 가능한 사이트 목록
  setSite: (site: Site) => void;
  // 사용자 로그인 시 site 초기화
  initSiteFromUser: (userSite: string | null | undefined, userSites: string[] | null | undefined, isAdmin: boolean) => void;
}

export const useSite = create<SiteState>()(
  persist(
    (set, get) => ({
      site: '아산', // Default to 아산 site
      availableSites: ['아산', '화성'], // 기본값: 모든 사이트
      setSite: (site) => {
        const { availableSites } = get();
        // 접근 가능한 사이트만 선택 가능
        if (site === '전체' || availableSites.includes(site)) {
          set({ site });
        }
      },
      initSiteFromUser: (userSite, userSites, isAdmin) => {
        // 관리자: 모든 사이트 접근 가능 (전체 포함)
        if (isAdmin) {
          set({ availableSites: ['전체', '아산', '화성'] });
          return;
        }

        // sites 문자열("아산,화성") 또는 배열을 파싱
        let parsedSites: string[] = [];
        if (typeof userSites === 'string') {
          parsedSites = userSites.split(',').map(s => s.trim()).filter(Boolean);
        } else if (Array.isArray(userSites)) {
          parsedSites = userSites;
        }

        // sites가 있으면 해당 사이트들만 접근 가능
        if (parsedSites.length > 0) {
          const validSites = parsedSites.filter(s => s === '아산' || s === '화성') as Site[];
          if (validSites.length > 0) {
            // 복수 사이트 접근 가능하면 '전체' 옵션 추가
            const sitesWithAll: Site[] = validSites.length > 1
              ? ['전체', ...validSites]
              : validSites;
            set({
              availableSites: sitesWithAll,
              // 현재 선택된 사이트가 접근 불가면 첫 번째 사이트로 변경
              site: sitesWithAll.includes(get().site) ? get().site : validSites[0]
            });
            return;
          }
        }

        // 단일 site만 있으면 해당 사이트만 접근 가능
        if (userSite && (userSite === '아산' || userSite === '화성')) {
          set({
            availableSites: [userSite as Site],
            site: userSite as Site
          });
        }
      },
    }),
    {
      name: 'site-storage', // localStorage key
    }
  )
);
