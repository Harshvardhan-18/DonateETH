/*
  Warnings:

  - You are about to drop the column `donorUserId` on the `DonationTransaction` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `NGOProfile` table. All the data in the column will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[walletAddress]` on the table `NGOProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "DonationTransaction" DROP CONSTRAINT "DonationTransaction_donorUserId_fkey";

-- DropForeignKey
ALTER TABLE "NGOProfile" DROP CONSTRAINT "NGOProfile_userId_fkey";

-- DropIndex
DROP INDEX "NGOProfile_userId_key";

-- AlterTable
ALTER TABLE "DonationTransaction" DROP COLUMN "donorUserId";

-- AlterTable
ALTER TABLE "NGOProfile" DROP COLUMN "userId",
ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "walletAddress" TEXT;

-- DropTable
DROP TABLE "User";

-- DropEnum
DROP TYPE "UserRole";

-- CreateIndex
CREATE UNIQUE INDEX "NGOProfile_walletAddress_key" ON "NGOProfile"("walletAddress");
