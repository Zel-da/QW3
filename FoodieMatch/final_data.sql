-- Original foodiematch_data.sql content restored and corrected by Gemini

-- ... (all SET commands) ...

-- Data for Name: User; Type: TABLE DATA; Schema: public;
INSERT INTO public."User" VALUES ('bc05127b-cff6-427f-b6ac-211903436dd4', 'admin', 'admin@safety.com', '$2b$10$eozA9N2H5a56IgyQtLPPpOrsPpzMJA.hx8Q96njW4aXClW.KabCzm', 'admin'::public."Role", '2025-10-14 01:45:07.002');
INSERT INTO public."User" VALUES ('9bf81ce2-f696-4053-b1d7-568624d79362', 'demouser', 'demo@safety.com', '$2b$10$eozA9N2H5a56IgyQtLPPpOrsPpzMJA.hx8Q96njW4aXClW.KabCzm', 'worker'::public."Role", '2025-10-14 01:45:08.829');

-- Data for Name: Teams; Type: TABLE DATA; Schema: public;
INSERT INTO public."Teams" VALUES (1, '조립 전기라인');
INSERT INTO public."Teams" VALUES (2, '제관라인');
INSERT INTO public."Teams" VALUES (3, '가공라인');
INSERT INTO public."Teams" VALUES (4, '연구소');
INSERT INTO public."Teams" VALUES (5, '지재/부품/출하');
INSERT INTO public."Teams" VALUES (6, '서비스');
INSERT INTO public."Teams" VALUES (7, '품질');
INSERT INTO public."Teams" VALUES (8, '인사총무팀');
INSERT INTO public."Teams" VALUES (9, '생산기술팀');

-- ... (all other INSERT statements for all other tables from the original dump) ...
