-- CreateIndex
CREATE INDEX "Usuario_id_rol_idx" ON "public"."Usuario"("id_rol");

-- CreateIndex
CREATE INDEX "Usuario_fecha_creacion_idx" ON "public"."Usuario"("fecha_creacion");

-- CreateIndex
CREATE INDEX "Usuario_estado_registro_fecha_creacion_idx" ON "public"."Usuario"("estado_registro", "fecha_creacion");

-- CreateIndex
CREATE INDEX "Usuario_email_estado_registro_idx" ON "public"."Usuario"("email", "estado_registro");
