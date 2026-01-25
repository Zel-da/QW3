-- SQL Script to update 4 users to EXECUTIVE_LEADER role
-- 임원+팀장 이중 역할 시스템

-- 박준영 (화성) - pjy0302
-- 손범국 (화성) - sbk6116
-- 신상표 (화성) - ssp
-- 황종건 (아산) - jg.hwang

-- Update users to EXECUTIVE_LEADER role
UPDATE "User"
SET role = 'EXECUTIVE_LEADER'
WHERE username IN ('pjy0302', 'sbk6116', 'ssp', 'jg.hwang');

-- Verify the update
SELECT id, username, name, role, site, "teamId"
FROM "User"
WHERE username IN ('pjy0302', 'sbk6116', 'ssp', 'jg.hwang');
