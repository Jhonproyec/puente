-- AlterTable
ALTER TABLE "public"."Catalog" ADD COLUMN     "campo_fintro" TEXT,
ADD COLUMN     "tiene_cascada" BOOLEAN NOT NULL DEFAULT false;
