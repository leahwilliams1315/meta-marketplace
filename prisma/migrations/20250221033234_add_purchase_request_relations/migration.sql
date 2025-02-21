/*
  Warnings:

  - You are about to drop the column `items` on the `PurchaseRequest` table. All the data in the column will be lost.
  - Added the required column `priceId` to the `PurchaseRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productId` to the `PurchaseRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellerId` to the `PurchaseRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PurchaseRequest" DROP COLUMN "items",
ADD COLUMN     "priceId" TEXT NOT NULL,
ADD COLUMN     "productId" TEXT NOT NULL,
ADD COLUMN     "sellerId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Price_marketplaceId_idx" ON "Price"("marketplaceId");

-- CreateIndex
CREATE INDEX "Price_productId_idx" ON "Price"("productId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_buyerId_idx" ON "PurchaseRequest"("buyerId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_sellerId_idx" ON "PurchaseRequest"("sellerId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_productId_idx" ON "PurchaseRequest"("productId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_priceId_idx" ON "PurchaseRequest"("priceId");

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_priceId_fkey" FOREIGN KEY ("priceId") REFERENCES "Price"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
