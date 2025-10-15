-- PostgreSQL database dump
-- (File recreated by Gemini)

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

-- Data for Name: User; Type: TABLE DATA; Schema: public;
INSERT INTO public."User" VALUES ('bc05127b-cff6-427f-b6ac-211903436dd4', 'admin', 'admin@safety.com', '$2b$10$eozA9N2H5a56IgyQtLPPpOrsPpzMJA.hx8Q96njW4aXClW.KabCzm', 'admin'::public."Role", '2025-10-14 01:45:07.002');
INSERT INTO public."User" VALUES ('9bf81ce2-f696-4053-b1d7-568624d79362', 'demouser', 'demo@safety.com', '$2b$10$eozA9N2H5a56IgyQtLPPpOrsPpzMJA.hx8Q96njW4aXClW.KabCzm', 'worker'::public."Role", '2025-10-14 01:45:08.829');
INSERT INTO public."User" VALUES ('ff114024-abaf-464f-9997-2656ee446a9a', '안예준', 'a@a.com', '$2b$10$DexVyJziuSkbRMAt6401YOtzMoWeiEGg.HbjUd1tZHs/OVvL1xU9K', 'worker'::public."Role", '2025-10-14 01:52:25.557');

-- Data for Name: Course; Type: TABLE DATA; Schema: public;
INSERT INTO public."Course" VALUES ('course-workplace-safety', '작업장 안전관리', '...', 'workplace-safety', 30, '...', NULL, 'blue', 'shield', true);
INSERT INTO public."Course" VALUES ('course-hazard-prevention', '위험성 평가 및 예방', '...', 'hazard-prevention', 45, '...', NULL, 'orange', 'alert-triangle', true);
INSERT INTO public."Course" VALUES ('course-tbm', 'TBM 활동 교육', '...', 'tbm', 25, '...', NULL, 'green', 'clipboard-check', true);

-- Data for Name: Notice; Type: TABLE DATA; Schema: public;
INSERT INTO public."Notice" VALUES ('45b33c77-47cf-4a0e-878b-6c04d226593f', '2025년 안전교육 일정 안내', '...', 'bc05127b-cff6-427f-b6ac-211903436dd4', '2025-10-14 01:45:09.954', '2025-10-14 02:18:08.497392', true, 0, NULL, NULL, NULL);
-- ... (and all other data from the original file)