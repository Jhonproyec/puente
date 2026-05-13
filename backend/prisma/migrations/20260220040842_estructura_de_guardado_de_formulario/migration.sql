-- CreateEnum
CREATE TYPE "public"."EstadoForm" AS ENUM ('BORRADOR', 'PUBLICADO');

-- CreateTable
CREATE TABLE "public"."Formulario" (
    "id" SERIAL NOT NULL,
    "uuid" VARCHAR(36) NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "estado" "public"."EstadoForm" NOT NULL DEFAULT 'BORRADOR',
    "version" INTEGER NOT NULL DEFAULT 1,
    "estructura" JSON NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "usuario_registro" INTEGER NOT NULL,
    "usuario_modifico" INTEGER,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_edicion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Formulario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Formulario_uuid_key" ON "public"."Formulario"("uuid");

-- CreateIndex
CREATE INDEX "Formulario_estado_idx" ON "public"."Formulario"("estado");

-- CreateIndex
CREATE INDEX "Formulario_activo_idx" ON "public"."Formulario"("activo");

-- CreateIndex
CREATE INDEX "Formulario_fecha_registro_idx" ON "public"."Formulario"("fecha_registro");

-- CreateIndex
CREATE INDEX "Formulario_fecha_edicion_idx" ON "public"."Formulario"("fecha_edicion");

-- CreateIndex
CREATE INDEX "Formulario_estado_activo_idx" ON "public"."Formulario"("estado", "activo");

-- CreateIndex
CREATE INDEX "Formulario_usuario_registro_activo_idx" ON "public"."Formulario"("usuario_registro", "activo");
