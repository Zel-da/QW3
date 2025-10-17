-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SAFETY_TEAM', 'TEAM_LEADER', 'WORKER', 'OFFICE_WORKER');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REVIEW');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT,
    "role" "Role" NOT NULL DEFAULT 'WORKER',
    "teamId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notice" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "videoUrl" TEXT,
    "documentUrl" TEXT,
    "color" TEXT NOT NULL DEFAULT 'blue',
    "icon" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "timeSpent" INTEGER NOT NULL DEFAULT 0,
    "lastAccessed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "correctAnswer" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "certificateUrl" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teams" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "leaderId" TEXT,

    CONSTRAINT "Teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistTemplates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,

    CONSTRAINT "ChecklistTemplates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateItems" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "description" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TemplateItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyReports" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "managerName" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyReports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportDetails" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "checkState" TEXT,
    "photoUrl" TEXT,
    "actionDescription" TEXT,
    "actionStatus" "ActionStatus" DEFAULT 'PENDING',

    CONSTRAINT "ReportDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportSignatures" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signatureImage" TEXT,

    CONSTRAINT "ReportSignatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyApproval" (
    "id" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "pdfUrl" TEXT,
    "approverId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "MonthlyApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_teamId_idx" ON "User"("teamId");

-- CreateIndex
CREATE INDEX "Notice_authorId_idx" ON "Notice"("authorId");

-- CreateIndex
CREATE INDEX "UserProgress_userId_idx" ON "UserProgress"("userId");

-- CreateIndex
CREATE INDEX "UserProgress_courseId_idx" ON "UserProgress"("courseId");

-- CreateIndex
CREATE INDEX "Assessment_courseId_idx" ON "Assessment"("courseId");

-- CreateIndex
CREATE INDEX "UserAssessment_userId_idx" ON "UserAssessment"("userId");

-- CreateIndex
CREATE INDEX "UserAssessment_courseId_idx" ON "UserAssessment"("courseId");

-- CreateIndex
CREATE INDEX "Certificate_userId_idx" ON "Certificate"("userId");

-- CreateIndex
CREATE INDEX "Certificate_courseId_idx" ON "Certificate"("courseId");

-- CreateIndex
CREATE INDEX "ChecklistTemplates_teamId_idx" ON "ChecklistTemplates"("teamId");

-- CreateIndex
CREATE INDEX "TemplateItems_templateId_idx" ON "TemplateItems"("templateId");

-- CreateIndex
CREATE INDEX "DailyReports_teamId_idx" ON "DailyReports"("teamId");

-- CreateIndex
CREATE INDEX "ReportDetails_reportId_idx" ON "ReportDetails"("reportId");

-- CreateIndex
CREATE INDEX "ReportDetails_itemId_idx" ON "ReportDetails"("itemId");

-- CreateIndex
CREATE INDEX "ReportSignatures_reportId_idx" ON "ReportSignatures"("reportId");

-- CreateIndex
CREATE INDEX "ReportSignatures_userId_idx" ON "ReportSignatures"("userId");

-- CreateIndex
CREATE INDEX "MonthlyApproval_teamId_idx" ON "MonthlyApproval"("teamId");

-- CreateIndex
CREATE INDEX "MonthlyApproval_approverId_idx" ON "MonthlyApproval"("approverId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyApproval_teamId_year_month_key" ON "MonthlyApproval"("teamId", "year", "month");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProgress" ADD CONSTRAINT "UserProgress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAssessment" ADD CONSTRAINT "UserAssessment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teams" ADD CONSTRAINT "Teams_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTemplates" ADD CONSTRAINT "ChecklistTemplates_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateItems" ADD CONSTRAINT "TemplateItems_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReports" ADD CONSTRAINT "DailyReports_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportDetails" ADD CONSTRAINT "ReportDetails_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "TemplateItems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportDetails" ADD CONSTRAINT "ReportDetails_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "DailyReports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSignatures" ADD CONSTRAINT "ReportSignatures_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "DailyReports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSignatures" ADD CONSTRAINT "ReportSignatures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyApproval" ADD CONSTRAINT "MonthlyApproval_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyApproval" ADD CONSTRAINT "MonthlyApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
