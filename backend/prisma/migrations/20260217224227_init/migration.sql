-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'SELLER');

-- CreateEnum
CREATE TYPE "public"."Accion" AS ENUM ('VIEW', 'CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "public"."users" (
    "idUser" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'SELLER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("idUser")
);

-- CreateTable
CREATE TABLE "public"."Modulo" (
    "id_modulo" SERIAL NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "estado_registro" BOOLEAN NOT NULL DEFAULT true,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_edicion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Modulo_pkey" PRIMARY KEY ("id_modulo")
);

-- CreateTable
CREATE TABLE "public"."Permiso" (
    "id_permiso" SERIAL NOT NULL,
    "accion" "public"."Accion" NOT NULL,
    "codigo" VARCHAR(150) NOT NULL,
    "id_modulo" INTEGER NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "estado_registro" BOOLEAN NOT NULL DEFAULT true,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_edicion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permiso_pkey" PRIMARY KEY ("id_permiso")
);

-- CreateTable
CREATE TABLE "public"."Rol" (
    "id_rol" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "estado_registro" BOOLEAN NOT NULL DEFAULT true,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_edicion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rol_pkey" PRIMARY KEY ("id_rol")
);

-- CreateTable
CREATE TABLE "public"."RolPermiso" (
    "id_rol" INTEGER NOT NULL,
    "id_permiso" INTEGER NOT NULL,

    CONSTRAINT "RolPermiso_pkey" PRIMARY KEY ("id_rol","id_permiso")
);

-- CreateTable
CREATE TABLE "public"."Catalog" (
    "id_catalogo" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "estado_registro" BOOLEAN NOT NULL DEFAULT true,
    "fecha_registo" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_edicion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Catalog_pkey" PRIMARY KEY ("id_catalogo")
);

-- CreateTable
CREATE TABLE "public"."CatalogItem" (
    "id_catalog_item" SERIAL NOT NULL,
    "id_catalog" INTEGER NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "estado_registro" BOOLEAN NOT NULL DEFAULT true,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_edicion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id_catalog_item")
);

-- CreateTable
CREATE TABLE "public"."Departamento" (
    "id_departamento" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "estado_registro" BOOLEAN NOT NULL DEFAULT true,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_edicion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Departamento_pkey" PRIMARY KEY ("id_departamento")
);

-- CreateTable
CREATE TABLE "public"."Comunidad" (
    "id_comunidad" SERIAL NOT NULL,
    "id_departamento" INTEGER NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "estado_registro" BOOLEAN NOT NULL DEFAULT true,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_edicion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comunidad_pkey" PRIMARY KEY ("id_comunidad")
);

-- CreateTable
CREATE TABLE "public"."RangoHito" (
    "id_rango_hito" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "estado_registro" BOOLEAN NOT NULL DEFAULT true,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_edicion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RangoHito_pkey" PRIMARY KEY ("id_rango_hito")
);

-- CreateTable
CREATE TABLE "public"."RangoHitoDetalle" (
    "id_rango_hito_detalle" SERIAL NOT NULL,
    "id_rango_hito" INTEGER NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "estado_registro" BOOLEAN NOT NULL DEFAULT true,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_edicion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RangoHitoDetalle_pkey" PRIMARY KEY ("id_rango_hito_detalle")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Permiso_codigo_key" ON "public"."Permiso"("codigo");

-- CreateIndex
CREATE INDEX "Permiso_codigo_estado_registro_idx" ON "public"."Permiso"("codigo", "estado_registro");

-- CreateIndex
CREATE INDEX "Permiso_estado_registro_idx" ON "public"."Permiso"("estado_registro");

-- CreateIndex
CREATE INDEX "Catalog_estado_registro_idx" ON "public"."Catalog"("estado_registro");

-- CreateIndex
CREATE INDEX "CatalogItem_id_catalog_idx" ON "public"."CatalogItem"("id_catalog");

-- CreateIndex
CREATE INDEX "CatalogItem_estado_registro_idx" ON "public"."CatalogItem"("estado_registro");

-- CreateIndex
CREATE INDEX "CatalogItem_nombre_idx" ON "public"."CatalogItem"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogItem_id_catalog_nombre_key" ON "public"."CatalogItem"("id_catalog", "nombre");

-- CreateIndex
CREATE INDEX "Departamento_estado_registro_idx" ON "public"."Departamento"("estado_registro");

-- CreateIndex
CREATE INDEX "Comunidad_estado_registro_idx" ON "public"."Comunidad"("estado_registro");

-- CreateIndex
CREATE INDEX "Comunidad_id_departamento_estado_registro_idx" ON "public"."Comunidad"("id_departamento", "estado_registro");

-- CreateIndex
CREATE UNIQUE INDEX "Comunidad_id_departamento_nombre_key" ON "public"."Comunidad"("id_departamento", "nombre");

-- CreateIndex
CREATE INDEX "RangoHito_estado_registro_idx" ON "public"."RangoHito"("estado_registro");

-- CreateIndex
CREATE INDEX "RangoHitoDetalle_estado_registro_idx" ON "public"."RangoHitoDetalle"("estado_registro");

-- CreateIndex
CREATE INDEX "RangoHitoDetalle_id_rango_hito_estado_registro_idx" ON "public"."RangoHitoDetalle"("id_rango_hito", "estado_registro");

-- CreateIndex
CREATE UNIQUE INDEX "RangoHitoDetalle_id_rango_hito_nombre_key" ON "public"."RangoHitoDetalle"("id_rango_hito", "nombre");

-- AddForeignKey
ALTER TABLE "public"."Permiso" ADD CONSTRAINT "Permiso_id_modulo_fkey" FOREIGN KEY ("id_modulo") REFERENCES "public"."Modulo"("id_modulo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolPermiso" ADD CONSTRAINT "RolPermiso_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "public"."Rol"("id_rol") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolPermiso" ADD CONSTRAINT "RolPermiso_id_permiso_fkey" FOREIGN KEY ("id_permiso") REFERENCES "public"."Permiso"("id_permiso") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CatalogItem" ADD CONSTRAINT "CatalogItem_id_catalog_fkey" FOREIGN KEY ("id_catalog") REFERENCES "public"."Catalog"("id_catalogo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comunidad" ADD CONSTRAINT "Comunidad_id_departamento_fkey" FOREIGN KEY ("id_departamento") REFERENCES "public"."Departamento"("id_departamento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RangoHitoDetalle" ADD CONSTRAINT "RangoHitoDetalle_id_rango_hito_fkey" FOREIGN KEY ("id_rango_hito") REFERENCES "public"."RangoHito"("id_rango_hito") ON DELETE CASCADE ON UPDATE CASCADE;
