-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "priceFrom" DECIMAL(12,2);

-- CreateIndex
CREATE INDEX "Product_priceFrom_idx" ON "Product"("priceFrom");
