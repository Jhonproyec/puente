/*
  Warnings:

  - You are about to drop the column `campo_fintro` on the `Catalog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Catalog" DROP COLUMN "campo_fintro",
ADD COLUMN     "campo_filtro" TEXT;
