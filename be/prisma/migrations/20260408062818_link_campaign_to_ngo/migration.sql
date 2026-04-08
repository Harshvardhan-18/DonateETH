/*
  Warnings:

  - Made the column `ngoId` on table `Campaign` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Campaign" DROP CONSTRAINT "Campaign_ngoId_fkey";

-- AlterTable
ALTER TABLE "Campaign" ALTER COLUMN "ngoId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_ngoId_fkey" FOREIGN KEY ("ngoId") REFERENCES "NGOProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
