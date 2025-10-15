-- Teams data
INSERT INTO "Teams" ("TeamID", "TeamName") VALUES (1, '조립 전기라인');
INSERT INTO "Teams" ("TeamID", "TeamName") VALUES (2, '제관라인');
INSERT INTO "Teams" ("TeamID", "TeamName") VALUES (3, '가공라인');
INSERT INTO "Teams" ("TeamID", "TeamName") VALUES (4, '연구소');
INSERT INTO "Teams" ("TeamID", "TeamName") VALUES (5, '지재/부품/출하');
INSERT INTO "Teams" ("TeamID", "TeamName") VALUES (6, '서비스');
INSERT INTO "Teams" ("TeamID", "TeamName") VALUES (7, '품질');
INSERT INTO "Teams" ("TeamID", "TeamName") VALUES (8, '인사총무팀');
INSERT INTO "Teams" ("TeamID", "TeamName") VALUES (9, '생산기술팀');

-- ChecklistTemplates data
INSERT INTO "ChecklistTemplates" ("TemplateID", "TemplateName", "TeamID") VALUES (1, '조립 전기라인 일일 안전점검', 1);
INSERT INTO "ChecklistTemplates" ("TemplateID", "TemplateName", "TeamID") VALUES (2, '제관라인 일일 안전점검', 2);
-- ... (and so on for all the TBM data)
