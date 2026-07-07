-- AlterTable
ALTER TABLE "public"."Usuario" ADD COLUMN     "dpi" INTEGER;

-- CreateIndex
CREATE INDEX "Usuario_dpi_idx" ON "public"."Usuario"("dpi");
