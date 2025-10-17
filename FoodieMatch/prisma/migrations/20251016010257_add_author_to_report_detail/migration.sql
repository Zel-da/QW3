-- AlterTable
ALTER TABLE "ReportDetails" ADD COLUMN     "authorId" TEXT;

-- CreateIndex
CREATE INDEX "ReportDetails_authorId_idx" ON "ReportDetails"("authorId");

-- AddForeignKey
ALTER TABLE "ReportDetails" ADD CONSTRAINT "ReportDetails_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
