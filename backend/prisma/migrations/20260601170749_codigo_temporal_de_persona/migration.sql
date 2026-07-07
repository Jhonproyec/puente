/*
  Warnings:

  - A unique constraint covering the columns `[codigo_temporal]` on the table `Persona` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Persona" ADD COLUMN     "codigo_temporal" VARCHAR(20);

-- CreateIndex
CREATE UNIQUE INDEX "Persona_codigo_temporal_key" ON "public"."Persona"("codigo_temporal");

-- CreateIndex
CREATE INDEX "Persona_codigo_temporal_idx" ON "public"."Persona"("codigo_temporal");
