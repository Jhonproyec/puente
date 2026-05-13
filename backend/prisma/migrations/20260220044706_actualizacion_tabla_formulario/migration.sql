/*
  Warnings:

  - The primary key for the `Formulario` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `activo` on the `Formulario` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `Formulario` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Formulario_activo_idx";

-- DropIndex
DROP INDEX "public"."Formulario_estado_activo_idx";

-- DropIndex
DROP INDEX "public"."Formulario_usuario_registro_activo_idx";

-- AlterTable
ALTER TABLE "public"."Formulario" DROP CONSTRAINT "Formulario_pkey",
DROP COLUMN "activo",
DROP COLUMN "id",
ADD COLUMN     "estado_registro" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "id_formulario" SERIAL NOT NULL,
ADD CONSTRAINT "Formulario_pkey" PRIMARY KEY ("id_formulario");

-- CreateIndex
CREATE INDEX "Formulario_estado_registro_idx" ON "public"."Formulario"("estado_registro");

-- CreateIndex
CREATE INDEX "Formulario_estado_estado_registro_idx" ON "public"."Formulario"("estado", "estado_registro");

-- CreateIndex
CREATE INDEX "Formulario_usuario_registro_estado_registro_idx" ON "public"."Formulario"("usuario_registro", "estado_registro");
