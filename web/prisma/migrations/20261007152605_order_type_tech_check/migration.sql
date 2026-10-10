-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('ORDER', 'TECH_CHECK');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "type" "OrderType" NOT NULL DEFAULT 'ORDER',
ALTER COLUMN "name" SET DEFAULT '',
ALTER COLUMN "delivery" DROP NOT NULL;
