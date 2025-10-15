--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (165f042)
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: Course; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public."Course" VALUES ('course-workplace-safety', '작업장 안전관리', '작업장에서의 기본적인 안전수칙과 위험요소 파악 방법을 학습합니다.', 'workplace-safety', 30, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', NULL, 'blue', 'shield', true);
INSERT INTO public."Course" VALUES ('course-hazard-prevention', '위험성 평가 및 예방', '작업장의 위험요소를 사전에 평가하고 예방하는 방법을 학습합니다.', 'hazard-prevention', 45, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', NULL, 'orange', 'alert-triangle', true);
INSERT INTO public."Course" VALUES ('course-tbm', 'TBM 활동 교육', 'Tool Box Meeting의 목적과 진행방법, 체크리스트 작성법을 학습합니다.', 'tbm', 25, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', NULL, 'green', 'clipboard-check', true);


--
-- Data for Name: Assessment; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public."Assessment" VALUES ('cdfa109e-02ae-4f5d-bb9d-267a682d6e11', 'course-workplace-safety', '작업장에서 안전모를 착용해야 하는 이유는 무엇인가요?', '["멋있어 보이기 위해","머리 부상 방지","규정이니까","더워도 참기 위해"]', 1, 'easy');
INSERT INTO public."Assessment" VALUES ('34077e01-8863-4d0f-b170-aa39527d839a', 'course-workplace-safety', '작업 중 위험상황 발견 시 가장 먼저 해야 할 행동은?', '["무시하고 작업 계속","작업 즉시 중단","퇴근 후 보고","사진 촬영"]', 1, 'medium');
INSERT INTO public."Assessment" VALUES ('9e01706d-a192-44a2-854e-fcd721d22d6f', 'course-hazard-prevention', '위험성 평가의 주요 목적은 무엇인가요?', '["작업 속도 향상","사고 예방","비용 절감","인원 감축"]', 1, 'easy');
INSERT INTO public."Assessment" VALUES ('09a2301e-6a87-415c-ae74-da1f644b1103', 'course-hazard-prevention', '위험요소 발견 시 조치 우선순위는?', '["제거 > 대체 > 공학적 대책 > 관리적 대책","관리적 대책 > 공학적 대책","대체 > 제거","아무거나"]', 0, 'hard');
INSERT INTO public."Assessment" VALUES ('178c52d7-5b71-4f1f-b217-cfb9ad7b0027', 'course-tbm', 'TBM의 주요 목적은 무엇인가요?', '["시간 때우기","작업 전 안전점검 및 공유","팀장 권위 세우기","휴식시간 확보"]', 1, 'easy');


--
-- Data for Name: Certificate; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: Teams; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public."Teams" VALUES (1, '조립 전기라인');
INSERT INTO public."Teams" VALUES (2, '제관라인');
INSERT INTO public."Teams" VALUES (3, '가공라인');
INSERT INTO public."Teams" VALUES (4, '연구소');
INSERT INTO public."Teams" VALUES (5, '지재/부품/출하');
INSERT INTO public."Teams" VALUES (6, '서비스');
INSERT INTO public."Teams" VALUES (7, '품질');
INSERT INTO public."Teams" VALUES (8, '인사총무팀');
INSERT INTO public."Teams" VALUES (9, '생산기술팀');


--
-- Data for Name: ChecklistTemplates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public."ChecklistTemplates" VALUES (1, '조립 전기라인 일일 안전점검', 1);
INSERT INTO public."ChecklistTemplates" VALUES (2, '제관라인 일일 안전점검', 2);
INSERT INTO public."ChecklistTemplates" VALUES (3, '가공라인 일일 안전점검', 3);
INSERT INTO public."ChecklistTemplates" VALUES (4, '연구소 일일 안전점검', 4);
INSERT INTO public."ChecklistTemplates" VALUES (5, '지재/부품/출하 일일 안전점검', 5);
INSERT INTO public."ChecklistTemplates" VALUES (6, '서비스 일일 안전점검', 6);
INSERT INTO public."ChecklistTemplates" VALUES (7, '품질 일일 안전점검', 7);
INSERT INTO public."ChecklistTemplates" VALUES (8, '인사총무팀 일일 안전점검', 8);
INSERT INTO public."ChecklistTemplates" VALUES (9, '생산기술팀 일일 안전점검', 9);


--
-- Data for Name: DailyReports; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public."DailyReports" VALUES (1, 1, '2025-09-16 05:20:03.24', '홍길동', '특이사항 없음');
INSERT INTO public."DailyReports" VALUES (2, 1, '2025-09-16 07:10:16.437', '홍길동', '특이사항 없음');
INSERT INTO public."DailyReports" VALUES (3, 1, '2025-09-16 07:10:25.467', '홍길동', '특이사항 없음ㅇ');
INSERT INTO public."DailyReports" VALUES (4, 1, '2025-09-22 07:46:01.471', '홍길동', '특이사항 없음');
INSERT INTO public."DailyReports" VALUES (5, 6, '2025-09-29 00:09:56.125', '홍길동', '특이사항 없음');
INSERT INTO public."DailyReports" VALUES (6, 8, '2025-10-14 01:32:03.696', '홍길동', '특이사항 없음');


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public."User" VALUES ('bc05127b-cff6-427f-b6ac-211903436dd4', 'admin', 'admin@safety.com', '$2b$10$eozA9N2H5a56IgyQtLPPpOrsPpzMJA.hx8Q96njW4aXClW.KabCzm', 'admin', '2025-10-14 01:45:07.002');
INSERT INTO public."User" VALUES ('9bf81ce2-f696-4053-b1d7-568624d79362', 'demouser', 'demo@safety.com', '$2b$10$eozA9N2H5a56IgyQtLPPpOrsPpzMJA.hx8Q96njW4aXClW.KabCzm', 'user', '2025-10-14 01:45:08.829');
INSERT INTO public."User" VALUES ('ff114024-abaf-464f-9997-2656ee446a9a', '안예준', 'a@a.com', '$2b$10$DexVyJziuSkbRMAt6401YOtzMoWeiEGg.HbjUd1tZHs/OVvL1xU9K', 'user', '2025-10-14 01:52:25.557');


--
-- Data for Name: Notice; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public."Notice" VALUES ('45b33c77-47cf-4a0e-878b-6c04d226593f', '2025년 안전교육 일정 안내', '2025년 1분기 안전교육 일정을 공지합니다. 모든 직원은 필수 안전교육을 이수해주시기 바랍니다.', 'bc05127b-cff6-427f-b6ac-211903436dd4', '2025-10-14 01:45:09.954', '2025-10-14 02:18:08.497392', true, 0, NULL, NULL, NULL);
INSERT INTO public."Notice" VALUES ('abb32247-784e-4c3a-bad3-43e172c0a4ed', 'TBM 체크리스트 작성 안내', '매일 작업 전 TBM 체크리스트를 작성하고 팀원 전원의 서명을 받아주시기 바랍니다.', 'bc05127b-cff6-427f-b6ac-211903436dd4', '2025-10-14 01:45:09.954', '2025-10-14 02:18:08.497392', true, 0, NULL, NULL, NULL);
INSERT INTO public."Notice" VALUES ('3340b20a-2c9c-47ae-8960-1bf51c35bd62', '안전보호구 착용 의무화', '작업장 내에서는 반드시 안전모, 안전화, 안전장갑을 착용해야 합니다.', 'bc05127b-cff6-427f-b6ac-211903436dd4', '2025-10-14 01:45:09.954', '2025-10-14 02:18:08.497392', true, 0, NULL, NULL, NULL);
INSERT INTO public."Notice" VALUES ('eb304428-b79d-479b-a9ba-00d3480c5939', '새로운 공지사항', '데이터를 유지하면서 추가된 공지사항입니다!', 'bc05127b-cff6-427f-b6ac-211903436dd4', '2025-10-14 02:19:53.889', '2025-10-14 02:19:53.889', true, 0, NULL, NULL, NULL);


--
-- Data for Name: TemplateItems; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public."TemplateItems" VALUES (1, 1, 'TBM 점검', '도입', '아침 체조 스트레칭', 10);
INSERT INTO public."TemplateItems" VALUES (2, 1, 'TBM 점검', '건강/복장/보호구', '음주상태', 20);
INSERT INTO public."TemplateItems" VALUES (3, 1, 'TBM 점검', '건강/복장/보호구', '건강상태', 30);
INSERT INTO public."TemplateItems" VALUES (4, 1, 'TBM 점검', '건강/복장/보호구', '복장', 40);
INSERT INTO public."TemplateItems" VALUES (5, 1, 'TBM 점검', '건강/복장/보호구', '보호구', 50);
INSERT INTO public."TemplateItems" VALUES (6, 1, 'TBM 점검', '지시', '생산회의', 60);
INSERT INTO public."TemplateItems" VALUES (7, 1, 'TBM 점검', '지시', '금일 안전작업 내용지시', 70);
INSERT INTO public."TemplateItems" VALUES (8, 1, '위험 평가 및 개선 대책', '위험예지훈련', '각 팀원 최근 아차사고 사례 공유', 80);
INSERT INTO public."TemplateItems" VALUES (9, 1, '위험 평가 및 개선 대책', '위험예지훈련', '작업장소 등 환경에 대한 위험', 90);
INSERT INTO public."TemplateItems" VALUES (10, 1, '위험 평가 및 개선 대책', '위험예지훈련', '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', 100);
INSERT INTO public."TemplateItems" VALUES (11, 1, '위험 평가 및 개선 대책', '위험예지훈련', '크레인, 리프트, 지게차 등 설비에 대한 위험', 110);
INSERT INTO public."TemplateItems" VALUES (12, 1, '위험 평가 및 개선 대책', '위험예지훈련', '작업장 개구부, 고소작업 등에 대한 위험', 120);
INSERT INTO public."TemplateItems" VALUES (13, 1, '위험 평가 및 개선 대책', '위험예지훈련', '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', 130);
INSERT INTO public."TemplateItems" VALUES (14, 1, '확인', '지적확인', '중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', 140);
INSERT INTO public."TemplateItems" VALUES (15, 1, '관리 감독자 일일 안전 점검', '공통', '설비, 기계, 기구 등 점검 후 조치', 150);
INSERT INTO public."TemplateItems" VALUES (16, 1, '관리 감독자 일일 안전 점검', '공통', '각 종 기계기구의 이상 유무', 160);
INSERT INTO public."TemplateItems" VALUES (17, 1, '관리 감독자 일일 안전 점검', '공통', '작업장 정리정돈, 통로확보 개구부 확인 점검결과', 170);
INSERT INTO public."TemplateItems" VALUES (18, 1, '관리 감독자 일일 안전 점검', '중량물취급작업 크레인', '올바른 자세, 복장 및 보호구착용 여부', 180);
INSERT INTO public."TemplateItems" VALUES (19, 1, '관리 감독자 일일 안전 점검', '중량물취급작업 크레인', '주행로 상측 및 트롤리가 횡행하는 레일, 와이어 통하는 곳의 상태', 190);
INSERT INTO public."TemplateItems" VALUES (20, 1, '관리 감독자 일일 안전 점검', '중량물취급작업 크레인', '권과방지장치ㆍ브레이크ㆍ클러치 및 운전장치의 기능', 200);
INSERT INTO public."TemplateItems" VALUES (21, 1, '관리 감독자 일일 안전 점검', '중량물취급작업 크레인', '슬링, 와이어로프등의 이상 유무 및 매달린 상태', 210);
INSERT INTO public."TemplateItems" VALUES (22, 1, '관리 감독자 일일 안전 점검', '중량물취급작업 크레인', '인양물 하부 작업 여부', 220);
INSERT INTO public."TemplateItems" VALUES (23, 1, '관리 감독자 일일 안전 점검', '지게차 하역운반기계', '안전벨트 착용 상태 및 작업장내 과속, 급선회, 급출발 등 이상유무', 230);
INSERT INTO public."TemplateItems" VALUES (24, 1, '관리 감독자 일일 안전 점검', '지게차 하역운반기계', '제동장치 및 조종장치, 하역장치 및 유압장치 기능의 이상유무', 240);
INSERT INTO public."TemplateItems" VALUES (25, 1, '관리 감독자 일일 안전 점검', '지게차 하역운반기계', '전조등ㆍ후미등ㆍ방향지시기 및 경보장치, 바퀴 기능의 이상유무', 250);
INSERT INTO public."TemplateItems" VALUES (26, 1, '관리 감독자 일일 안전 점검', '위험작업조치', '고소작업시 안전모 착용, 안전고리 체결 유무', 260);
INSERT INTO public."TemplateItems" VALUES (27, 1, '관리 감독자 일일 안전 점검', '위험작업조치', '용접,용단,연마 , 절단작업시 소화기구, 비산 방지, 환기 조치여부', 270);
INSERT INTO public."TemplateItems" VALUES (28, 1, '관리 감독자 일일 안전 점검', '위험작업조치', '통전 전류, 접지 상태, 가스, 유해물질 등 작업환경 점검', 280);
INSERT INTO public."TemplateItems" VALUES (29, 1, '인원관리', '시작/종료', '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', 290);
INSERT INTO public."TemplateItems" VALUES (30, 2, 'TBM 점검', '도입', '아침 체조 스트레칭', 10);
INSERT INTO public."TemplateItems" VALUES (31, 2, 'TBM 점검', '건강/복장/보호구', '음주상태', 20);
INSERT INTO public."TemplateItems" VALUES (32, 2, 'TBM 점검', '건강/복장/보호구', '건강상태', 30);
INSERT INTO public."TemplateItems" VALUES (33, 2, 'TBM 점검', '건강/복장/보호구', '복장', 40);
INSERT INTO public."TemplateItems" VALUES (34, 2, 'TBM 점검', '건강/복장/보호구', '보호구', 50);
INSERT INTO public."TemplateItems" VALUES (35, 2, 'TBM 점검', '지시', '생산회의', 60);
INSERT INTO public."TemplateItems" VALUES (36, 2, 'TBM 점검', '지시', '금일 안전작업 내용지시', 70);
INSERT INTO public."TemplateItems" VALUES (37, 2, '위험 평가 및 개선 대책', '위험예지훈련', '각 팀원 최근 아차사고 사례 공유', 80);
INSERT INTO public."TemplateItems" VALUES (38, 2, '위험 평가 및 개선 대책', '위험예지훈련', '작업장소 등 환경에 대한 위험', 90);
INSERT INTO public."TemplateItems" VALUES (39, 2, '위험 평가 및 개선 대책', '위험예지훈련', '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', 100);
INSERT INTO public."TemplateItems" VALUES (40, 2, '위험 평가 및 개선 대책', '위험예지훈련', '크레인, 리프트, 지게차 등 설비에 대한 위험', 110);
INSERT INTO public."TemplateItems" VALUES (41, 2, '위험 평가 및 개선 대책', '위험예지훈련', '작업장 개구부, 고소작업 등에 대한 위험', 120);
INSERT INTO public."TemplateItems" VALUES (42, 2, '위험 평가 및 개선 대책', '위험예지훈련', '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', 130);
INSERT INTO public."TemplateItems" VALUES (43, 2, '확인', '지적확인', '중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', 140);
INSERT INTO public."TemplateItems" VALUES (44, 2, '관리 감독자 일일 안전 점검', '공통', '설비, 기계, 기구 등 점검 후 조치', 150);
INSERT INTO public."TemplateItems" VALUES (45, 2, '관리 감독자 일일 안전 점검', '공통', '각 종 기계기구의 이상 유무', 160);
INSERT INTO public."TemplateItems" VALUES (46, 2, '관리 감독자 일일 안전 점검', '공통', '작업장 정리정돈, 통로확보 개구부 확인 점검결과', 170);
INSERT INTO public."TemplateItems" VALUES (47, 2, '관리 감독자 일일 안전 점검', '중량물취급작업 크레인', '올바른 자세, 복장 및 보호구착용 여부', 180);
INSERT INTO public."TemplateItems" VALUES (48, 2, '관리 감독자 일일 안전 점검', '중량물취급작업 크레인', '주행로 상측 및 트롤리가 횡행하는 레일, 와이어 통하는 곳의 상태', 190);
INSERT INTO public."TemplateItems" VALUES (49, 2, '관리 감독자 일일 안전 점검', '중량물취급작업 크레인', '권과방지장치ㆍ브레이크ㆍ클러치 및 운전장치의 기능', 200);
INSERT INTO public."TemplateItems" VALUES (50, 2, '관리 감독자 일일 안전 점검', '중량물취급작업 크레인', '슬링, 와이어로프등의 이상 유무 및 매달린 상태', 210);
INSERT INTO public."TemplateItems" VALUES (51, 2, '관리 감독자 일일 안전 점검', '중량물취급작업 크레인', '인양물 하부 작업 여부', 220);
INSERT INTO public."TemplateItems" VALUES (52, 2, '관리 감독자 일일 안전 점검', '지게차 하역운반기계', '안전벨트 착용 상태 및 작업장내 과속, 급선회, 급출발 등 이상유무', 230);
INSERT INTO public."TemplateItems" VALUES (53, 2, '관리 감독자 일일 안전 점검', '지게차 하역운반기계', '제동장치 및 조종장치, 하역장치 및 유압장치 기능의 이상유무', 240);
INSERT INTO public."TemplateItems" VALUES (54, 2, '관리 감독자 일일 안전 점검', '지게차 하역운반기계', '전조등ㆍ후미등ㆍ방향지시기 및 경보장치, 바퀴 기능의 이상유무', 250);
INSERT INTO public."TemplateItems" VALUES (55, 2, '관리 감독자 일일 안전 점검', '위험작업조치', '소화기구, 환기조치, 화재예방 피난교육 등', 260);
INSERT INTO public."TemplateItems" VALUES (56, 2, '관리 감독자 일일 안전 점검', '위험작업조치', '용접,용단,연마 , 절단작업시 소화기구, 비산 방지, 환기 조치여부', 270);
INSERT INTO public."TemplateItems" VALUES (57, 2, '관리 감독자 일일 안전 점검', '위험작업조치', '통전 전류, 접지 상태, 가스, 유해물질 등 작업환경 점검', 280);
INSERT INTO public."TemplateItems" VALUES (58, 2, '인원관리', '시작/종료', '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', 290);
INSERT INTO public."TemplateItems" VALUES (59, 3, 'TBM 점검', '도입', '아침 체조 스트레칭', 10);
INSERT INTO public."TemplateItems" VALUES (60, 3, 'TBM 점검', '건강/복장/보호구', '음주상태', 20);
INSERT INTO public."TemplateItems" VALUES (61, 3, 'TBM 점검', '건강/복장/보호구', '건강상태', 30);
INSERT INTO public."TemplateItems" VALUES (62, 3, 'TBM 점검', '건강/복장/보호구', '복장', 40);
INSERT INTO public."TemplateItems" VALUES (63, 3, 'TBM 점검', '건강/복장/보호구', '보호구', 50);
INSERT INTO public."TemplateItems" VALUES (64, 3, 'TBM 점검', '지시', '생산회의', 60);
INSERT INTO public."TemplateItems" VALUES (65, 3, 'TBM 점검', '지시', '금일 안전작업 내용지시', 70);
INSERT INTO public."TemplateItems" VALUES (66, 3, '위험 평가 및 개선 대책', '위험예지훈련', '각 팀원 최근 아차사고 사례 공유', 80);
INSERT INTO public."TemplateItems" VALUES (67, 3, '위험 평가 및 개선 대책', '위험예지훈련', '작업장소 등 환경에 대한 위험', 90);
INSERT INTO public."TemplateItems" VALUES (68, 3, '위험 평가 및 개선 대책', '위험예지훈련', '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', 100);
INSERT INTO public."TemplateItems" VALUES (69, 3, '위험 평가 및 개선 대책', '위험예지훈련', '크레인, 리프트, 지게차 등 설비에 대한 위험', 110);
INSERT INTO public."TemplateItems" VALUES (70, 3, '위험 평가 및 개선 대책', '위험예지훈련', '작업장 개구부, 고소작업 등에 대한 위험', 120);
INSERT INTO public."TemplateItems" VALUES (71, 3, '위험 평가 및 개선 대책', '위험예지훈련', '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', 130);
INSERT INTO public."TemplateItems" VALUES (72, 3, '확인', '지적확인', '중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', 140);
INSERT INTO public."TemplateItems" VALUES (73, 3, '관리 감독자 일일 안전 점검', '공통', '설비, 기계, 기구 등 점검 후 조치', 150);
INSERT INTO public."TemplateItems" VALUES (74, 3, '관리 감독자 일일 안전 점검', '공통', '각 종 기계기구의 이상 유무', 160);
INSERT INTO public."TemplateItems" VALUES (75, 3, '관리 감독자 일일 안전 점검', '공통', '작업장 정리정돈, 통로확보 개구부 확인 점검결과', 170);
INSERT INTO public."TemplateItems" VALUES (76, 3, '관리 감독자 일일 안전 점검', '중량물취급작업 크레인', '올바른 자세, 복장 및 보호구착용 여부', 180);
INSERT INTO public."TemplateItems" VALUES (77, 3, '관리 감독자 일일 안전 점검', '중량물취급작업 크레인', '주행로 상측 및 트롤리가 횡행하는 레일, 와이어 통하는 곳의 상태', 190);
INSERT INTO public."TemplateItems" VALUES (78, 3, '관리 감독자 일일 안전 점검', '중량물취급작업 크레인', '권과방지장치ㆍ브레이크ㆍ클러치 및 운전장치의 기능', 200);
INSERT INTO public."TemplateItems" VALUES (79, 3, '관리 감독자 일일 안전 점검', '중량물취급작업 크레인', '슬링, 와이어로프등의 이상 유무 및 매달린 상태', 210);
INSERT INTO public."TemplateItems" VALUES (80, 3, '관리 감독자 일일 안전 점검', '중량물취급작업 크레인', '인양물 하부 작업 여부', 220);
INSERT INTO public."TemplateItems" VALUES (81, 3, '관리 감독자 일일 안전 점검', '지게차 하역운반기계', '안전벨트 착용 상태 및 작업장내 과속, 급선회, 급출발 등 이상유무', 230);
INSERT INTO public."TemplateItems" VALUES (82, 3, '관리 감독자 일일 안전 점검', '지게차 하역운반기계', '제동장치 및 조종장치, 하역장치 및 유압장치 기능의 이상유무', 240);
INSERT INTO public."TemplateItems" VALUES (83, 3, '관리 감독자 일일 안전 점검', '지게차 하역운반기계', '전조등ㆍ후미등ㆍ방향지시기 및 경보장치, 바퀴 기능의 이상유무', 250);
INSERT INTO public."TemplateItems" VALUES (84, 3, '관리 감독자 일일 안전 점검', '위험작업조치', '전단기, 절곡기 등의 방호장치의 기능', 260);
INSERT INTO public."TemplateItems" VALUES (85, 3, '관리 감독자 일일 안전 점검', '위험작업조치', '클러치, 브레이크, 금형, 고정볼트, 칼날, 테이블 등의 상태', 270);
INSERT INTO public."TemplateItems" VALUES (86, 3, '관리 감독자 일일 안전 점검', '위험작업조치', '통전 전류, 접지 상태, 가스, 유해물질 등 작업환경 점검', 280);
INSERT INTO public."TemplateItems" VALUES (87, 3, '인원관리', '시작/종료', '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', 290);
INSERT INTO public."TemplateItems" VALUES (88, 4, 'TBM 점검', '도입', '아침 체조 스트레칭', 10);
INSERT INTO public."TemplateItems" VALUES (89, 4, 'TBM 점검', '건강/복장/보호구', '음주상태', 20);
INSERT INTO public."TemplateItems" VALUES (90, 4, 'TBM 점검', '건강/복장/보호구', '건강상태', 30);
INSERT INTO public."TemplateItems" VALUES (91, 4, 'TBM 점검', '건강/복장/보호구', '복장', 40);
INSERT INTO public."TemplateItems" VALUES (92, 4, 'TBM 점검', '건강/복장/보호구', '보호구', 50);
INSERT INTO public."TemplateItems" VALUES (93, 4, 'TBM 점검', '지시', '생산회의', 60);
INSERT INTO public."TemplateItems" VALUES (94, 4, 'TBM 점검', '지시', '금일 안전작업 내용지시', 70);
INSERT INTO public."TemplateItems" VALUES (95, 4, '위험 평가 및 개선 대책', '위험예지훈련', '각 팀원 최근 아차사고 사례 공유', 80);
INSERT INTO public."TemplateItems" VALUES (96, 4, '위험 평가 및 개선 대책', '위험예지훈련', '작업장소 등 환경에 대한 위험', 90);
INSERT INTO public."TemplateItems" VALUES (97, 4, '위험 평가 및 개선 대책', '위험예지훈련', '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', 100);
INSERT INTO public."TemplateItems" VALUES (98, 4, '위험 평가 및 개선 대책', '위험예지훈련', '크레인, 리프트, 지게차 등 설비에 대한 위험', 110);
INSERT INTO public."TemplateItems" VALUES (99, 4, '위험 평가 및 개선 대책', '위험예지훈련', '작업장 개구부, 고소작업 등에 대한 위험', 120);
INSERT INTO public."TemplateItems" VALUES (100, 4, '위험 평가 및 개선 대책', '위험예지훈련', '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', 130);
INSERT INTO public."TemplateItems" VALUES (101, 4, '확인', '지적확인', '중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', 140);
INSERT INTO public."TemplateItems" VALUES (102, 4, '관리 감독자 일일 안전 점검', '공통', '사무실 및 작업장 정리정돈', 150);
INSERT INTO public."TemplateItems" VALUES (103, 4, '관리 감독자 일일 안전 점검', '공통', '현장 출입 시 안전보호구 착용 유무(안전모, 안전화 등)', 160);
INSERT INTO public."TemplateItems" VALUES (104, 4, '관리 감독자 일일 안전 점검', '공통', '종사자의 건강상태 이상유무', 170);
INSERT INTO public."TemplateItems" VALUES (105, 4, '관리 감독자 일일 안전 점검', '사무실안전', '파티션이나 그 밖에 넘어질 위험 여부', 180);
INSERT INTO public."TemplateItems" VALUES (106, 4, '관리 감독자 일일 안전 점검', '사무실안전', '끼이거나 부딪힐 수 있는 열린 서랍 등이 있는지 여부', 190);
INSERT INTO public."TemplateItems" VALUES (107, 4, '관리 감독자 일일 안전 점검', '위험작업조치', '고소작업시 안전모 착용, 안전고리 체결 유무', 200);
INSERT INTO public."TemplateItems" VALUES (108, 4, '관리 감독자 일일 안전 점검', '테스트작업', '돌가루 등 비산 위험이 있는곳에서 보안경 착용 여부', 210);
INSERT INTO public."TemplateItems" VALUES (109, 4, '관리 감독자 일일 안전 점검', '테스트작업', '작업자가 낙하물 범위 밖으로 있는지 여부', 220);
INSERT INTO public."TemplateItems" VALUES (110, 4, '인원관리', '시작/종료', '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', 230);
INSERT INTO public."TemplateItems" VALUES (111, 5, 'TBM 점검', '도입', '아침 체조 스트레칭', 10);
INSERT INTO public."TemplateItems" VALUES (112, 5, 'TBM 점검', '건강/복장/보호구', '음주상태', 20);
INSERT INTO public."TemplateItems" VALUES (113, 5, 'TBM 점검', '건강/복장/보호구', '건강상태', 30);
INSERT INTO public."TemplateItems" VALUES (114, 5, 'TBM 점검', '건강/복장/보호구', '복장', 40);
INSERT INTO public."TemplateItems" VALUES (115, 5, 'TBM 점검', '건강/복장/보호구', '보호구', 50);
INSERT INTO public."TemplateItems" VALUES (116, 5, 'TBM 점검', '지시', '생산회의', 60);
INSERT INTO public."TemplateItems" VALUES (117, 5, 'TBM 점검', '지시', '금일 안전작업 내용지시', 70);
INSERT INTO public."TemplateItems" VALUES (118, 5, '위험 평가 및 개선 대책', '위험예지훈련', '각 팀원 최근 아차사고 사례 공유', 80);
INSERT INTO public."TemplateItems" VALUES (119, 5, '위험 평가 및 개선 대책', '위험예지훈련', '작업장소 등 환경에 대한 위험', 90);
INSERT INTO public."TemplateItems" VALUES (120, 5, '위험 평가 및 개선 대책', '위험예지훈련', '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', 100);
INSERT INTO public."TemplateItems" VALUES (121, 5, '위험 평가 및 개선 대책', '위험예지훈련', '크레인, 리프트, 지게차 등 설비에 대한 위험', 110);
INSERT INTO public."TemplateItems" VALUES (122, 5, '위험 평가 및 개선 대책', '위험예지훈련', '작업장 개구부, 고소작업 등에 대한 위험', 120);
INSERT INTO public."TemplateItems" VALUES (123, 5, '위험 평가 및 개선 대책', '위험예지훈련', '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', 130);
INSERT INTO public."TemplateItems" VALUES (124, 5, '확인', '지적확인', '중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', 140);
INSERT INTO public."TemplateItems" VALUES (125, 5, '관리 감독자 일일 안전 점검', '공통', '사무실 및 작업장 정리정돈', 150);
INSERT INTO public."TemplateItems" VALUES (126, 5, '관리 감독자 일일 안전 점검', '공통', '현장 출입 시 안전보호구 착용 유무(안전모, 안전화 등)', 160);
INSERT INTO public."TemplateItems" VALUES (127, 5, '관리 감독자 일일 안전 점검', '공통', '종사자의 건강상태 이상유무', 170);
INSERT INTO public."TemplateItems" VALUES (128, 5, '관리 감독자 일일 안전 점검', '중량물운반 작업', '중량물 작업시 올바른 자세 및 복장 교육', 180);
INSERT INTO public."TemplateItems" VALUES (129, 5, '관리 감독자 일일 안전 점검', '중량물운반 작업', '중량물 취급시 바닥의 상태 등 운반환경 점검', 190);
INSERT INTO public."TemplateItems" VALUES (130, 5, '관리 감독자 일일 안전 점검', '지게차 하역운반기계', '안전벨트 착용 상태 및 작업장내 과속, 급선회, 급출발 등 이상유무', 200);
INSERT INTO public."TemplateItems" VALUES (131, 5, '관리 감독자 일일 안전 점검', '지게차 하역운반기계', '제동장치 및 조종장치, 하역장치 및 유압장치 기능의 이상유무', 210);
INSERT INTO public."TemplateItems" VALUES (132, 5, '관리 감독자 일일 안전 점검', '지게차 하역운반기계', '전조등ㆍ후미등ㆍ방향지시기 및 경보장치, 바퀴 기능의 이상유무', 220);
INSERT INTO public."TemplateItems" VALUES (133, 5, '인원관리', '시작/종료', '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', 230);
INSERT INTO public."TemplateItems" VALUES (134, 6, 'TBM 점검', '도입', '아침 체조 스트레칭', 10);
INSERT INTO public."TemplateItems" VALUES (135, 6, 'TBM 점검', '건강/복장/보호구', '음주상태', 20);
INSERT INTO public."TemplateItems" VALUES (136, 6, 'TBM 점검', '건강/복장/보호구', '건강상태', 30);
INSERT INTO public."TemplateItems" VALUES (137, 6, 'TBM 점검', '건강/복장/보호구', '복장', 40);
INSERT INTO public."TemplateItems" VALUES (138, 6, 'TBM 점검', '건강/복장/보호구', '보호구', 50);
INSERT INTO public."TemplateItems" VALUES (139, 6, 'TBM 점검', '지시', '생산회의', 60);
INSERT INTO public."TemplateItems" VALUES (140, 6, 'TBM 점검', '지시', '금일 안전작업 내용지시', 70);
INSERT INTO public."TemplateItems" VALUES (141, 6, '위험 평가 및 개선 대책', '위험예지훈련', '각 팀원 최근 아차사고 사례 공유', 80);
INSERT INTO public."TemplateItems" VALUES (142, 6, '위험 평가 및 개선 대책', '위험예지훈련', '작업장소 등 환경에 대한 위험', 90);
INSERT INTO public."TemplateItems" VALUES (143, 6, '위험 평가 및 개선 대책', '위험예지훈련', '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', 100);
INSERT INTO public."TemplateItems" VALUES (144, 6, '위험 평가 및 개선 대책', '위험예지훈련', '크레인, 리프트, 지게차 등 설비에 대한 위험', 110);
INSERT INTO public."TemplateItems" VALUES (145, 6, '위험 평가 및 개선 대책', '위험예지훈련', '작업장 개구부, 고소작업 등에 대한 위험', 120);
INSERT INTO public."TemplateItems" VALUES (146, 6, '위험 평가 및 개선 대책', '위험예지훈련', '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', 130);
INSERT INTO public."TemplateItems" VALUES (147, 6, '확인', '지적확인', '중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', 140);
INSERT INTO public."TemplateItems" VALUES (148, 6, '관리 감독자 일일 안전 점검', '공통', '사무실 및 작업장 정리정돈', 150);
INSERT INTO public."TemplateItems" VALUES (149, 6, '관리 감독자 일일 안전 점검', '공통', '현장 출입 시 안전보호구 착용 유무(안전모, 안전화 등)', 160);
INSERT INTO public."TemplateItems" VALUES (150, 6, '관리 감독자 일일 안전 점검', '공통', '종사자의 건강상태 이상유무', 170);
INSERT INTO public."TemplateItems" VALUES (151, 6, '관리 감독자 일일 안전 점검', '중량물취급작업 크레인', '주행로 상측 및 트롤리가 횡행하는 레일, 와이어 통하는 곳의 상태', 180);
INSERT INTO public."TemplateItems" VALUES (152, 6, '관리 감독자 일일 안전 점검', '중량물취급작업 크레인', '권과방지장치ㆍ브레이크ㆍ클러치 및 운전장치의 기능', 190);
INSERT INTO public."TemplateItems" VALUES (153, 6, '관리 감독자 일일 안전 점검', '중량물취급작업 크레인', '슬링, 와이어로프등의 이상 유무 및 매달린 상태, 하부 작업 여부', 200);
INSERT INTO public."TemplateItems" VALUES (154, 6, '관리 감독자 일일 안전 점검', '중량물취급작업 크레인', '인양물 하부 작업 여부', 210);
INSERT INTO public."TemplateItems" VALUES (155, 6, '관리 감독자 일일 안전 점검', '공기압축기', '드레인밸브, 압력방출장치, 언로드밸브, 윤활유, 덮개 이상 여부', 220);
INSERT INTO public."TemplateItems" VALUES (156, 6, '관리 감독자 일일 안전 점검', '지게차 하역운반기계', '안전벨트 착용 상태 및 작업장내 과속, 급선회, 급출발 등 이상유무', 230);
INSERT INTO public."TemplateItems" VALUES (157, 6, '관리 감독자 일일 안전 점검', '지게차 하역운반기계', '제동장치 및 조종장치, 하역장치 및 유압장치 기능의 이상유무', 240);
INSERT INTO public."TemplateItems" VALUES (158, 6, '관리 감독자 일일 안전 점검', '지게차 하역운반기계', '전조등ㆍ후미등ㆍ방향지시기 및 경보장치, 바퀴 기능의 이상유무', 250);
INSERT INTO public."TemplateItems" VALUES (159, 6, '관리 감독자 일일 안전 점검', '위험작업조치', '고소작업시 안전모 착용, 안전고리 체결 유무', 260);
INSERT INTO public."TemplateItems" VALUES (160, 6, '관리 감독자 일일 안전 점검', '위험작업조치', '용접,용단,연마 , 절단작업시 소화기구, 비산 방지, 환기 조치여부', 270);
INSERT INTO public."TemplateItems" VALUES (161, 6, '관리 감독자 일일 안전 점검', '위험작업조치', '통전 전류, 접지 상태, 가스, 유해물질 등 작업환경 점검', 280);
INSERT INTO public."TemplateItems" VALUES (162, 6, '인원관리', '시작/종료', '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', 290);
INSERT INTO public."TemplateItems" VALUES (163, 7, 'TBM 점검', '도입', '아침 체조 스트레칭', 10);
INSERT INTO public."TemplateItems" VALUES (164, 7, 'TBM 점검', '건강/복장/보호구', '음주상태', 20);
INSERT INTO public."TemplateItems" VALUES (165, 7, 'TBM 점검', '건강/복장/보호구', '건강상태', 30);
INSERT INTO public."TemplateItems" VALUES (166, 7, 'TBM 점검', '건강/복장/보호구', '복장', 40);
INSERT INTO public."TemplateItems" VALUES (167, 7, 'TBM 점검', '건강/복장/보호구', '보호구', 50);
INSERT INTO public."TemplateItems" VALUES (168, 7, 'TBM 점검', '지시', '생산회의', 60);
INSERT INTO public."TemplateItems" VALUES (169, 7, 'TBM 점검', '지시', '금일 안전작업 내용지시', 70);
INSERT INTO public."TemplateItems" VALUES (170, 7, '위험 평가 및 개선 대책', '위험예지훈련', '각 팀원 최근 아차사고 사례 공유', 80);
INSERT INTO public."TemplateItems" VALUES (171, 7, '위험 평가 및 개선 대책', '위험예지훈련', '작업장소 등 환경에 대한 위험', 90);
INSERT INTO public."TemplateItems" VALUES (172, 7, '위험 평가 및 개선 대책', '위험예지훈련', '입고, 출고, 조립, 가공 등 공정 순서(작업방법)에 대한 위험', 100);
INSERT INTO public."TemplateItems" VALUES (173, 7, '위험 평가 및 개선 대책', '위험예지훈련', '크레인, 리프트, 지게차 등 설비에 대한 위험', 110);
INSERT INTO public."TemplateItems" VALUES (174, 7, '위험 평가 및 개선 대책', '위험예지훈련', '작업장 개구부, 고소작업 등에 대한 위험', 120);
INSERT INTO public."TemplateItems" VALUES (175, 7, '위험 평가 및 개선 대책', '위험예지훈련', '그라인더, 인양달기구 등 사용하는 기구,도구에 대한 위험', 130);
INSERT INTO public."TemplateItems" VALUES (176, 7, '확인', '지적확인', '중점 위험요인 선정 구호 제창 (중점도 높은 사항으로 선정)', 140);
INSERT INTO public."TemplateItems" VALUES (177, 7, '관리 감독자 일일 안전 점검', '공통', '사무실 및 작업장 정리정돈', 150);
INSERT INTO public."TemplateItems" VALUES (178, 7, '관리 감독자 일일 안전 점검', '공통', '현장 출입 시 안전보호구 착용 유무(안전모, 안전화 등)', 160);
INSERT INTO public."TemplateItems" VALUES (179, 7, '관리 감독자 일일 안전 점검', '공통', '종사자의 건강상태 이상유무', 170);
INSERT INTO public."TemplateItems" VALUES (180, 7, '관리 감독자 일일 안전 점검', '사무실안전', '파티션이나 그 밖에 넘어질 위험 여부', 180);
INSERT INTO public."TemplateItems" VALUES (181, 7, '관리 감독자 일일 안전 점검', '사무실안전', '끼이거나 부딪힐 수 있는 열린 서랍 등이 있는지 여부', 190);
INSERT INTO public."TemplateItems" VALUES (182, 7, '관리 감독자 일일 안전 점검', '위험작업조치', '고소작업시 안전모 착용, 안전고리 체결 유무', 200);
INSERT INTO public."TemplateItems" VALUES (183, 7, '관리 감독자 일일 안전 점검', '중량물운반 작업', '중량물 작업시 올바른 자세 및 복장 교육', 210);
INSERT INTO public."TemplateItems" VALUES (184, 7, '관리 감독자 일일 안전 점검', '중량물운반 작업', '중량물 취급시 바닥의 상태 등 운반환경 점검', 220);
INSERT INTO public."TemplateItems" VALUES (185, 7, '인원관리', '시작/종료', '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', 230);
INSERT INTO public."TemplateItems" VALUES (186, 8, 'TBM 점검', '도입', '아침 체조 스트레칭', 10);
INSERT INTO public."TemplateItems" VALUES (187, 8, 'TBM 점검', '건강/복장/보호구', '음주상태', 20);
INSERT INTO public."TemplateItems" VALUES (188, 8, 'TBM 점검', '건강/복장/보호구', '건강상태', 30);
INSERT INTO public."TemplateItems" VALUES (189, 8, 'TBM 점검', '건강/복장/보호구', '복장', 40);
INSERT INTO public."TemplateItems" VALUES (190, 8, 'TBM 점검', '건강/복장/보호구', '보호구', 50);
INSERT INTO public."TemplateItems" VALUES (191, 8, 'TBM 점검', '지시', '생산회의', 60);
INSERT INTO public."TemplateItems" VALUES (192, 8, 'TBM 점검', '지시', '금일 안전작업 내용지시', 70);
INSERT INTO public."TemplateItems" VALUES (193, 8, '교육', '사고사례 공유', '타사 사고사례 및 아차 사고사례 공유', 80);
INSERT INTO public."TemplateItems" VALUES (194, 8, '관리 감독자 일일 안전 점검', '공통', '사무실 및 작업장 정리정돈', 90);
INSERT INTO public."TemplateItems" VALUES (195, 8, '관리 감독자 일일 안전 점검', '공통', '현장 출입 시 안전보호구 착용 유무(안전모, 안전화 등)', 100);
INSERT INTO public."TemplateItems" VALUES (196, 8, '관리 감독자 일일 안전 점검', '공통', '종사자의 건강상태 이상유무', 110);
INSERT INTO public."TemplateItems" VALUES (197, 8, '관리 감독자 일일 안전 점검', '공통', '담당직원 작업시 안전상태 확인', 120);
INSERT INTO public."TemplateItems" VALUES (198, 8, '인원관리', '시작/종료', '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', 130);
INSERT INTO public."TemplateItems" VALUES (199, 9, 'TBM 점검', '도입', '아침 체조 스트레칭', 10);
INSERT INTO public."TemplateItems" VALUES (200, 9, 'TBM 점검', '건강/복장/보호구', '음주상태', 20);
INSERT INTO public."TemplateItems" VALUES (201, 9, 'TBM 점검', '건강/복장/보호구', '건강상태', 30);
INSERT INTO public."TemplateItems" VALUES (202, 9, 'TBM 점검', '건강/복장/보호구', '복장', 40);
INSERT INTO public."TemplateItems" VALUES (203, 9, 'TBM 점검', '건강/복장/보호구', '보호구', 50);
INSERT INTO public."TemplateItems" VALUES (204, 9, 'TBM 점검', '지시', '생산회의', 60);
INSERT INTO public."TemplateItems" VALUES (205, 9, 'TBM 점검', '지시', '금일 안전작업 내용지시', 70);
INSERT INTO public."TemplateItems" VALUES (206, 9, '교육', '사고사례 공유', '타사 사고사례 및 아차 사고사례 공유', 80);
INSERT INTO public."TemplateItems" VALUES (207, 9, '관리 감독자 일일 안전 점검', '공통', '사무실 및 작업장 정리정돈', 90);
INSERT INTO public."TemplateItems" VALUES (208, 9, '관리 감독자 일일 안전 점검', '공통', '현장 출입 시 안전보호구 착용 유무(안전모, 안전화 등)', 100);
INSERT INTO public."TemplateItems" VALUES (209, 9, '관리 감독자 일일 안전 점검', '공통', '종사자의 건강상태 이상유무', 110);
INSERT INTO public."TemplateItems" VALUES (210, 9, '관리 감독자 일일 안전 점검', '공통', '담당직원 작업시 안전상태 확인', 120);
INSERT INTO public."TemplateItems" VALUES (211, 9, '관리 감독자 일일 안전 점검', '정비작업', '정비작업시 LOTO 표지부착 상태', 130);
INSERT INTO public."TemplateItems" VALUES (212, 9, '관리 감독자 일일 안전 점검', '위험작업조치', '고소작업시 안전모 착용, 안전고리 체결 유무', 140);
INSERT INTO public."TemplateItems" VALUES (213, 9, '관리 감독자 일일 안전 점검', '위험작업조치', '용접,용단,연마 , 절단작업시 소화기구, 비산 방지, 환기 조치여부', 150);
INSERT INTO public."TemplateItems" VALUES (214, 9, '관리 감독자 일일 안전 점검', '위험작업조치', '통전 전류, 접지 상태, 가스, 유해물질 등 작업환경 점검', 160);
INSERT INTO public."TemplateItems" VALUES (215, 9, '인원관리', '시작/종료', '작업시작 및 종료 시, 담당직원의 투입 시/퇴장 시 인원 점검', 170);


--
-- Data for Name: ReportDetails; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public."ReportDetails" VALUES (59, 1, 1, 'O');
INSERT INTO public."ReportDetails" VALUES (60, 1, 2, 'O');
INSERT INTO public."ReportDetails" VALUES (61, 1, 3, 'O');
INSERT INTO public."ReportDetails" VALUES (62, 1, 4, 'O');
INSERT INTO public."ReportDetails" VALUES (63, 1, 5, 'O');
INSERT INTO public."ReportDetails" VALUES (64, 1, 6, 'O');
INSERT INTO public."ReportDetails" VALUES (65, 1, 7, 'O');
INSERT INTO public."ReportDetails" VALUES (66, 1, 8, 'O');
INSERT INTO public."ReportDetails" VALUES (67, 1, 9, 'O');
INSERT INTO public."ReportDetails" VALUES (68, 1, 10, 'O');
INSERT INTO public."ReportDetails" VALUES (69, 1, 11, 'O');
INSERT INTO public."ReportDetails" VALUES (70, 1, 12, 'O');
INSERT INTO public."ReportDetails" VALUES (71, 1, 13, 'O');
INSERT INTO public."ReportDetails" VALUES (72, 1, 14, 'O');
INSERT INTO public."ReportDetails" VALUES (73, 1, 15, 'O');
INSERT INTO public."ReportDetails" VALUES (74, 1, 16, 'O');
INSERT INTO public."ReportDetails" VALUES (75, 1, 17, 'O');
INSERT INTO public."ReportDetails" VALUES (76, 1, 18, 'O');
INSERT INTO public."ReportDetails" VALUES (77, 1, 19, 'O');
INSERT INTO public."ReportDetails" VALUES (78, 1, 20, 'O');
INSERT INTO public."ReportDetails" VALUES (79, 1, 21, 'O');
INSERT INTO public."ReportDetails" VALUES (80, 1, 22, 'O');
INSERT INTO public."ReportDetails" VALUES (81, 1, 23, 'O');
INSERT INTO public."ReportDetails" VALUES (82, 1, 24, 'O');
INSERT INTO public."ReportDetails" VALUES (83, 1, 25, 'O');
INSERT INTO public."ReportDetails" VALUES (84, 1, 26, 'O');
INSERT INTO public."ReportDetails" VALUES (85, 1, 27, 'O');
INSERT INTO public."ReportDetails" VALUES (86, 1, 28, 'O');
INSERT INTO public."ReportDetails" VALUES (87, 1, 29, 'O');
INSERT INTO public."ReportDetails" VALUES (88, 2, 1, 'O');
INSERT INTO public."ReportDetails" VALUES (89, 2, 2, 'O');
INSERT INTO public."ReportDetails" VALUES (90, 2, 3, 'O');
INSERT INTO public."ReportDetails" VALUES (91, 2, 4, 'O');
INSERT INTO public."ReportDetails" VALUES (92, 2, 5, 'O');
INSERT INTO public."ReportDetails" VALUES (93, 2, 6, 'O');
INSERT INTO public."ReportDetails" VALUES (94, 2, 7, 'O');
INSERT INTO public."ReportDetails" VALUES (95, 2, 8, 'O');
INSERT INTO public."ReportDetails" VALUES (96, 2, 9, 'O');
INSERT INTO public."ReportDetails" VALUES (97, 2, 10, 'O');
INSERT INTO public."ReportDetails" VALUES (98, 2, 11, 'O');
INSERT INTO public."ReportDetails" VALUES (99, 2, 12, 'O');
INSERT INTO public."ReportDetails" VALUES (100, 2, 13, 'O');
INSERT INTO public."ReportDetails" VALUES (101, 2, 14, 'O');
INSERT INTO public."ReportDetails" VALUES (102, 2, 15, 'O');
INSERT INTO public."ReportDetails" VALUES (103, 2, 16, 'O');
INSERT INTO public."ReportDetails" VALUES (104, 2, 17, 'O');
INSERT INTO public."ReportDetails" VALUES (105, 2, 18, 'O');
INSERT INTO public."ReportDetails" VALUES (106, 2, 19, 'O');
INSERT INTO public."ReportDetails" VALUES (107, 2, 20, 'O');
INSERT INTO public."ReportDetails" VALUES (108, 2, 21, 'O');
INSERT INTO public."ReportDetails" VALUES (109, 2, 22, 'O');
INSERT INTO public."ReportDetails" VALUES (110, 2, 23, 'O');
INSERT INTO public."ReportDetails" VALUES (111, 2, 24, 'O');
INSERT INTO public."ReportDetails" VALUES (112, 2, 25, 'O');
INSERT INTO public."ReportDetails" VALUES (113, 2, 26, 'O');
INSERT INTO public."ReportDetails" VALUES (114, 2, 27, 'O');
INSERT INTO public."ReportDetails" VALUES (115, 2, 28, 'O');
INSERT INTO public."ReportDetails" VALUES (116, 2, 29, 'O');
INSERT INTO public."ReportDetails" VALUES (117, 3, 1, 'O');
INSERT INTO public."ReportDetails" VALUES (118, 3, 2, 'O');
INSERT INTO public."ReportDetails" VALUES (119, 3, 3, 'O');
INSERT INTO public."ReportDetails" VALUES (120, 3, 4, 'O');
INSERT INTO public."ReportDetails" VALUES (121, 3, 5, 'O');
INSERT INTO public."ReportDetails" VALUES (122, 3, 6, 'O');
INSERT INTO public."ReportDetails" VALUES (123, 3, 7, 'O');
INSERT INTO public."ReportDetails" VALUES (124, 3, 8, 'O');
INSERT INTO public."ReportDetails" VALUES (125, 3, 9, 'O');
INSERT INTO public."ReportDetails" VALUES (126, 3, 10, 'O');
INSERT INTO public."ReportDetails" VALUES (127, 3, 11, 'O');
INSERT INTO public."ReportDetails" VALUES (128, 3, 12, 'O');
INSERT INTO public."ReportDetails" VALUES (129, 3, 13, 'O');
INSERT INTO public."ReportDetails" VALUES (130, 3, 14, 'O');
INSERT INTO public."ReportDetails" VALUES (131, 3, 15, 'O');
INSERT INTO public."ReportDetails" VALUES (132, 3, 16, 'O');
INSERT INTO public."ReportDetails" VALUES (133, 3, 17, 'O');
INSERT INTO public."ReportDetails" VALUES (134, 3, 18, 'O');
INSERT INTO public."ReportDetails" VALUES (135, 3, 19, '△');
INSERT INTO public."ReportDetails" VALUES (136, 3, 20, 'O');
INSERT INTO public."ReportDetails" VALUES (137, 3, 21, 'O');
INSERT INTO public."ReportDetails" VALUES (138, 3, 22, '△');
INSERT INTO public."ReportDetails" VALUES (139, 3, 23, 'O');
INSERT INTO public."ReportDetails" VALUES (140, 3, 24, 'O');
INSERT INTO public."ReportDetails" VALUES (141, 3, 25, 'O');
INSERT INTO public."ReportDetails" VALUES (142, 3, 26, 'O');
INSERT INTO public."ReportDetails" VALUES (143, 3, 27, 'O');
INSERT INTO public."ReportDetails" VALUES (144, 3, 28, 'O');
INSERT INTO public."ReportDetails" VALUES (145, 3, 29, 'O');
INSERT INTO public."ReportDetails" VALUES (146, 4, 1, 'O');
INSERT INTO public."ReportDetails" VALUES (147, 4, 2, 'O');
INSERT INTO public."ReportDetails" VALUES (148, 4, 3, 'O');
INSERT INTO public."ReportDetails" VALUES (149, 4, 4, 'O');
INSERT INTO public."ReportDetails" VALUES (150, 4, 5, 'O');
INSERT INTO public."ReportDetails" VALUES (151, 4, 6, 'O');
INSERT INTO public."ReportDetails" VALUES (152, 4, 7, 'O');
INSERT INTO public."ReportDetails" VALUES (153, 4, 8, 'O');
INSERT INTO public."ReportDetails" VALUES (154, 4, 9, 'O');
INSERT INTO public."ReportDetails" VALUES (155, 4, 10, 'O');
INSERT INTO public."ReportDetails" VALUES (156, 4, 11, 'O');
INSERT INTO public."ReportDetails" VALUES (157, 4, 12, 'O');
INSERT INTO public."ReportDetails" VALUES (158, 4, 13, 'O');
INSERT INTO public."ReportDetails" VALUES (159, 4, 14, 'O');
INSERT INTO public."ReportDetails" VALUES (160, 4, 15, 'O');
INSERT INTO public."ReportDetails" VALUES (161, 4, 16, 'O');
INSERT INTO public."ReportDetails" VALUES (162, 4, 17, 'O');
INSERT INTO public."ReportDetails" VALUES (163, 4, 18, 'O');
INSERT INTO public."ReportDetails" VALUES (164, 4, 19, 'O');
INSERT INTO public."ReportDetails" VALUES (165, 4, 20, 'O');
INSERT INTO public."ReportDetails" VALUES (166, 4, 21, 'O');
INSERT INTO public."ReportDetails" VALUES (167, 4, 22, 'O');
INSERT INTO public."ReportDetails" VALUES (168, 4, 23, 'O');
INSERT INTO public."ReportDetails" VALUES (169, 4, 24, 'O');
INSERT INTO public."ReportDetails" VALUES (170, 4, 25, 'O');
INSERT INTO public."ReportDetails" VALUES (171, 4, 26, 'O');
INSERT INTO public."ReportDetails" VALUES (172, 4, 27, 'O');
INSERT INTO public."ReportDetails" VALUES (173, 4, 28, 'O');
INSERT INTO public."ReportDetails" VALUES (174, 4, 29, 'O');
INSERT INTO public."ReportDetails" VALUES (204, 5, 134, 'O');
INSERT INTO public."ReportDetails" VALUES (205, 5, 135, 'O');
INSERT INTO public."ReportDetails" VALUES (206, 5, 136, 'O');
INSERT INTO public."ReportDetails" VALUES (207, 5, 137, 'O');
INSERT INTO public."ReportDetails" VALUES (208, 5, 138, 'O');
INSERT INTO public."ReportDetails" VALUES (209, 5, 139, 'O');
INSERT INTO public."ReportDetails" VALUES (210, 5, 140, 'O');
INSERT INTO public."ReportDetails" VALUES (211, 5, 141, 'O');
INSERT INTO public."ReportDetails" VALUES (212, 5, 142, 'O');
INSERT INTO public."ReportDetails" VALUES (213, 5, 143, 'O');
INSERT INTO public."ReportDetails" VALUES (214, 5, 144, 'O');
INSERT INTO public."ReportDetails" VALUES (215, 5, 145, 'O');
INSERT INTO public."ReportDetails" VALUES (216, 5, 146, 'O');
INSERT INTO public."ReportDetails" VALUES (217, 5, 147, 'O');
INSERT INTO public."ReportDetails" VALUES (218, 5, 148, 'O');
INSERT INTO public."ReportDetails" VALUES (219, 5, 149, 'O');
INSERT INTO public."ReportDetails" VALUES (220, 5, 150, 'O');
INSERT INTO public."ReportDetails" VALUES (221, 5, 151, 'O');
INSERT INTO public."ReportDetails" VALUES (222, 5, 152, 'O');
INSERT INTO public."ReportDetails" VALUES (223, 5, 153, 'O');
INSERT INTO public."ReportDetails" VALUES (224, 5, 154, 'O');
INSERT INTO public."ReportDetails" VALUES (225, 5, 155, 'O');
INSERT INTO public."ReportDetails" VALUES (226, 5, 156, '△');
INSERT INTO public."ReportDetails" VALUES (227, 5, 157, 'X');
INSERT INTO public."ReportDetails" VALUES (228, 5, 158, '△');
INSERT INTO public."ReportDetails" VALUES (229, 5, 159, 'X');
INSERT INTO public."ReportDetails" VALUES (230, 5, 160, '△');
INSERT INTO public."ReportDetails" VALUES (231, 5, 161, 'X');
INSERT INTO public."ReportDetails" VALUES (232, 5, 162, '△');
INSERT INTO public."ReportDetails" VALUES (233, 6, 186, 'O');
INSERT INTO public."ReportDetails" VALUES (234, 6, 187, 'O');
INSERT INTO public."ReportDetails" VALUES (235, 6, 188, 'O');
INSERT INTO public."ReportDetails" VALUES (236, 6, 189, 'O');
INSERT INTO public."ReportDetails" VALUES (237, 6, 190, 'O');
INSERT INTO public."ReportDetails" VALUES (238, 6, 191, 'O');
INSERT INTO public."ReportDetails" VALUES (239, 6, 192, '△');
INSERT INTO public."ReportDetails" VALUES (240, 6, 193, '△');
INSERT INTO public."ReportDetails" VALUES (241, 6, 194, '△');
INSERT INTO public."ReportDetails" VALUES (242, 6, 195, 'X');
INSERT INTO public."ReportDetails" VALUES (243, 6, 196, 'X');
INSERT INTO public."ReportDetails" VALUES (244, 6, 197, 'X');
INSERT INTO public."ReportDetails" VALUES (245, 6, 198, 'X');


--
-- Data for Name: Users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public."Users" VALUES (1, '김조립', 1);
INSERT INTO public."Users" VALUES (2, '이전기', 1);
INSERT INTO public."Users" VALUES (3, '박제관', 2);
INSERT INTO public."Users" VALUES (4, '최라인', 2);
INSERT INTO public."Users" VALUES (5, '정가공', 3);
INSERT INTO public."Users" VALUES (6, '강가공', 3);
INSERT INTO public."Users" VALUES (7, '오연구', 4);
INSERT INTO public."Users" VALUES (8, '유개발', 4);
INSERT INTO public."Users" VALUES (9, '송부품', 5);
INSERT INTO public."Users" VALUES (10, '한출하', 5);
INSERT INTO public."Users" VALUES (11, '장서비스', 6);
INSERT INTO public."Users" VALUES (12, '임수리', 6);
INSERT INTO public."Users" VALUES (13, '서품질', 7);
INSERT INTO public."Users" VALUES (14, '황검사', 7);
INSERT INTO public."Users" VALUES (15, '조인사', 8);
INSERT INTO public."Users" VALUES (16, '윤총무', 8);
INSERT INTO public."Users" VALUES (17, '신기술', 9);
INSERT INTO public."Users" VALUES (18, '구생산', 9);


--
-- Data for Name: ReportSignatures; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public."ReportSignatures" VALUES (1, 1, 1, '2025-09-16 05:20:03.24', NULL);
INSERT INTO public."ReportSignatures" VALUES (2, 1, 2, '2025-09-16 05:20:03.24', NULL);
INSERT INTO public."ReportSignatures" VALUES (3, 2, 1, '2025-09-16 07:10:16.437', NULL);
INSERT INTO public."ReportSignatures" VALUES (4, 2, 2, '2025-09-16 07:10:16.437', NULL);
INSERT INTO public."ReportSignatures" VALUES (5, 3, 1, '2025-09-16 07:10:25.467', NULL);
INSERT INTO public."ReportSignatures" VALUES (6, 3, 2, '2025-09-16 07:10:25.467', NULL);
INSERT INTO public."ReportSignatures" VALUES (7, 4, 1, '2025-09-22 07:46:01.471', NULL);
INSERT INTO public."ReportSignatures" VALUES (8, 4, 2, '2025-09-22 07:46:01.471', NULL);
INSERT INTO public."ReportSignatures" VALUES (9, 5, 6, '2025-09-29 00:09:56.125', NULL);
INSERT INTO public."ReportSignatures" VALUES (10, 5, 7, '2025-09-29 00:09:56.125', NULL);
INSERT INTO public."ReportSignatures" VALUES (11, 5, 8, '2025-09-29 00:09:56.125', NULL);
INSERT INTO public."ReportSignatures" VALUES (12, 5, 9, '2025-09-29 00:09:56.125', NULL);
INSERT INTO public."ReportSignatures" VALUES (13, 5, 10, '2025-09-29 00:09:56.125', NULL);
INSERT INTO public."ReportSignatures" VALUES (14, 5, 11, '2025-09-29 00:09:56.125', NULL);
INSERT INTO public."ReportSignatures" VALUES (15, 6, 15, '2025-10-14 01:32:06.172', NULL);
INSERT INTO public."ReportSignatures" VALUES (16, 6, 16, '2025-10-14 01:32:06.172', NULL);
INSERT INTO public."ReportSignatures" VALUES (17, 6, 15, '2025-10-14 01:32:06.172', NULL);


--
-- Data for Name: UserAssessment; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: UserProgress; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public."UserProgress" VALUES ('3417d6b2-975f-42a8-8649-a1f3822870f9', 'demo-user', 'course-workplace-safety', 0, false, 2, 4, '2025-10-14 01:55:07.737');


--
-- Name: ChecklistTemplates_TemplateID_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public."ChecklistTemplates_TemplateID_seq"', 9, true);


--
-- Name: DailyReports_ReportID_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public."DailyReports_ReportID_seq"', 6, true);


--
-- Name: ReportDetails_DetailID_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public."ReportDetails_DetailID_seq"', 245, true);


--
-- Name: ReportSignatures_SignatureID_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public."ReportSignatures_SignatureID_seq"', 17, true);


--
-- Name: Teams_TeamID_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public."Teams_TeamID_seq"', 9, true);


--
-- Name: TemplateItems_ItemID_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public."TemplateItems_ItemID_seq"', 215, true);


--
-- Name: Users_UserID_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public."Users_UserID_seq"', 18, true);


--
-- PostgreSQL database dump complete
--

