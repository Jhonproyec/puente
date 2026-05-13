-- CreateTable
CREATE TABLE "public"."UsuarioComunidad" (
    "id_usuario" INTEGER NOT NULL,
    "id_comunidad" INTEGER NOT NULL,

    CONSTRAINT "UsuarioComunidad_pkey" PRIMARY KEY ("id_usuario","id_comunidad")
);

-- CreateIndex
CREATE INDEX "UsuarioComunidad_id_comunidad_idx" ON "public"."UsuarioComunidad"("id_comunidad");

-- AddForeignKey
ALTER TABLE "public"."UsuarioComunidad" ADD CONSTRAINT "UsuarioComunidad_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UsuarioComunidad" ADD CONSTRAINT "UsuarioComunidad_id_comunidad_fkey" FOREIGN KEY ("id_comunidad") REFERENCES "public"."Comunidad"("id_comunidad") ON DELETE CASCADE ON UPDATE CASCADE;
