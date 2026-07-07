/*
  Warnings:

  - You are about to drop the column `codigo_temporal` on the `HitosNino` table. All the data in the column will be lost.
  - You are about to drop the column `cui` on the `HitosNino` table. All the data in the column will be lost.
  - You are about to drop the column `edad_meses` on the `HitosNino` table. All the data in the column will be lost.
  - You are about to drop the column `mes_seleccionado_id` on the `HitosNino` table. All the data in the column will be lost.
  - You are about to drop the column `mes_seleccionado_label` on the `HitosNino` table. All the data in the column will be lost.
  - You are about to drop the column `motivo_id` on the `HitosNino` table. All the data in the column will be lost.
  - You are about to drop the column `nombre_madre` on the `HitosNino` table. All the data in the column will be lost.
  - You are about to drop the column `rango_hitos_id` on the `HitosNino` table. All the data in the column will be lost.
  - You are about to drop the column `responses_adicionales` on the `HitosNino` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."HitosNino_codigo_temporal_idx";

-- DropIndex
DROP INDEX "public"."HitosNino_cui_idx";

-- DropIndex
DROP INDEX "public"."HitosNino_rango_hitos_id_idx";

-- AlterTable
ALTER TABLE "public"."HitosNino" DROP COLUMN "codigo_temporal",
DROP COLUMN "cui",
DROP COLUMN "edad_meses",
DROP COLUMN "mes_seleccionado_id",
DROP COLUMN "mes_seleccionado_label",
DROP COLUMN "motivo_id",
DROP COLUMN "nombre_madre",
DROP COLUMN "rango_hitos_id",
DROP COLUMN "responses_adicionales",
ADD COLUMN     "responses" JSONB;
