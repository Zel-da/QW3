/*
  Warnings:

  - Added the required column `site` to the `Teams` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Teams" ADD COLUMN     "site" TEXT NOT NULL;
