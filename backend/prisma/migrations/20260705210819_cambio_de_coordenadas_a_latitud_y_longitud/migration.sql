/*
  Warnings:

  - You are about to drop the column `coordenadas` on the `CentroNutreme` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."CentroNutreme" DROP COLUMN "coordenadas",
ADD COLUMN     "latitud" DOUBLE PRECISION,
ADD COLUMN     "longitud" DOUBLE PRECISION;
