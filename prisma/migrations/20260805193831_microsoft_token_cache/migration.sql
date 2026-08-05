/*
  Warnings:

  - You are about to drop the column `accessToken` on the `microsoft_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `microsoft_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `refreshToken` on the `microsoft_accounts` table. All the data in the column will be lost.
  - Added the required column `tokenCache` to the `microsoft_accounts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "microsoft_accounts" DROP COLUMN "accessToken",
DROP COLUMN "expiresAt",
DROP COLUMN "refreshToken",
ADD COLUMN     "tokenCache" TEXT NOT NULL;
