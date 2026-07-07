-- CreateTable
CREATE TABLE "public"."SyncStaging" (
    "id" SERIAL NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "payload" JSONB NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "error_mensaje" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "SyncStaging_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncStaging_estado_idx" ON "public"."SyncStaging"("estado");

-- CreateIndex
CREATE INDEX "SyncStaging_created_at_idx" ON "public"."SyncStaging"("created_at");
