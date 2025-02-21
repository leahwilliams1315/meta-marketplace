/*
  Warnings:

  - You are about to drop the column `marketplaceId` on the `Product` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_marketplaceId_fkey";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "marketplaceId";

-- CreateIndex
CREATE INDEX "Product_sellerId_idx" ON "Product"("sellerId");
