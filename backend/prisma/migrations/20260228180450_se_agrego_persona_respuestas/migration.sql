/*
  Warnings:

  - Added the required column `fecha_edicion` to the `FormularioRespuesta` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."FormularioRespuesta" ADD COLUMN     "datos_limpios" JSON,
ADD COLUMN     "estado_registro" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "fecha_edicion" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "id_comunidad" INTEGER,
ADD COLUMN     "id_departamento" INTEGER,
ADD COLUMN     "version_form" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "public"."Persona" (
    "id_persona" SERIAL NOT NULL,
    "cui" VARCHAR(13) NOT NULL,
    "nombres" VARCHAR(150) NOT NULL,
    "apellidos" VARCHAR(150) NOT NULL,
    "fecha_nacimiento" TIMESTAMP(3),
    "sexo" INTEGER,
    "direccion" VARCHAR(255),
    "fecha_ingreso_programa" TIMESTAMP(3),
    "cui_madre" VARCHAR(13),
    "tipo_persona" VARCHAR(20),
    "id_comunidad" INTEGER,
    "datos_extra" JSON,
    "estado_registro" BOOLEAN NOT NULL DEFAULT true,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_edicion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id_persona")
);

-- CreateTable
CREATE TABLE "public"."FormularioRespuestaPersona" (
    "id_respuesta" INTEGER NOT NULL,
    "id_persona" INTEGER NOT NULL,
    "rol_en_form" VARCHAR(50),

    CONSTRAINT "FormularioRespuestaPersona_pkey" PRIMARY KEY ("id_respuesta","id_persona")
);

-- CreateIndex
CREATE UNIQUE INDEX "Persona_cui_key" ON "public"."Persona"("cui");

-- CreateIndex
CREATE INDEX "Persona_cui_idx" ON "public"."Persona"("cui");

-- CreateIndex
CREATE INDEX "Persona_tipo_persona_idx" ON "public"."Persona"("tipo_persona");

-- CreateIndex
CREATE INDEX "Persona_id_comunidad_idx" ON "public"."Persona"("id_comunidad");

-- CreateIndex
CREATE INDEX "Persona_fecha_nacimiento_idx" ON "public"."Persona"("fecha_nacimiento");

-- CreateIndex
CREATE INDEX "Persona_tipo_persona_id_comunidad_idx" ON "public"."Persona"("tipo_persona", "id_comunidad");

-- CreateIndex
CREATE INDEX "Persona_estado_registro_idx" ON "public"."Persona"("estado_registro");

-- CreateIndex
CREATE INDEX "FormularioRespuestaPersona_id_persona_idx" ON "public"."FormularioRespuestaPersona"("id_persona");

-- CreateIndex
CREATE INDEX "FormularioRespuestaPersona_rol_en_form_idx" ON "public"."FormularioRespuestaPersona"("rol_en_form");

-- CreateIndex
CREATE INDEX "FormularioRespuesta_id_formulario_version_form_idx" ON "public"."FormularioRespuesta"("id_formulario", "version_form");

-- CreateIndex
CREATE INDEX "FormularioRespuesta_id_usuario_idx" ON "public"."FormularioRespuesta"("id_usuario");

-- CreateIndex
CREATE INDEX "FormularioRespuesta_id_comunidad_idx" ON "public"."FormularioRespuesta"("id_comunidad");

-- CreateIndex
CREATE INDEX "FormularioRespuesta_id_departamento_idx" ON "public"."FormularioRespuesta"("id_departamento");

-- CreateIndex
CREATE INDEX "FormularioRespuesta_estado_registro_idx" ON "public"."FormularioRespuesta"("estado_registro");

-- CreateIndex
CREATE INDEX "FormularioRespuesta_id_formulario_id_comunidad_fecha_regist_idx" ON "public"."FormularioRespuesta"("id_formulario", "id_comunidad", "fecha_registro");

-- CreateIndex
CREATE INDEX "FormularioRespuesta_id_formulario_id_departamento_fecha_reg_idx" ON "public"."FormularioRespuesta"("id_formulario", "id_departamento", "fecha_registro");

-- AddForeignKey
ALTER TABLE "public"."FormularioRespuesta" ADD CONSTRAINT "FormularioRespuesta_id_comunidad_fkey" FOREIGN KEY ("id_comunidad") REFERENCES "public"."Comunidad"("id_comunidad") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FormularioRespuesta" ADD CONSTRAINT "FormularioRespuesta_id_departamento_fkey" FOREIGN KEY ("id_departamento") REFERENCES "public"."Departamento"("id_departamento") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Persona" ADD CONSTRAINT "Persona_id_comunidad_fkey" FOREIGN KEY ("id_comunidad") REFERENCES "public"."Comunidad"("id_comunidad") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FormularioRespuestaPersona" ADD CONSTRAINT "FormularioRespuestaPersona_id_respuesta_fkey" FOREIGN KEY ("id_respuesta") REFERENCES "public"."FormularioRespuesta"("id_respuesta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FormularioRespuestaPersona" ADD CONSTRAINT "FormularioRespuestaPersona_id_persona_fkey" FOREIGN KEY ("id_persona") REFERENCES "public"."Persona"("id_persona") ON DELETE RESTRICT ON UPDATE CASCADE;
