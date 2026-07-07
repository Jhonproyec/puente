// src/services/persona.service.ts

import { prisma } from "@/config/database";

export interface PersonaData {
  cui?: string | null;
  codigoTemporal?: string | null;
  nombres: string;
  apellidos: string;
  idComunidad?: number | null;
  registroIncompleto?: boolean;
}

export class PersonaService {

  async findPersona(
    cui?: string | null,
    codigoTemporal?: string | null
  ): Promise<{ id_persona: number } | null> {
    if (!cui && !codigoTemporal) return null;

    return prisma.persona.findFirst({
      where: {
        OR: [
          ...(cui ? [{ cui }] : []),
          ...(codigoTemporal ? [{ codigo_temporal: codigoTemporal }] : []),
        ]
      },
      select: { id_persona: true }
    });
  }

  async upsertPersona(data: PersonaData): Promise<{ id_persona: number }> {
    const existente = await this.findPersona(data.cui, data.codigoTemporal);

    if (existente) {
      return prisma.persona.update({
        where: { id_persona: existente.id_persona },
        data: {
          ...(data.nombres ? { nombres: data.nombres } : {}),
          ...(data.apellidos ? { apellidos: data.apellidos } : {}),
          ...(data.idComunidad ? { id_comunidad: data.idComunidad } : {}),
          registro_incompleto: data.registroIncompleto ?? false,
        },
        select: { id_persona: true }
      });
    }

    // ── Crear nueva persona ───────────────────────────────────────
    // cui es requerido en el schema — si no tiene CUI real
    // usamos el código temporal como CUI temporal
    const cuiParaCrear = data.cui || data.codigoTemporal;
    if (!cuiParaCrear) throw new Error('Se requiere CUI o código temporal para crear persona');

    return prisma.persona.create({
      data: {
        cui: cuiParaCrear,
        codigo_temporal: data.codigoTemporal || null,
        nombres: data.nombres,
        apellidos: data.apellidos,
        tipo_persona: 'nino',
        id_comunidad: data.idComunidad || null,
        registro_incompleto: data.registroIncompleto ?? false,
      },
      select: { id_persona: true }
    });
  }
}

export const personaService = new PersonaService();