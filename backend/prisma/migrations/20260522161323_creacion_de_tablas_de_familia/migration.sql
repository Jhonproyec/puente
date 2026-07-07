-- CreateEnum
CREATE TYPE "public"."RolFamilia" AS ENUM ('MADRE', 'PADRE', 'NINO', 'ENCARGADO');

-- AlterTable
ALTER TABLE "public"."FormularioRespuesta" ADD COLUMN     "id_familia" INTEGER;

-- CreateTable
CREATE TABLE "public"."Familia" (
    "id_familia" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "id_comunidad" INTEGER NOT NULL,
    "id_madre" INTEGER NOT NULL,
    "estado_registro" BOOLEAN NOT NULL DEFAULT true,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_edicion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Familia_pkey" PRIMARY KEY ("id_familia")
);

-- CreateTable
CREATE TABLE "public"."FamiliaIntegrante" (
    "id_familia" INTEGER NOT NULL,
    "id_persona" INTEGER NOT NULL,
    "rol" "public"."RolFamilia" NOT NULL,
    "estado_registro" BOOLEAN NOT NULL DEFAULT true,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_edicion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamiliaIntegrante_pkey" PRIMARY KEY ("id_familia","id_persona")
);

-- CreateIndex
CREATE UNIQUE INDEX "Familia_codigo_key" ON "public"."Familia"("codigo");

-- CreateIndex
CREATE INDEX "Familia_id_comunidad_idx" ON "public"."Familia"("id_comunidad");

-- CreateIndex
CREATE INDEX "Familia_id_madre_idx" ON "public"."Familia"("id_madre");

-- CreateIndex
CREATE INDEX "Familia_codigo_idx" ON "public"."Familia"("codigo");

-- CreateIndex
CREATE INDEX "Familia_estado_registro_idx" ON "public"."Familia"("estado_registro");

-- CreateIndex
CREATE INDEX "Familia_id_comunidad_estado_registro_idx" ON "public"."Familia"("id_comunidad", "estado_registro");

-- CreateIndex
CREATE INDEX "FamiliaIntegrante_id_familia_idx" ON "public"."FamiliaIntegrante"("id_familia");

-- CreateIndex
CREATE INDEX "FamiliaIntegrante_id_persona_idx" ON "public"."FamiliaIntegrante"("id_persona");

-- CreateIndex
CREATE INDEX "FamiliaIntegrante_rol_idx" ON "public"."FamiliaIntegrante"("rol");

-- CreateIndex
CREATE INDEX "FormularioRespuesta_id_familia_idx" ON "public"."FormularioRespuesta"("id_familia");

-- AddForeignKey
ALTER TABLE "public"."FormularioRespuesta" ADD CONSTRAINT "FormularioRespuesta_id_familia_fkey" FOREIGN KEY ("id_familia") REFERENCES "public"."Familia"("id_familia") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Familia" ADD CONSTRAINT "Familia_id_comunidad_fkey" FOREIGN KEY ("id_comunidad") REFERENCES "public"."Comunidad"("id_comunidad") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Familia" ADD CONSTRAINT "Familia_id_madre_fkey" FOREIGN KEY ("id_madre") REFERENCES "public"."Persona"("id_persona") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FamiliaIntegrante" ADD CONSTRAINT "FamiliaIntegrante_id_familia_fkey" FOREIGN KEY ("id_familia") REFERENCES "public"."Familia"("id_familia") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FamiliaIntegrante" ADD CONSTRAINT "FamiliaIntegrante_id_persona_fkey" FOREIGN KEY ("id_persona") REFERENCES "public"."Persona"("id_persona") ON DELETE RESTRICT ON UPDATE CASCADE;
