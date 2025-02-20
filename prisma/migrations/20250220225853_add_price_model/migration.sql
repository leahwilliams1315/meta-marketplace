/*
  Warnings:

  - You are about to drop the column `price` on the `Product` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PaymentStyle" AS ENUM ('INSTANT', 'REQUEST');

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "price",
ADD COLUMN     "totalQuantity" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Price" (
    "id" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "unitAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "paymentStyle" "PaymentStyle" NOT NULL DEFAULT 'INSTANT',
    "allocatedQuantity" INTEGER NOT NULL DEFAULT 0,
    "marketplaceId" TEXT,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Price_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "Marketplace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
