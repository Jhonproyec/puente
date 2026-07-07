-- CreateTable
CREATE TABLE "public"."HitosEncuesta" (
    "id_encuesta" SERIAL NOT NULL,
    "uuid" VARCHAR(36) NOT NULL,
    "id_formulario" INTEGER NOT NULL,
    "id_comunidad" INTEGER NOT NULL,
    "id_usuario" INTEGER,
    "cantidad_ninos" INTEGER NOT NULL DEFAULT 0,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'completa',
    "estado_registro" BOOLEAN NOT NULL DEFAULT true,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_edicion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HitosEncuesta_pkey" PRIMARY KEY ("id_encuesta")
);

-- CreateTable
CREATE TABLE "public"."HitosNino" (
    "id_nino" SERIAL NOT NULL,
    "uuid" VARCHAR(36) NOT NULL,
    "id_encuesta" INTEGER NOT NULL,
    "id_persona" INTEGER,
    "indice" INTEGER NOT NULL,
    "nombres" VARCHAR(150) NOT NULL,
    "apellidos" VARCHAR(150) NOT NULL,
    "cui" VARCHAR(20),
    "codigo_temporal" VARCHAR(20),
    "edad_meses" INTEGER,
    "nombre_madre" VARCHAR(150),
    "tiene_consentimiento" BOOLEAN NOT NULL DEFAULT true,
    "motivo_id" VARCHAR(10),
    "rango_hitos_id" VARCHAR(10),
    "mes_seleccionado_id" VARCHAR(10),
    "mes_seleccionado_label" VARCHAR(50),
    "tabla_element_id" VARCHAR(100),
    "responses_adicionales" JSONB,
    "estado_registro" BOOLEAN NOT NULL DEFAULT true,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_edicion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HitosNino_pkey" PRIMARY KEY ("id_nino")
);

-- CreateTable
CREATE TABLE "public"."HitosTablaRespuesta" (
    "id_tabla_resp" SERIAL NOT NULL,
    "id_nino" INTEGER NOT NULL,
    "table_element_id" VARCHAR(100) NOT NULL,
    "row_id" VARCHAR(50) NOT NULL,
    "group_id" VARCHAR(100) NOT NULL,
    "col_id" VARCHAR(50) NOT NULL,
    "estado_registro" BOOLEAN NOT NULL DEFAULT true,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_edicion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HitosTablaRespuesta_pkey" PRIMARY KEY ("id_tabla_resp")
);

-- CreateIndex
CREATE UNIQUE INDEX "HitosEncuesta_uuid_key" ON "public"."HitosEncuesta"("uuid");

-- CreateIndex
CREATE INDEX "HitosEncuesta_id_formulario_idx" ON "public"."HitosEncuesta"("id_formulario");

-- CreateIndex
CREATE INDEX "HitosEncuesta_id_comunidad_idx" ON "public"."HitosEncuesta"("id_comunidad");

-- CreateIndex
CREATE INDEX "HitosEncuesta_id_usuario_idx" ON "public"."HitosEncuesta"("id_usuario");

-- CreateIndex
CREATE INDEX "HitosEncuesta_estado_registro_idx" ON "public"."HitosEncuesta"("estado_registro");

-- CreateIndex
CREATE INDEX "HitosEncuesta_fecha_registro_idx" ON "public"."HitosEncuesta"("fecha_registro");

-- CreateIndex
CREATE INDEX "HitosEncuesta_id_formulario_id_comunidad_idx" ON "public"."HitosEncuesta"("id_formulario", "id_comunidad");

-- CreateIndex
CREATE INDEX "HitosEncuesta_id_formulario_id_comunidad_fecha_registro_idx" ON "public"."HitosEncuesta"("id_formulario", "id_comunidad", "fecha_registro");

-- CreateIndex
CREATE INDEX "HitosEncuesta_id_comunidad_fecha_registro_idx" ON "public"."HitosEncuesta"("id_comunidad", "fecha_registro");

-- CreateIndex
CREATE INDEX "HitosEncuesta_id_usuario_estado_registro_idx" ON "public"."HitosEncuesta"("id_usuario", "estado_registro");

-- CreateIndex
CREATE INDEX "HitosEncuesta_estado_estado_registro_idx" ON "public"."HitosEncuesta"("estado", "estado_registro");

