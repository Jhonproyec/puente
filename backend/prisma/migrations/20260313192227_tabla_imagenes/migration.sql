-- CreateTable
CREATE TABLE "public"."CatalogoImagenes" (
    "id_catalogo_imagen" SERIAL NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "nombre_archivo" VARCHAR(255) NOT NULL,
    "ruta" VARCHAR(500) NOT NULL,
    "size" DOUBLE PRECISION NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "estado_registro" BOOLEAN NOT NULL DEFAULT true,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_edicion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogoImagenes_pkey" PRIMARY KEY ("id_catalogo_imagen")
);

-- CreateIndex
CREATE INDEX "CatalogoImagenes_estado_registro_idx" ON "public"."CatalogoImagenes"("estado_registro");

-- CreateIndex
CREATE INDEX "CatalogoImagenes_nombre_idx" ON "public"."CatalogoImagenes"("nombre");

-- CreateIndex
CREATE INDEX "CatalogoImagenes_fecha_registro_idx" ON "public"."CatalogoImagenes"("fecha_registro");
