/**
 * 사용자용 문제 해결 가이드.
 *
 * 흔한 증상별 원인·해결 안내 + 즉시 실행 가능한 캐시 삭제 버튼.
 * ProfilePage와 AppErrorBanner에서 진입.
 */
import { useState } from 'react';
import { Link } from 'wouter';
import { Header } from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/hooks/useConfirm';
import { resetAppCache, reloadWithNoCache } from '@/lib/cacheReset';
import { isIOSStandalone, isIOS, hasMediaDevicesSupport } from '@/lib/deviceDetect';
import {
  ArrowLeft, RefreshCw, Loader2, Mic, Save, Wifi, Smartphone,
  Tablet, AlertTriangle, HelpCircle,
} from 'lucide-react';

export default function TroubleshootingPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [isResettingCache, setIsResettingCache] = useState(false);

  const handleResetCache = async () => {
    const ok = await confirm({
      title: '앱 캐시 삭제',
      description: '앱의 저장된 코드 캐시를 삭제하고 새로 로드합니다.\n\n' +
        '· 로그인 세션·작성 중인 TBM·녹음 데이터는 유지됩니다.\n' +
        '· 실행 후 페이지가 자동으로 새로고침됩니다.',
      confirmText: '실행',
    });
    if (!ok) return;
    setIsResettingCache(true);
    try {
      const result = await resetAppCache();
      toast({
        title: '캐시 삭제 완료',
        description: `삭제된 캐시 ${result.cachesDeleted}개. 잠시 후 새로 로드합니다.`,
      });
      setTimeout(() => reloadWithNoCache(), 800);
    } catch (e: any) {
      toast({ title: '캐시 삭제 실패', description: e?.message || '다시 시도해주세요.', variant: 'destructive' });
      setIsResettingCache(false);
    }
  };

  const iosStandalone = isIOSStandalone();
  const ios = isIOS();
  const mediaSupported = hasMediaDevicesSupport();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-3xl p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link href="/profile" className="hover:text-foreground transition-colors">내 정보</Link>
              <span>·</span>
              <span className="text-foreground">문제 해결 가이드</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-primary" />
              문제 해결 가이드
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              자주 발생하는 문제와 해결 방법을 안내합니다. 대부분의 문제는 아래 [캐시 삭제] 한 번으로 해결됩니다.
            </p>
          </div>
        </div>

        {/* 즉시 실행 카드 */}
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              먼저 이것부터 시도해보세요
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              화면이 이상하거나 최신 버전이 안 보이거나 버튼이 반응하지 않을 때, 대부분 <strong>앱 캐시 삭제</strong>로 해결됩니다.
            </p>
            <Button onClick={handleResetCache} disabled={isResettingCache} className="gap-2">
              {isResettingCache ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 삭제 중...</>
              ) : (
                <><RefreshCw className="w-4 h-4" /> 앱 캐시 삭제 후 새로 로드</>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              작성 중인 TBM·녹음·로그인 세션은 유지됩니다.
            </p>
          </CardContent>
        </Card>

        {/* 현재 환경 상태 (진단 도움) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              내 환경
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-1 font-mono text-muted-foreground">
              <div>iOS 기기: {ios ? '예' : '아니오'}</div>
              <div>홈 화면 앱: {iosStandalone ? '예 (Safari에서 직접 접속 권장)' : '아니오'}</div>
              <div>마이크 API: {mediaSupported ? '지원됨' : '지원 안 됨 (녹음 불가)'}</div>
              <div className="truncate">브라우저: {typeof navigator !== 'undefined' ? navigator.userAgent : '-'}</div>
            </div>
          </CardContent>
        </Card>

        {/* 증상별 안내 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">증상별 해결 방법</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {/* 녹음 문제 */}
              <AccordionItem value="recording-timer">
                <AccordionTrigger className="text-left gap-2">
                  <span className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-red-500" />
                    녹음 시간이 멈추거나 버튼이 반응 안 함
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium mb-1">가장 흔한 원인</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>다른 앱이 마이크를 사용 중 (카메라·통화 등)</li>
                      <li>같은 계정으로 다른 브라우저·탭에서 접속</li>
                      <li>기기 배터리 20% 이하 (백그라운드 제한)</li>
                      <li>브라우저 캐시 오염 (이전 버전 코드 실행 중)</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1">해결 순서</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>상단 빨간 배너에 "예기치 않게 중단" 뜨면 [이어서 녹음] 클릭</li>
                      <li>화면에서 녹음 상태(빨강/노랑) 확인 후 [일시정지] 또는 [TBM에 저장]</li>
                      <li>계속 이상하면 위 [캐시 삭제] 버튼 실행</li>
                      <li>그래도 안 되면 브라우저 완전 종료 → 재접속 → 다시 시도</li>
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* 저장 실패 */}
              <AccordionItem value="save-fail">
                <AccordionTrigger className="text-left gap-2">
                  <span className="flex items-center gap-2">
                    <Save className="w-4 h-4 text-green-600" />
                    녹음 저장이 실패하거나 시간이 오래 걸림
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium mb-1">원인</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>인터넷 속도 느림 (특히 4G 약전계)</li>
                      <li>Wi-Fi ↔ 4G 전환 중 세션 끊김</li>
                      <li>서버 일시 지연</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1">해결 순서</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>상단 배너의 업로드 진행률(%) 확인 — 움직이면 정상 진행 중</li>
                      <li>실패 시 "저장 재시도" 버튼 클릭 (녹음 데이터는 유지됨)</li>
                      <li>Wi-Fi 신호 좋은 곳으로 이동 후 재시도</li>
                      <li>60분 이내 녹음은 정상 저장 가능. 그 이상은 나눠서 녹음 권장</li>
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* 앱 갱신 안 됨 */}
              <AccordionItem value="stale-app">
                <AccordionTrigger className="text-left gap-2">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-blue-600" />
                    최신 기능·수정이 안 보임 (오래된 화면)
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    브라우저가 이전 버전 코드를 캐시로 계속 사용하는 경우입니다.
                  </p>
                  <div>
                    <p className="font-medium mb-1">해결 순서</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>위 [캐시 삭제] 버튼 실행 (가장 확실)</li>
                      <li>또는 브라우저에서 <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+Shift+R</kbd> (Mac: <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Cmd+Shift+R</kbd>)</li>
                      <li>모바일: 브라우저 설정 → 방문 기록·캐시 삭제 후 재접속</li>
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* iOS 홈 화면 앱 */}
              <AccordionItem value="ios-standalone">
                <AccordionTrigger className="text-left gap-2">
                  <span className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-gray-600" />
                    아이폰·아이패드 홈 화면 앱에서 녹음이 안 됨
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    iOS 정책상 홈 화면 앱은 마이크 접근이 제한될 수 있습니다.
                  </p>
                  <div>
                    <p className="font-medium mb-1">해결 방법 (하나만 선택)</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li><strong>Safari 브라우저에서 직접 접속</strong> (가장 권장) — 홈 화면 앱 대신 Safari 앱 실행 후 tbm-0nu9.onrender.com 입력</li>
                      <li>홈 화면 앱 삭제 후 재추가 — Safari에서 접속 → 공유 → "홈 화면에 추가"</li>
                      <li>iOS 업데이트 — iOS 16.4 이상부터 홈 화면 앱에서도 마이크 사용 가능</li>
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* 갤럭시 탭 */}
              <AccordionItem value="galaxy-tab">
                <AccordionTrigger className="text-left gap-2">
                  <span className="flex items-center gap-2">
                    <Tablet className="w-4 h-4 text-gray-600" />
                    갤럭시 탭·삼성 태블릿에서 녹음이 자주 끊김
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    삼성 One UI 배터리 최적화가 Chrome 백그라운드 작업을 억제할 수 있습니다.
                  </p>
                  <div>
                    <p className="font-medium mb-1">설정 변경 (한 번만 하면 됨)</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>설정 → 앱 → Chrome → 배터리 → <strong>제한 없음</strong>으로 변경</li>
                      <li>설정 → 디스플레이 → 화면 자동 꺼짐 → <strong>10분 이상</strong>으로 변경</li>
                      <li>녹음 중엔 카메라·통화 등 다른 앱 실행 금지</li>
                      <li>같은 계정으로 다른 곳(웹 브라우저·PC) 동시 접속 금지</li>
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* 로그인 문제 */}
              <AccordionItem value="login">
                <AccordionTrigger className="text-left gap-2">
                  <span className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-purple-600" />
                    로그인이 자꾸 풀리거나 401 오류
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium mb-1">원인</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>서버 재배포로 세션 초기화 (드물지만 발생 가능)</li>
                      <li>4시간 무활동 시 자동 로그아웃 (설계상)</li>
                      <li>브라우저 쿠키 차단 설정</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1">해결</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>재로그인</li>
                      <li>브라우저 설정에서 tbm-0nu9.onrender.com 쿠키 허용 확인</li>
                      <li>비밀번호 잊음: 로그인 화면 [비밀번호 찾기]</li>
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* 관리자 연락 */}
              <AccordionItem value="contact">
                <AccordionTrigger className="text-left gap-2">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    위 방법으로 안 되면
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    담당자에게 문의하실 때 다음 정보를 함께 전달해주시면 빠른 해결에 도움이 됩니다.
                  </p>
                  <div>
                    <p className="font-medium mb-1">전달할 정보</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>기기 종류·모델 (예: 갤럭시 탭 S7, iPhone 14)</li>
                      <li>OS 버전 (설정 → 정보 → 소프트웨어 버전)</li>
                      <li>브라우저 종류 (Chrome, Safari, 삼성 인터넷 등)</li>
                      <li>문제 발생 상황 (녹음 중 / 저장 시 / 페이지 열 때 등)</li>
                      <li>화면에 뜬 오류 메시지·토스트 <strong>스크린샷</strong></li>
                      <li>이 페이지의 "내 환경" 정보 스크린샷</li>
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Link href="/profile">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              내 정보로 돌아가기
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