-- CreateIndex
CREATE UNIQUE INDEX "HitosNino_uuid_key" ON "public"."HitosNino"("uuid");

-- CreateIndex
CREATE INDEX "HitosNino_id_encuesta_idx" ON "public"."HitosNino"("id_encuesta");

-- CreateIndex
CREATE INDEX "HitosNino_id_persona_idx" ON "public"."HitosNino"("id_persona");

-- CreateIndex
CREATE INDEX "HitosNino_estado_registro_idx" ON "public"."HitosNino"("estado_registro");

-- CreateIndex
CREATE INDEX "HitosNino_id_encuesta_indice_idx" ON "public"."HitosNino"("id_encuesta", "indice");

-- CreateIndex
CREATE INDEX "HitosNino_cui_idx" ON "public"."HitosNino"("cui");

-- CreateIndex
CREATE INDEX "HitosNino_codigo_temporal_idx" ON "public"."HitosNino"("codigo_temporal");

-- CreateIndex
CREATE INDEX "HitosNino_tiene_consentimiento_idx" ON "public"."HitosNino"("tiene_consentimiento");

-- CreateIndex
CREATE INDEX "HitosNino_rango_hitos_id_idx" ON "public"."HitosNino"("rango_hitos_id");

-- CreateIndex
CREATE INDEX "HitosNino_id_encuesta_tiene_consentimiento_idx" ON "public"."HitosNino"("id_encuesta", "tiene_consentimiento");

-- CreateIndex
CREATE INDEX "HitosNino_id_encuesta_estado_registro_idx" ON "public"."HitosNino"("id_encuesta", "estado_registro");

-- CreateIndex
CREATE INDEX "HitosTablaRespuesta_id_nino_idx" ON "public"."HitosTablaRespuesta"("id_nino");

-- CreateIndex
CREATE INDEX "HitosTablaRespuesta_table_element_id_idx" ON "public"."HitosTablaRespuesta"("table_element_id");

-- CreateIndex
CREATE INDEX "HitosTablaRespuesta_estado_registro_idx" ON "public"."HitosTablaRespuesta"("estado_registro");

-- CreateIndex
CREATE INDEX "HitosTablaRespuesta_id_nino_table_element_id_idx" ON "public"."HitosTablaRespuesta"("id_nino", "table_element_id");

-- CreateIndex
CREATE INDEX "HitosTablaRespuesta_row_id_idx" ON "public"."HitosTablaRespuesta"("row_id");

-- CreateIndex
CREATE INDEX "HitosTablaRespuesta_group_id_idx" ON "public"."HitosTablaRespuesta"("group_id");

-- CreateIndex
CREATE INDEX "HitosTablaRespuesta_col_id_idx" ON "public"."HitosTablaRespuesta"("col_id");

-- CreateIndex
CREATE UNIQUE INDEX "HitosTablaRespuesta_id_nino_table_element_id_row_id_group_i_key" ON "public"."HitosTablaRespuesta"("id_nino", "table_element_id", "row_id", "group_id");

-- AddForeignKey
ALTER TABLE "public"."HitosEncuesta" ADD CONSTRAINT "HitosEncuesta_id_formulario_fkey" FOREIGN KEY ("id_formulario") REFERENCES "public"."Formulario"("id_formulario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HitosEncuesta" ADD CONSTRAINT "HitosEncuesta_id_comunidad_fkey" FOREIGN KEY ("id_comunidad") REFERENCES "public"."Comunidad"("id_comunidad") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HitosEncuesta" ADD CONSTRAINT "HitosEncuesta_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."Usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HitosNino" ADD CONSTRAINT "HitosNino_id_encuesta_fkey" FOREIGN KEY ("id_encuesta") REFERENCES "public"."HitosEncuesta"("id_encuesta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HitosNino" ADD CONSTRAINT "HitosNino_id_persona_fkey" FOREIGN KEY ("id_persona") REFERENCES "public"."Persona"("id_persona") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HitosTablaRespuesta" ADD CONSTRAINT "HitosTablaRespuesta_id_nino_fkey" FOREIGN KEY ("id_nino") REFERENCES "public"."HitosNino"("id_nino") ON DELETE CASCADE ON UPDATE CASCADE;
