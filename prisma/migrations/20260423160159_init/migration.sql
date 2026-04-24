/*
  Warnings:

  - You are about to drop the column `sportName` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `teamA` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `teamB` on the `Match` table. All the data in the column will be lost.
  - The `status` column on the `Match` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `sportName` on the `Team` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[teamId,jerseyNo]` on the table `Player` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sportId,teamName]` on the table `Team` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sportId` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teamAId` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teamBId` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Made the column `teamId` on table `Player` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `department` to the `Team` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sportId` to the `Team` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Format" AS ENUM ('KNOCKOUT', 'ROUND_ROBIN', 'GROUP_KNOCKOUT');

-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_teamA_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_teamB_fkey";

-- DropForeignKey
ALTER TABLE "Player" DROP CONSTRAINT "Player_teamId_fkey";

-- AlterTable
ALTER TABLE "Match" DROP COLUMN "sportName",
DROP COLUMN "teamA",
DROP COLUMN "teamB",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "round" TEXT,
ADD COLUMN     "sportId" TEXT NOT NULL,
ADD COLUMN     "teamAId" TEXT NOT NULL,
ADD COLUMN     "teamBId" TEXT NOT NULL,
ADD COLUMN     "winnerId" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "MatchStatus" NOT NULL DEFAULT 'UPCOMING';

-- AlterTable
ALTER TABLE "Player" ALTER COLUMN "teamId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "sportName",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "department" TEXT NOT NULL,
ADD COLUMN     "sportId" TEXT NOT NULL,
ADD COLUMN     "status" "TeamStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "Sport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "format" "Format" NOT NULL DEFAULT 'KNOCKOUT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sport_name_key" ON "Sport"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Player_teamId_jerseyNo_key" ON "Player"("teamId", "jerseyNo");

-- CreateIndex
CREATE UNIQUE INDEX "Team_sportId_teamName_key" ON "Team"("sportId", "teamName");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_teamAId_fkey" FOREIGN KEY ("teamAId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_teamBId_fkey" FOREIGN KEY ("teamBId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
