-- CreateTable
CREATE TABLE "public"."CentroNutreme" (
    "id_centro_nutreme" SERIAL NOT NULL,
    "uuid" VARCHAR(36) NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "id_comunidad" INTEGER NOT NULL,
    "id_usuario" INTEGER,
    "coordenadas" VARCHAR(100),
    "qr_path" VARCHAR(500),
    "estado_registro" BOOLEAN NOT NULL DEFAULT true,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_edicion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CentroNutreme_pkey" PRIMARY KEY ("id_centro_nutreme")
);

-- CreateIndex
CREATE UNIQUE INDEX "CentroNutreme_uuid_key" ON "public"."CentroNutreme"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "CentroNutreme_codigo_key" ON "public"."CentroNutreme"("codigo");

-- CreateIndex
CREATE INDEX "CentroNutreme_id_comunidad_idx" ON "public"."CentroNutreme"("id_comunidad");

-- CreateIndex
CREATE INDEX "CentroNutreme_id_usuario_idx" ON "public"."CentroNutreme"("id_usuario");

-- CreateIndex
CREATE INDEX "CentroNutreme_estado_registro_idx" ON "public"."CentroNutreme"("estado_registro");

-- CreateIndex
CREATE INDEX "CentroNutreme_codigo_idx" ON "public"."CentroNutreme"("codigo");

-- AddForeignKey
ALTER TABLE "public"."CentroNutreme" ADD CONSTRAINT "CentroNutreme_id_comunidad_fkey" FOREIGN KEY ("id_comunidad") REFERENCES "public"."Comunidad"("id_comunidad") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CentroNutreme" ADD CONSTRAINT "CentroNutreme_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."Usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;
