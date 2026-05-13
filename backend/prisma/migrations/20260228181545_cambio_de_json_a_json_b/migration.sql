-- AlterTable
ALTER TABLE "public"."Formulario" ALTER COLUMN "estructura" SET DATA TYPE JSONB;

-- AlterTable
ALTER TABLE "public"."FormularioRespuesta" ALTER COLUMN "datos" SET DATA TYPE JSONB,
ALTER COLUMN "datos_limpios" SET DATA TYPE JSONB;

-- AlterTable
ALTER TABLE "public"."Persona" ALTER COLUMN "datos_extra" SET DATA TYPE JSONB;
