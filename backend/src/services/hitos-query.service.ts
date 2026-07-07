import { prisma } from "@/config/database";

interface FiltrosHitos {
  id_comunidad?: number;
  id_departamento?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  id_usuario?: number;
  page?: number;
  limit?: number;
}

export class HitosQueryService {

  // ── Lista de encuestas con resumen ────────────────────────────────
  async getEncuestas(filtros: FiltrosHitos) {
    const page = filtros.page || 1;
    const limit = filtros.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { estado_registro: true };

    if (filtros.id_comunidad) where.id_comunidad = filtros.id_comunidad;
    if (filtros.id_usuario) where.id_usuario = filtros.id_usuario;
    if (filtros.fecha_desde || filtros.fecha_hasta) {
      where.fecha_registro = {};
      if (filtros.fecha_desde) where.fecha_registro.gte = new Date(filtros.fecha_desde);
      if (filtros.fecha_hasta) where.fecha_registro.lte = new Date(filtros.fecha_hasta);
    }

    const [total, encuestas] = await Promise.all([
      prisma.hitosEncuesta.count({ where }),
      prisma.hitosEncuesta.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha_registro: 'desc' },
        include: {
          comunidad: { select: { id_comunidad: true, nombre: true } },
          usuario: { select: { id_usuario: true, nombres: true, apellidos: true } },
          ninos: {
            select: {
              id_nino: true,
              nombres: true,
              apellidos: true,
              tiene_consentimiento: true,
            }
          },
          _count: { select: { ninos: true } }
        }
      })
    ]);

    return {
      data: encuestas.map(e => ({
        id_encuesta: e.id_encuesta,
        uuid: e.uuid,
        cantidad_ninos: e.cantidad_ninos,
        estado: e.estado,
        fecha_registro: e.fecha_registro,
        comunidad: e.comunidad,
        usuario: e.usuario,
        total_ninos: e._count.ninos,
        con_consentimiento: e.ninos.filter(n => n.tiene_consentimiento).length,
        sin_consentimiento: e.ninos.filter(n => !n.tiene_consentimiento).length,
        ninos: e.ninos,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    };
  }

  // ── Detalle de una encuesta con todos sus niños y tablas ──────────
  async getEncuestaDetalle(id_encuesta: number) {
    const encuesta = await prisma.hitosEncuesta.findUnique({
      where: { id_encuesta },
      include: {
        comunidad: { select: { id_comunidad: true, nombre: true } },
        usuario: { select: { id_usuario: true, nombres: true, apellidos: true } },
        ninos: {
          include: {
            tablas: {
              select: {
                table_element_id: true,
                row_id: true,
                group_id: true,
                col_id: true,
              }
            }
          },
          orderBy: { indice: 'asc' }
        }
      }
    });

    if (!encuesta) return null;

    return {
      id_encuesta: encuesta.id_encuesta,
      uuid: encuesta.uuid,
      cantidad_ninos: encuesta.cantidad_ninos,
      estado: encuesta.estado,
      fecha_registro: encuesta.fecha_registro,
      comunidad: encuesta.comunidad,
      usuario: encuesta.usuario,
      ninos: encuesta.ninos.map(n => ({
        id_nino: n.id_nino,
        indice: n.indice,
        nombres: n.nombres,
        apellidos: n.apellidos,
        tiene_consentimiento: n.tiene_consentimiento,
        tabla_element_id: n.tabla_element_id,
        responses: n.responses, // 👈 JSON completo con IDs reales
        tablas: n.tablas,
      }))
    };
  }

  // ── Respuestas aplanadas para fill-form-modal ─────────────────────
  async getEncuestaComoResponses(id_encuesta: number): Promise<Record<string, any>> {
    const encuesta = await prisma.hitosEncuesta.findUnique({
      where: { id_encuesta },
      include: {
        ninos: {
          orderBy: { indice: 'asc' },
          include: { tablas: true }
        },
        formulario: {
          select: { estructura: true }
        }
      }
    });

    if (!encuesta) throw new Error('Encuesta no encontrada');

    const responses: Record<string, any> = {};
    const estructura = encuesta.formulario.estructura as any;

    // ── Campo cantidad de niños ───────────────────────────────────
    const primeraRegion = estructura?.regions?.[0];
    const campoCantidad = primeraRegion?.children?.[0];
    if (campoCantidad?.id) {
      responses[campoCantidad.id] = encuesta.cantidad_ninos;
    }

    // ── Campos base vacíos de la región repetible ─────────────────
    const regionRepetible = estructura?.regions?.find(
      (r: any) => r.repeatConfig?.enabled === true
    );
    if (regionRepetible) {
      for (const child of regionRepetible.children ?? []) {
        if (child.type !== 'region') {
          responses[child.id] = null; // 👈 null en lugar de ''
        }
      }
    }

    // ── Aplanar responses de cada niño con _repN ──────────────────
    for (const nino of encuesta.ninos) {
      const rep = nino.indice + 1;
      const suffix = `_rep${rep}`;

      const ninoResponses = nino.responses as Record<string, any> ?? {};
      for (const [elementId, valor] of Object.entries(ninoResponses)) {
        if (elementId.startsWith('_')) continue;

        // Convertir strings numéricos a número
        let valorFinal: any = valor;
        if (typeof valor === 'string' && valor !== '' && !isNaN(Number(valor))) {
          valorFinal = Number(valor);
        }

        responses[`${elementId}${suffix}`] = valorFinal;
      }

      // Tablas — col_id también a número
      for (const tabla of nino.tablas) {
        const key = `${tabla.table_element_id}${suffix}_${tabla.row_id}_${tabla.group_id}`;

        responses[key] = isNaN(Number(tabla.col_id))
          ? tabla.col_id
          : Number(tabla.col_id);
      }
    }

    return responses;
  }

  // ── Estadísticas por comunidad ────────────────────────────────────
  async getEstadisticas(filtros: {
    id_comunidad?: number;
    fecha_desde?: string;
    fecha_hasta?: string;
  }) {
    const where: any = { estado_registro: true };
    if (filtros.id_comunidad) where.id_comunidad = filtros.id_comunidad;
    if (filtros.fecha_desde || filtros.fecha_hasta) {
      where.fecha_registro = {};
      if (filtros.fecha_desde) where.fecha_registro.gte = new Date(filtros.fecha_desde);
      if (filtros.fecha_hasta) where.fecha_registro.lte = new Date(filtros.fecha_hasta);
    }

    const [totalEncuestas, totalNinos, ninosSinConsentimiento] =
      await Promise.all([
        prisma.hitosEncuesta.count({ where }),

        prisma.hitosNino.count({
          where: {
            encuesta: where,
            estado_registro: true,
          }
        }),

        prisma.hitosNino.count({
          where: {
            encuesta: where,
            tiene_consentimiento: false,
            estado_registro: true,
          }
        }),
      ]);

    return {
      total_encuestas: totalEncuestas,
      total_ninos: totalNinos,
      ninos_sin_consentimiento: ninosSinConsentimiento,
    };
  }
}

export const hitosQueryService = new HitosQueryService();