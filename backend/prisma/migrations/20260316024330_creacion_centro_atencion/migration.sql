-- CreateTable
CREATE TABLE "public"."CentroAtencion" (
    "id_centro" SERIAL NOT NULL,
    "id_comunidad" INTEGER NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "estado_registro" BOOLEAN NOT NULL DEFAULT true,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_edicion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CentroAtencion_pkey" PRIMARY KEY ("id_centro")
);

-- CreateIndex
CREATE INDEX "CentroAtencion_id_comunidad_estado_registro_idx" ON "public"."CentroAtencion"("id_comunidad", "estado_registro");

-- CreateIndex
CREATE INDEX "CentroAtencion_estado_registro_idx" ON "public"."CentroAtencion"("estado_registro");

-- CreateIndex
CREATE UNIQUE INDEX "CentroAtencion_id_comunidad_nombre_key" ON "public"."CentroAtencion"("id_comunidad", "nombre");

-- AddForeignKey
ALTER TABLE "public"."CentroAtencion" ADD CONSTRAINT "CentroAtencion_id_comunidad_fkey" FOREIGN KEY ("id_comunidad") REFERENCES "public"."Comunidad"("id_comunidad") ON DELETE CASCADE ON UPDATE CASCADE;
