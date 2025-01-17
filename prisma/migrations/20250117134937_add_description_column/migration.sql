/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Room` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "description" TEXT,
ADD COLUMN     "priceType" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Room_name_key" ON "Room"("name");
