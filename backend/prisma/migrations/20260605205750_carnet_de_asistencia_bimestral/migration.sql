-- AlterTable
ALTER TABLE "public"."Persona" ADD COLUMN     "qr_path" VARCHAR(500),
ADD COLUMN     "registro_incompleto" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."CarnetBimestre" (
    "id_carnet_bimestre" SERIAL NOT NULL,
    "id_respuesta" INTEGER NOT NULL,
    "id_persona" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "bimestre" INTEGER NOT NULL,
    "huellas" JSONB NOT NULL,
    "estado_registro" BOOLEAN NOT NULL DEFAULT true,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_edicion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarnetBimestre_pkey" PRIMARY KEY ("id_carnet_bimestre")
);

-- CreateIndex
CREATE INDEX "CarnetBimestre_id_respuesta_idx" ON "public"."CarnetBimestre"("id_respuesta");

-- CreateIndex
CREATE INDEX "CarnetBimestre_id_persona_idx" ON "public"."CarnetBimestre"("id_persona");

-- CreateIndex
CREATE INDEX "CarnetBimestre_bimestre_idx" ON "public"."CarnetBimestre"("bimestre");

-- CreateIndex
CREATE INDEX "CarnetBimestre_mes_idx" ON "public"."CarnetBimestre"("mes");

-- CreateIndex
CREATE INDEX "CarnetBimestre_estado_registro_idx" ON "public"."CarnetBimestre"("estado_registro");

-- CreateIndex
CREATE UNIQUE INDEX "CarnetBimestre_id_respuesta_mes_key" ON "public"."CarnetBimestre"("id_respuesta", "mes");

-- CreateIndex
CREATE INDEX "Persona_registro_incompleto_idx" ON "public"."Persona"("registro_incompleto");

-- AddForeignKey
ALTER TABLE "public"."CarnetBimestre" ADD CONSTRAINT "CarnetBimestre_id_respuesta_fkey" FOREIGN KEY ("id_respuesta") REFERENCES "public"."FormularioRespuesta"("id_respuesta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CarnetBimestre" ADD CONSTRAINT "CarnetBimestre_id_persona_fkey" FOREIGN KEY ("id_persona") REFERENCES "public"."Persona"("id_persona") ON DELETE RESTRICT ON UPDATE CASCADE;
