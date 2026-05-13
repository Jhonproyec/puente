/*
  Warnings:

  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "public"."Formulario_estado_estado_registro_idx";

-- DropIndex
DROP INDEX "public"."Formulario_fecha_edicion_idx";

-- DropTable
DROP TABLE "public"."users";

-- DropEnum
DROP TYPE "public"."Role";

-- CreateTable
CREATE TABLE "public"."Usuario" (
    "id_usuario" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "id_rol" INTEGER NOT NULL,
    "estado_registro" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_edicion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "public"."FormularioUsuario" (
    "id_formulario" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,

    CONSTRAINT "FormularioUsuario_pkey" PRIMARY KEY ("id_formulario","id_usuario")
);

-- CreateTable
CREATE TABLE "public"."FormularioRespuesta" (
    "id_respuesta" SERIAL NOT NULL,
    "id_formulario" INTEGER NOT NULL,
    "id_usuario" INTEGER,
    "datos" JSON NOT NULL,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormularioRespuesta_pkey" PRIMARY KEY ("id_respuesta")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "public"."Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_estado_registro_idx" ON "public"."Usuario"("estado_registro");

-- CreateIndex
CREATE INDEX "FormularioUsuario_id_usuario_idx" ON "public"."FormularioUsuario"("id_usuario");

-- CreateIndex
CREATE INDEX "FormularioRespuesta_id_formulario_idx" ON "public"."FormularioRespuesta"("id_formulario");

-- CreateIndex
CREATE INDEX "FormularioRespuesta_fecha_registro_idx" ON "public"."FormularioRespuesta"("fecha_registro");

-- CreateIndex
CREATE INDEX "Formulario_estado_usuario_registro_idx" ON "public"."Formulario"("estado", "usuario_registro");

-- CreateIndex
CREATE INDEX "Rol_estado_registro_idx" ON "public"."Rol"("estado_registro");

-- AddForeignKey
ALTER TABLE "public"."Usuario" ADD CONSTRAINT "Usuario_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "public"."Rol"("id_rol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Formulario" ADD CONSTRAINT "Formulario_usuario_registro_fkey" FOREIGN KEY ("usuario_registro") REFERENCES "public"."Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Formulario" ADD CONSTRAINT "Formulario_usuario_modifico_fkey" FOREIGN KEY ("usuario_modifico") REFERENCES "public"."Usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FormularioUsuario" ADD CONSTRAINT "FormularioUsuario_id_formulario_fkey" FOREIGN KEY ("id_formulario") REFERENCES "public"."Formulario"("id_formulario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FormularioUsuario" ADD CONSTRAINT "FormularioUsuario_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FormularioRespuesta" ADD CONSTRAINT "FormularioRespuesta_id_formulario_fkey" FOREIGN KEY ("id_formulario") REFERENCES "public"."Formulario"("id_formulario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FormularioRespuesta" ADD CONSTRAINT "FormularioRespuesta_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."Usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;
