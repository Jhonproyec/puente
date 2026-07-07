//UUID del formulario registro de familias
export const FAMILIA_FORM_UUID = '67c6a3ff-3621-4608-b530-89b130f598b5';

//Regiones de personas en el formulario registro de familia
export const REGION_MADRE = 'region_persona_1780515720138';
export const REGION_PADRE = 'region_persona_1780600021033';
export const REGION_NINO_BASE = 'region_persona_1780608489541';
export const REGION_ENCARGADO_DATOS = 'region_1773844448753';

// Roles para FamiliaIntegrante
export const ROL_FAMILIA = {
    MADRE: 'MADRE',
    PADRE: 'PADRE',
    NINO: 'NINO',
    ENCARGADO: 'ENCARGADO',
} as const;

export type RolFamiliaType = keyof typeof ROL_FAMILIA;

// Mapeo región -> rol (para procesar automáticamente)
export const REGION_ROL_MAP: Record<string, string> = {
    [REGION_MADRE]: ROL_FAMILIA.MADRE,
    [REGION_PADRE]: ROL_FAMILIA.PADRE,
    [REGION_NINO_BASE]: ROL_FAMILIA.NINO,
};


// IDENTIFICADORES DEL CARNET DE ASISTENCIA
// UUID: c1d96290-09d4-42ae-80ab-4abdbdad84ab
export const CARNET_FORM_UUID = 'c1d96290-09d4-42ae-80ab-4abdbdad84ab';
// Región persona del carnet
export const REGION_CARNET_PERSONA = 'region_persona_1780691607581';
// Campo mes a reportar
export const CARNET_MES_FIELD_ID = 'element_1772753813274_1';
// Campo tiene_cui
export const CARNET_TIENE_CUI_FIELD_ID = 'persona_tiene_cui_1780691607581_9';
// Mapeo de mes (ID catálogo) -> bimestre
export const MES_BIMESTRE_MAP: Record<number, number> = {
    431: 1, // Enero
    432: 1, // Febrero
    433: 2, // Marzo
    434: 2, // Abril
    435: 3, // Mayo
    436: 3, // Junio
    437: 4, // Julio
    438: 4, // Agosto
    439: 5, // Septiembre
    440: 5, // Octubre
    441: 6, // Noviembre
    442: 6, // Diciembre
};

// Nombres de los bimestres para mostrar en el frontend
export const BIMESTRE_NOMBRES: Record<number, string> = {
    1: 'Enero - Febrero',
    2: 'Marzo - Abril',
    3: 'Mayo - Junio',
    4: 'Julio - Agosto',
    5: 'Septiembre - Octubre',
    6: 'Noviembre - Diciembre',
};

// Región de huellas
export const CARNET_REGION_HUELLA = 'region_1772754336649';
export const CARNET_REGION_ASISTENCIA = 'region_1772754317507';


//HItos
export const HITOS_FORM_UUID="0bd193fd-cc8d-480c-8734-e20894f7a3b2";

//Centro nutreme
export const CENTRO_NUTREME_UUID = '3fddc6b4-bc83-4b54-bcdd-7eca0176d1bf';
export const CAMPO_CENTRO= 'element_1782922523349_0'
export const CAMPO_COORDENADAS_CENTRO = 'element_1782924339633_1';

