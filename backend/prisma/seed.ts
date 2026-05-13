import { PrismaClient, Accion } from "@prisma/client";

const prisma = new PrismaClient();

// Datos del JSON incrustados directamente
const catalogosData = {
  tipo_actividad: [
    { nombre: "Inscripción de Familia" },
    { nombre: "Evaluación de Familia" },
  ],
  departamentos: [
    { nombre: "Alta Verapaz" },
    { nombre: "Chimaltenango" },
  ],
  tipo_registro: [
    { nombre: "Escáner QR" },
    { nombre: "Código" },
    { nombre: "Texto" },
  ],
  comunidad: [
    { id_departamento: 1, nombre: "Aldea  Balamte" },
    { id_departamento: 1, nombre: "Aldea Pinares" },
    { id_departamento: 1, nombre: "Aldea Santa MAria Rubeltzul" },
    { id_departamento: 1, nombre: "Aldea Tamax" },
    { id_departamento: 1, nombre: "Aldea Tzalamtun" },
    { id_departamento: 1, nombre: "Barrio Esquipulas" },
    { id_departamento: 1, nombre: "Barrio San Pedro" },
    { id_departamento: 1, nombre: "Belén" },
    { id_departamento: 1, nombre: "Cacpecal Chisip" },
    { id_departamento: 1, nombre: "Casería Santa Cristina" },
    { id_departamento: 1, nombre: "Chajgual" },
    { id_departamento: 1, nombre: "Chajlocom" },
    { id_departamento: 1, nombre: "Champerico" },
    { id_departamento: 1, nombre: "Chiconop" },
    { id_departamento: 1, nombre: "Chimenchen" },
    { id_departamento: 1, nombre: "Chinajuc" },
    { id_departamento: 1, nombre: "Chipajche + Villa Nueva Sexán" },
    { id_departamento: 1, nombre: "Chipur" },
    { id_departamento: 1, nombre: "Chitzac" },
    { id_departamento: 1, nombre: "Chuchub" },
    { id_departamento: 1, nombre: "Colonia El Rosario" },
    { id_departamento: 1, nombre: "El Carmen" },
    { id_departamento: 1, nombre: "El Ranchito" },
    { id_departamento: 1, nombre: "La Ceiba El Mirador" },
    { id_departamento: 1, nombre: "La Libertad" },
    { id_departamento: 1, nombre: "Miraflores" },
    { id_departamento: 1, nombre: "Nuevo Tzulben" },
    { id_departamento: 1, nombre: "Pequixul" },
    { id_departamento: 1, nombre: "Rubel Balam" },
    { id_departamento: 1, nombre: "Sactá Central" },
    { id_departamento: 1, nombre: "San Chistobal Sactá" },
    { id_departamento: 1, nombre: "San José Cucar" },
    { id_departamento: 1, nombre: "San Lúcas Tzulben" },
    { id_departamento: 1, nombre: "San Martín Chichaj" },
    { id_departamento: 1, nombre: "Santa Cruz Xobalam" },
    { id_departamento: 1, nombre: "Santa Inex + La Fábrica" },
    { id_departamento: 1, nombre: "Santa Mónica" },
    { id_departamento: 1, nombre: "Santa Rita" },
    { id_departamento: 1, nombre: "Santa Rosa Chivite" },
    { id_departamento: 1, nombre: "Santo Domingo Rubeltzul" },
    { id_departamento: 1, nombre: "Saquija" },
    { id_departamento: 1, nombre: "Secacao" },
    { id_departamento: 1, nombre: "Secampana" },
    { id_departamento: 1, nombre: "Secatalcab" },
    { id_departamento: 1, nombre: "Sepc" },
    { id_departamento: 1, nombre: "Sexoy" },
    { id_departamento: 2, nombre: "Casco Urbano Zona 1" },
    { id_departamento: 2, nombre: "Casco Urbano Zona 2" },
    { id_departamento: 2, nombre: "Casco Urbano Zona 3" },
    { id_departamento: 2, nombre: "Casco Urbano Zona 4" },
    { id_departamento: 2, nombre: "Casco Urbano Zona 5" },
    { id_departamento: 2, nombre: "Caseria Centro" },
    { id_departamento: 2, nombre: "Chimixayá" },
    { id_departamento: 2, nombre: "Chiraxaj" },
    { id_departamento: 2, nombre: "Chuacruz" },
    { id_departamento: 2, nombre: "Chuatacaj 1" },
    { id_departamento: 2, nombre: "Chuatacaj 2" },
    { id_departamento: 2, nombre: "Chuiquisayá" },
    { id_departamento: 2, nombre: "Hacienda María" },
    { id_departamento: 2, nombre: "Nueva Esperanza" },
    { id_departamento: 2, nombre: "Ojer Calbal" },
    { id_departamento: 2, nombre: "Pachuitiatzán" },
    { id_departamento: 2, nombre: "Pacul" },
    { id_departamento: 2, nombre: "Palamá" },
    { id_departamento: 2, nombre: "Paley" },
    { id_departamento: 2, nombre: "Paneyá" },
    { id_departamento: 2, nombre: "Panimacac" },
    { id_departamento: 2, nombre: "Panimasiguan" },
    { id_departamento: 2, nombre: "Peruxeché" },
    { id_departamento: 2, nombre: "Paxcabalche" },
    { id_departamento: 2, nombre: "Saquitacaj" },
    { id_departamento: 2, nombre: "Sarajmac" },
    { id_departamento: 2, nombre: "Xebacin" },
    { id_departamento: 2, nombre: "Xepalamá" },
    { id_departamento: 2, nombre: "Xequechalaj" }
  ],
  consentimientos: [
    {
      nombre: "Entrevista e ingresar a la vivienda para observar el saneamiento en la cocina, el piso, la letrina etc.",
    },
    { nombre: "Fotografías" },
    { nombre: "Ninguno" },
  ],
  motivo_no_consentimiento: [
    { nombre: "Actividad de otra institución" },
    { nombre: "Falta de tiempo (actividades del hogar, trabajo, etc)" },
    { nombre: "Los suegros no autorizaron" },
    { nombre: "No desea participar" },
    { nombre: "No está en casa" },
    { nombre: "No se localizó en la comunidad (nadie la conoce)" },
    { nombre: "No vive en la comunidad" },
    { nombre: "Parto o Puerperio" },
    { nombre: "Problemas de salud" },
    { nombre: "Se retiró del programa" },
    { nombre: "Trabajo formal" },
    { nombre: "Otros motivos" },
  ],
  tipo_participantes: [
    { nombre: "Grupo Meta" },
    { nombre: "Grupo Meta y Educador Voluntario" },
  ],
  si_no_list: [
    { nombre: "Si" },
    { nombre: "No" },
    { nombre: "No Aplica" },
    { nombre: "Proceso" },
  ],
  sintomas_enfermedad: [
    { nombre: "Anemia" },
    { nombre: "Ansiedad" },
    { nombre: "Artritis" },
    { nombre: "Asma" },
    { nombre: "Cáncer de mama" },
    { nombre: "Depresión" },
    { nombre: "Desmayos" },
    { nombre: "Diabetes" },
    { nombre: "Diarrea" },
    { nombre: "Dificultad para respirar" },
    { nombre: "Dificultad para tragar" },
    { nombre: "Dolor de cabeza" },
    { nombre: "Dolor de estómago" },
    { nombre: "Dolor de abdominal" },
    { nombre: "Dolor de garganta" },
    { nombre: "Dolor de oído" },
    { nombre: "Dolor en el pecho" },
    { nombre: "Dolor en las articulaciones" },
    { nombre: "Dolor en las extremidades" },
    { nombre: "Dolor para orinar" },
    { nombre: "Dolores musculares" },
    { nombre: "Estreñimiento" },
    { nombre: "Falta de olfato o el gusto" },
    { nombre: "Fiebre" },
    { nombre: "Gripe" },
    { nombre: "Hemorroides" },
    { nombre: "Infección de transmisión sexual" },
    { nombre: "Infección intestinal o estomacal" },
    { nombre: "Infección urinaria" },
    { nombre: "Infecciones del oído" },
    { nombre: "Insufiencia renal" },
    { nombre: "Irritación de ojos" },
    { nombre: "Mareos" },
    { nombre: "Nauseas" },
    { nombre: "Conjuntivitis" },
    { nombre: "Pérpida de apetito" },
    { nombre: "Picazón en la piel" },
    { nombre: "Piel pálida" },
    { nombre: "Sangrado de ojos" },
    { nombre: "Sangrado nasal" },
    { nombre: "Sangre en las heces" },
    { nombre: "Sangrado vaginal" },
    { nombre: "Temblores" },
    { nombre: "Tiroides" },
    { nombre: "Vómitos" },
    { nombre: "Tos" },
    { nombre: "Otro" },
  ],
  servicios_salud: [
    { nombre: "Comadrona" },
    { nombre: "Curandero" },
    { nombre: "Doctor o enfermera particular" },
    { nombre: "Farmacia" },
    { nombre: "Hospital" },
    { nombre: "Iglesia" },
    { nombre: "Puesto o centro de salud" },
    { nombre: "Promotor de Salud" },
    { nombre: "Sacerdote maya" },
    { nombre: "Ninguno" },
  ],
  alimentos_fuentes_hierro: [
    {
      nombre: "Frutas: Manzanas, Plátanos, Naranjas, melon, piña, papaya, guayaba, mango higo, ciruela, zapote, bananos, platano",
    },
    {
      nombre: "Granos: Arroz, frijol, maiz, avellana, almendras, nueces, lentejas, avena, almendras, chia, linaza",
    },
    { nombre: "Lácteos: Queso, crema, yogurt" },
    {
      nombre: "Proteínas: Huevos, pollo, gallina, pescado, conejo, hígado",
    },
    {
      nombre:
        "Verduras y Hortalizas: espinaca, berro, berengena, acelga, repollo, brócoli, api, zanahoria, guicoy, yuca, camote",
    },
    { nombre: "Ninguno" },
  ],
  falta_tiempo_comidas: [
    { nombre: "Bebió líquidos (atoles o agüita de masa, cacao o café)" },
    { nombre: "Dolores de parto" },
    { nombre: "Dormía" },
    { nombre: "Enfermedad (diarrea, dolor o ingección estomacal, fiebre, gripe, tos, vómitos, entre otros)" },
    { nombre: "Falta de dinero o recursos" },
    { nombre: "Náuseas" },
    { nombre: "No le gusta la comida (melindrosa)" },
    { nombre: "No realizó mercado" },
    { nombre: "Stisfecho por refacción" },
    { nombre: "Satisfecho por tiempo de comida anterior" },
    { nombre: "Sin apetito" },
    { nombre: "Sin horario para los tiempos de comida" },
    { nombre: "Otro" },
  ],
  desinfectar_agua: [
    { nombre: "Hervir" },
    { nombre: "Filtrar" },
    { nombre: "Clorar" },
    { nombre: "Comprar" },
    { nombre: "Ninguno" },
  ],
  manejo_basura: [
    { nombre: "Quema la basura" },
    { nombre: "Servicio de recolección de basura" },
    { nombre: "Acumulación en un espacio fuera de la vivienda" },
  ],
  tipo_servicio_sanitario: [
    { nombre: "Letrina (cualquier tipo)" },
    { nombre: "Inodoro conectado a drenaje" },
    { nombre: "Ninguno" },
  ],
  metodo_para_cocinar: [
    { nombre: "Fuego abierto o Fogón" },
    { nombre: "Polletón" },
    { nombre: "Estufa de gas" },
    { nombre: "Estufa eléctrica" },
    { nombre: "Estufa mejorada" },
    { nombre: "Otra forma" },
  ],
  metodo_extraer_humo: [
    { nombre: "Chimenea" },
    { nombre: "Ventilación Natural (Ventanas y Puertas abiertas)" },
    { nombre: "Campana de cocina" },
  ],
  metodo_cultipo_principal: [
    { nombre: "Contenedores (Llantas, Botes, Cajas, etc.)" },
    { nombre: "Directo a suelo" },
    { nombre: "Mesa" },
  ],
  tipo_techo_cultivo: [
    { nombre: "Nilon" },
    { nombre: "Lámina metálica" },
    { nombre: "Paja, Sarat etc." },
    { nombre: "Ninguno" },
  ],
  tipo_fertilizante: [
    { nombre: "Artesanal o Casero" },
    { nombre: "Comercial o Formulado" },
  ],
  tipos_plaga_enfermedades: [
    { nombre: "Ácaros" },
    { nombre: "Araña" },
    { nombre: "Caracoles y babosas" },
    { nombre: "Cochinilla" },
    { nombre: "Escarabajos" },
    { nombre: "Grillos o Chapulines" },
    { nombre: "Larvas, orugas o gusano" },
    { nombre: "Mosca" },
    { nombre: "Pulgones" },
    { nombre: "Hongos" },
    { nombre: "Hormigas" },
    { nombre: "Podrebumbre o Marchitez (barterias y virus)" },
    { nombre: "Tortuguillar" },
    { nombre: "Zompopos" },
    { nombre: "Otras" },
  ],
  metodo_eliminar_plangas: [
    { nombre: "Quimico (Insecticidas, Fungicidas, Herbicidas, etc.)" },
    { nombre: "Repelente Casero u organico (Lejía de ceniza, ajó, detergente o jabón)" },
    { nombre: "Forma Manual (Eliminar parte dañada)" },
    { nombre: "Ninguno" },
  ],
  motivo_perdida_plantas: [
    { nombre: "Calor intenso" },
    { nombre: "Comido por animales" },
    { nombre: "Enfermedades" },
    { nombre: "Lluvias excesivas" },
    { nombre: "Plagas" },
    { nombre: "Tormentay viento fuerte" },
    { nombre: "Sequía o escases de agua" },
    { nombre: "Otros" },
  ],
  tipo_planta_pillones: [
    { nombre: "Acelga" },
    { nombre: "Apio" },
    { nombre: "Arbeja" },
    { nombre: "Berro" },
    { nombre: "Brócoli" },
    { nombre: "Bledo" },
    { nombre: "Cebolla" },
    { nombre: "Cebollín" },
    { nombre: "Colinabo" },
    { nombre: "Cilantro" },
    { nombre: "Chile (picante)" },
    { nombre: "Chile Pimiento" },
    { nombre: "Chipilin" },
    { nombre: "Espinaca" },
    { nombre: "Frijol" },
    { nombre: "Güicoy" },
    { nombre: "Hierba Buena" },
    { nombre: "Hierba Mora" },
    { nombre: "Maíz" },
    { nombre: "Mostaza" },
    { nombre: "Lechuga" },
    { nombre: "Papa" },
    { nombre: "Pepino" },
    { nombre: "Quilete" },
    { nombre: "Remolacha" },
    { nombre: "Repollo" },
    { nombre: "Rabano" },
    { nombre: "Samat" },
    { nombre: "Tomate" },
    { nombre: "Orégano" },
    { nombre: "Zanahoria" },
    { nombre: "Sandía" },
    { nombre: "Otros" },
  ],
  elementos_basicos_gallinero: [
    { nombre: "Bebederos" },
    { nombre: "Comederos" },
    { nombre: "Cortina" },
    { nombre: "Nidos" },
    { nombre: "Perchas o ramas para que las gallinas descansen" },
    { nombre: "Suelo con paja, viruta, o aserrín para mantener la limpieza e higiene" },
    { nombre: "Techo" },
    { nombre: "Ninguno" }
  ],
  causa_muerte_aver: [
    { nombre: "Cólera aviar" },
    { nombre: "Cojera o dificultad para caminar" },
    { nombre: "Coryza" },
    { nombre: "Diarrea" },
    { nombre: "Estrés (encierro, comida y agua en el mismo sitio, soledad etc)" },
    { nombre: "Falta de apetito" },
    { nombre: "Heces con sangre" },
    { nombre: "Hinchazón en alguna parte del cuerpo" },
    { nombre: "Infecciones de Piel (Ácaros, Chinches, Garrapatas, Piojos, Pulgas, Hongos, etc)" },
    { nombre: "Influenza o Peste Aviar" },
    { nombre: "Lombrices" },
    { nombre: "Marek" },
    { nombre: "No come" },
    { nombre: "Pérdida de plumas" },
    { nombre: "Pérdida de peso" },
    { nombre: "Presencia de costras o heridad" },
    { nombre: "Respiratorias (Bronquitis, Newcastle, Grupe aviar)" },
    { nombre: "Secreción nasal o nasal ocular" },
    { nombre: "Viruela aviar" },
    { nombre: "Otro" },
  ],
  grupos_bancarios: [
    { nombre: "Grupo ALAC" },
    { nombre: "Ninguno" },
  ],
  destino_ahorros: [
    { nombre: "Alimentación" },
    { nombre: "Actividad agropecuaria" },
    { nombre: "Comunicación (teléfono, Internet, y tiempo de aire)" },
    { nombre: "Educación" },
    { nombre: "Emprendimiento" },
    { nombre: "Entretenimiento" },
    { nombre: "Préstamo" },
    { nombre: "Ropa y cuidado personal" },
    { nombre: "Salud" },
    { nombre: "Servicios básicos (energía eléctrica, agua, gas o leña)" },
    { nombre: "Transporte" },
    { nombre: "Vivienda" },
  ],
  forma_corregir_hijos: [
    {
      nombre:
        "1ro. Habla y escucha al niño(a), 2do. Enseña o educa al niño(a), 3ro. Corregir o castigar si es necesario",
    },
    {
      nombre:
        "1ro Corrige o castiga de inmediato al niño(a) 2do No Enseña 3ro. No habla y escucha al niño(a)",
    },
    { nombre: "Ninguna" },
  ],
  pendamientos_espejo: [
    { nombre: "Me veo bien (soy guapo), me acepto como soy" },
    { nombre: "No me veo bien y no me acepto como soy" },
  ],
  aplicacion_conocimientos_adquiridos: [
    { nombre: "1 vez" },
    { nombre: "2 o 3 veces" },
    { nombre: "Todos los días" },
    { nombre: "Ninguna" },
  ],
  ultima_asistencias: [
    { nombre: "Hace una semana" },
    { nombre: "Hace 15 días" },
    { nombre: "Hace un mes" },
    { nombre: "Hace más de un mes" },
  ],
  motivo_no_consentimiento_madre: [
    { nombre: "Actividad de otra institución" },
    { nombre: "Berrinche" },
    { nombre: "Discapacidad" },
    { nombre: "Dormía" },
    { nombre: "Enfermedad o Problemas de Salud" },
    { nombre: "Falta de tiempo (actividades del hogar, trabajo, etc)" },
    { nombre: "Llanto" },
    { nombre: "No desea participar" },
    { nombre: "Se retiró del programa" },
    { nombre: "Timidez" },
    { nombre: "Otro" },
  ],
  ubicacion_punto_peso_edad: [
    { nombre: "3" },
    { nombre: "+3 a +2" },
    { nombre: "+2 a 0" },
    { nombre: "0 a -2" },
    { nombre: "-2 a -3" },
    { nombre: "-3" },
    { nombre: "Ninguno" },
  ],
  ubicacion_punto_longitud: [
    { nombre: "3" },
    { nombre: "+3 a +2" },
    { nombre: "+2 a +1" },
    { nombre: "+1 a 0" },
    { nombre: "0 a -1" },
    { nombre: "-1 a -2" },
    { nombre: "-2 a -3" },
    { nombre: "-3" },
    { nombre: "Ninguno" },
  ],
  tendencia_peso: [
    { nombre: "Hacia arriba" },
    { nombre: "Horizontal" },
    { nombre: "Hacia abajo" },
    { nombre: "Ninguna" },
  ],
  registro_completo: [
    { nombre: "Peso y Longitud" },
    { nombre: "Vacunación" },
    { nombre: "Desparasitación" },
    { nombre: "Ninguna" },
  ],
  rango_hitos: [
    { nombre: "0 a 1 año" },
    { nombre: "1 a 2 años" },
    { nombre: "2 a 3 años" },
    { nombre: "3 a 4 años" },
  ],
  detalle_rango_hitos: [
    { id_hito: 1, nombre: "0 a 2 meses" },
    { id_hito: 1, nombre: "3 a 5 meses" },
    { id_hito: 1, nombre: "6 a 8 meses" },
    { id_hito: 1, nombre: "9 a 11 meses" },
    { id_hito: 2, nombre: "12 a 14 meses" },
    { id_hito: 2, nombre: "15 a 17 meses" },
    { id_hito: 2, nombre: "18 a 20 meses" },
    { id_hito: 2, nombre: "21 a 23 meses" },
    { id_hito: 3, nombre: "24 a 26 meses" },
    { id_hito: 3, nombre: "27 a 29 meses" },
    { id_hito: 3, nombre: "30 a 32 meses" },
    { id_hito: 3, nombre: "33 a 35 meses" },
    { id_hito: 4, nombre: "36 a 38 meses" },
    { id_hito: 4, nombre: "39 a 41 meses" },
    { id_hito: 4, nombre: "42 a 44 meses" },
    { id_hito: 4, nombre: "45 en adelante" },
  ],
  practica_consulta: [
    { nombre: "Práctica" },
    { nombre: "Consulta" },
  ],
  especialidad_evaluador: [
    { nombre: "Embarazada" },
    { nombre: "0 a 1" },
    { nombre: "1 a 2" },
    { nombre: "3 a 4" },
  ],
  impedimento_realizacion_sesion: [
    { nombre: "Embarazadas o Niños y sus cuidadores (GM)" },
    { nombre: "Educador Voluntario" },
    { nombre: "Ambos (Educador y GM)" },
    { nombre: "Evaluador" },
  ],
  motivo_impedimento_sesion: [
    { nombre: "Actividad de otra institución" },
    { nombre: "Cambio de horario" },
    { nombre: "Compromiso personal" },
    { nombre: "Cosecha o siembra" },
    { nombre: "Enfermedad" },
    { nombre: "Lluvias" },
    { nombre: "No se encuentra en la comunidad" },
    { nombre: "Parto o Puerperio" },
    { nombre: "Retiro del programa" },
    { nombre: "Tareas en el hogar" },
    { nombre: "Terminaron la guía" },
    { nombre: "Trabajo formal" },
    { nombre: "Sin motivo" },
  ],
  aspectos_evaluacion: [
    { nombre: "Planificación: Cumple con el horario de inicio y fin de la sesión, de acuerdo con la planificación" },
    { nombre: "Identificación: Utiliza gabacha para ser reconocida como educadora voluntaria" },
    { nombre: "Socialización (1): Intercambio de experiencias sobre los ejercicios de la sesión anterior, practicados en casa durante la semana" },
    { nombre: "Demostración (2): Explicación y demostración de nuevas actividades de aprendizaje para la sesión de hoy" },
    { nombre: "Ejercitación (3): Las madres y sus hijos realizan las nuevas actividades, guiados por la educadora" },
    { nombre: "Recursos: Se utilizan guías juguetes y otros materiales para la demostración y la ejercitación" },
    { nombre: "Dominio del Tema: Muestra conocimiento sobre los temas de la sesión" },
    { nombre: "Evaluación (4) y retroalimentación: Realiza preguntas para verificar lo aprendido, ofrece sugerencias de mejora y resuelve dudad." },
    { nombre: "Comunicación: Utiliza un lenguaje claro y un tono apropiado" },
    { nombre: "Actitudes Interpersonales: Mantiene un ambiente de respeto, tolerancia, empatía, solidaridad entre todos" },
    { nombre: "Entorno físico: Mantiene un ambiente seguro, limpio y ordenado" },
    { nombre: "Seguimiento y compromiso (5): Ofrece ideas adicionales de actividades y promueve el compromiso para realizarlas en casa" },
    { nombre: "Asistencia: Registra en el carnet la asistencia de los niños o gestantes" },
    { nombre: "Objetivo: Logró el propósito de la sesión establecido en la guía de Educación Inicial" }
  ],
  infraestructuras: [
    { nombre: "Cosechador de agua (1)" },
    { nombre: "Sanitario o Letrina (1)" },
    { nombre: "Sitio de lavado: pila o lavamanos (1)" },
    { nombre: "Ninguno" },
  ],
  parte_estructura_cn: [
    { nombre: "Paredes o Cajón" },
    { nombre: "Piso de cemento o cerámica" },
    { nombre: "Puerta" },
    { nombre: "Techo de lamina, concreto, madera etc" },
    { nombre: "Ventanas" },
    { nombre: "Ninguno" },
  ],
  mobiliario_equipo_cn: [
    { nombre: "Bancos o sillas para adulto (5)" },
    { nombre: "Banquitos o sillitas para niño (5)" },
    { nombre: "Cajas organizadoras (cartón o pláticas) (1)" },
    { nombre: "Filtro de agua (1)" },
    { nombre: "Mesa o banco para filtro de agua (1)" },
    { nombre: "Mesa para Manta de crecimiento (1)" },
    { nombre: "Mesitas para niños (5)" },
    { nombre: "Ropero de madera (1)" },
    { nombre: "Rótulo de identificación del Centro Nútreme (1)" },
    { nombre: "Ninguno" },
  ],
  insumos_cn: [
    { nombre: "Alcohol o gel de manos (1)" },
    { nombre: "Bote para basura (1)" },
    { nombre: "Cepillos dental (1)" },
    { nombre: "Desinfectante para superficios(1)" },
    { nombre: "Escoba (1)" },
    { nombre: "Jabón para manos (1)" },
    { nombre: "Pala o recogedor para basura (1)" },
    { nombre: "Pasta dental (1)" },
    { nombre: "Rollo grande de papel (1)" },
    { nombre: "Toallas húmedas (1)" },
    { nombre: "Trapo trapeador (1)" },
    { nombre: "Ninguno" },
  ],
  utensilios_cn: [
    { nombre: "Campana extractora de humo (1)" },
    { nombre: "Coladores (1)" },
    { nombre: "Contenedor para alimentos (1)" },
    { nombre: "Cucharas para adulto (5)" },
    { nombre: "Cucharitas para niño (5)" },
    { nombre: "Cucharon (1)" },
    { nombre: "Limpiadores de superficies (1)" },
    { nombre: "Olla grande (1)" },
    { nombre: "Olla pequeña (1)" },
    { nombre: "Palanganas grandes (1)" },
    { nombre: "Palanganas medianas (5)" },
    { nombre: "Pichel (1)" },
    { nombre: "Platos Hondos (5)" },
    { nombre: "Poyetón o Estufa de gas (1)" },
    { nombre: "Sartén (1)" },
    { nombre: "Tabla de picar (1)" },
    { nombre: "Tazas (5)" },
    { nombre: "Tenedores para adulto (5)" },
    { nombre: "Tenedores para niño (5)" },
    { nombre: "Vasos (5)" },
    { nombre: "Ninguno" },
  ],
  material_didactico_cn: [
    { nombre: "Almohadilla (1)" },
    { nombre: "Bocina (1)" },
    { nombre: "Carnets de asistencia (1)" },
    { nombre: "Engrapadora (1)" },
    { nombre: "Espejo (1)" },
    { nombre: "Goma (1)" },
    { nombre: 'Guías de "Acompañame a Crecer" (4)' },
    { nombre: 'Libros de cuentos (5)' },
    { nombre: 'Manta de crecimiento (1)' },
    { nombre: 'Manta vinílica de hitos de desarrollo (4)' },
    { nombre: 'Manta vinílica de pasos de la sesión (1)' },
    { nombre: 'Marcadores de colores (3)' },
    { nombre: 'Maskingtape o Sellador (1)' },
    { nombre: 'Papelógrafos (10)' },
    { nombre: 'Reloj de Pared (1)' },
    { nombre: 'Rollon de tinta para Asistencia (1)' },
    { nombre: 'Silicon líquido (1)' },
    { nombre: 'Ninguno' },
  ],
  material_ludicos_cn: [
    { nombre: "Alfrombras o petates (2)" },
    { nombre: "Aros pequeños (5)" },
    { nombre: "Botones con figuras: Triangulo, cuadrado, círculo etc. (5)" },
    { nombre: "Canicas o Perlitas (25)" },
    { nombre: "Conos (5)" },
    { nombre: "Crayones de colores (25)" },
    { nombre: "Cuerdas para saltar (5)" },
    { nombre: "Dados (5)" },
    { nombre: "Hojas blancas (25)" },
    { nombre: "Hojas de colores (25)" },
    { nombre: "Hula Hula (5)" },
    { nombre: "Juguetes de animalitos (5)" },
    { nombre: "Juguetes sensoriales (5)" },
    { nombre: "Legos o bloques para armar (25)" },
    { nombre: "Listones o pitas de colores (5)" },
    { nombre: "Muñecas (1)" },
    { nombre: "Paletas de colores (5)" },
    { nombre: "Pelotas de hule grande" },
    { nombre: "Pelotas medianas de plástico (5)" },
    { nombre: "Pinceles (5)" },
    { nombre: "Pinzas o ganchos para ropa (5)" },
    { nombre: "Plastilina" },
    { nombre: "Rompecabezas" },
    { nombre: "Rollo de lana (1)" },
    { nombre: "Sonajeros o chinchines" },
    { nombre: "Tarjeta de memorias: Lotería, frutas, dibujos varios (25)" },
    { nombre: "Temperas o acuarelas" },
    { nombre: "Tijeras punta cuadrada" },
    { nombre: "Tornillos de plástico" },
    { nombre: "Ninguno" },
  ],
  equipamiento_agua_limpia: [
    { nombre: "Filtro de agua" },
    { nombre: "Sitio de lavado: pila o lavamanos" },
    { nombre: "Tinaco" },
    { nombre: "Ninguno" },
  ],
  equipamiento_saneamiento: [
    { nombre: "Centro nútreme con iluminacion y ventilación adecuada" },
    { nombre: "Centro nútreme decorado (Carteles, dibujos, listones, etc)" },
    { nombre: "Centro nútreme limpio" },
    { nombre: "Centro nútreme ordenado" },
    { nombre: "Cosechador con mantenimiento preventivo" },
    { nombre: "Sanitario o letrina limpia" },
    { nombre: "Ninguno" },
  ],
  meses: [
    { nombre: "Enero" },
    { nombre: "Febrero" },
    { nombre: "Marzo" },
    { nombre: "Abril" },
    { nombre: "Mayo" },
    { nombre: "Junio" },
    { nombre: "Julio" },
    { nombre: "Agosto" },
    { nombre: "Septiembre" },
    { nombre: "Octubre" },
    { nombre: "Noviembre" },
    { nombre: "Diciembre" },
  ],
  propietario_carnet: [
    { nombre: "Embarazada" },
    { nombre: "Niño(a)" }
  ],
  actividades_cn: [
    { nombre: "Casa Modelo" },
    { nombre: "Receta de nutritiva" },
    { nombre: "Manta de crecimiento" },
    { nombre: "Incaparina Maternal" },
    { nombre: "Nutrilisto" },
    { nombre: "Multivitamínico" },
    { nombre: "Zinc" },
    { nombre: "Otra actividad" },
    { nombre: "Ninguna" },
  ],
  enfermedad_ninio_embarazada: [
    { nombre: "Diarrea" },
    { nombre: "Fiebre" },
    { nombre: "Gripe y tos" },
    { nombre: "Vómitos" },
    { nombre: "Otra enfermedad" },
    { nombre: "Ninguna" },
  ],
  inasistencia_ninio_embarazada: [
    { nombre: "Dependencia laboral (Trabajo formal)" },
    { nombre: "Distancia a centro nútreme" },
    { nombre: "Educadora cambio horarios" },
    { nombre: "Emergencia" },
    { nombre: "Enfermedad" },
    { nombre: "Esposo no le permite asistir" },
    { nombre: "Falta de Interés" },
    { nombre: "Luvia" },
    { nombre: "Migración a otra comunidad/departamento" },
    { nombre: "Negocio propio" },
    { nombre: "Nuevo participante" },
    { nombre: "Oficio en el hogar" },
    { nombre: "Parto (dio a luz)" },
    { nombre: "Parto cercano" },
    { nombre: "Siembra y Cosecha" },
    { nombre: "Otro" },
  ],
  lugares_atencion_medica: [
    { nombre: "Jornada de Salud" },
    { nombre: "Centro de Salud" },
  ],
  servicio_atencion_salud_embarazada: [
    { nombre: "Control prenatal" },
    { nombre: "Suplementos" },
    { nombre: "Ultrasonido" },
    { nombre: "Papanicolaou" },
    { nombre: "Otro" },
  ],
  servicio_atencion_salud_ninio: [
    { nombre: "Peso y talla" },
    { nombre: "Desparasitación" },
    { nombre: "Vacunas" },
    { nombre: "Suplementos" },
    { nombre: "Otro" },
  ]
};

async function truncateTables() {

  try {
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE "RangoHitoDetalle" CASCADE;
      TRUNCATE TABLE "RangoHito" CASCADE;
      TRUNCATE TABLE "Comunidad" CASCADE;
      TRUNCATE TABLE "Departamento" CASCADE;
      TRUNCATE TABLE "CatalogItem" CASCADE;
      TRUNCATE TABLE "Catalog" CASCADE;
    `);
  } catch {
    await prisma.rangoHitoDetalle.deleteMany({});
    await prisma.rangoHito.deleteMany({});
    await prisma.comunidad.deleteMany({});
    await prisma.departamento.deleteMany({});
    await prisma.catalogItem.deleteMany({});
    await prisma.catalog.deleteMany({});
  }

}

// Claves que se manejan con tablas propias, no como catalogItem genérico
const CLAVES_ESPECIALES = new Set([
  'departamentos',
  'comunidad',
  'rango_hitos',
  'detalle_rango_hitos'
]);

// Mapeo de clave -> nombre legible para el catálogo
const NOMBRES_CATALOGO: Record<string, string> = {
  tipo_actividad: "Tipo de Actividad",
  tipo_registro: "Tipo de Registro",
  consentimientos: "Consentimientos",
  motivo_no_consentimiento: "Motivos no dió consentimientos",
  tipo_participantes: "Tipo Participantes",
  si_no_list: "Si, No",
  sintomas_enfermedad: "Sintomas de Enfermedad",
  servicios_salud: "Servicios de Salud",
  alimentos_fuentes_hierro: "Alimentos Fuentes de Hierro",
  falta_tiempo_comidas: "Falta de Tiempo para Comidas",
  desinfectar_agua: "Desinfectar el Agua",
  manejo_basura: "Manejo de la Basura",
  tipo_servicio_sanitario: "Tipo de Servicio Sanitario",
  metodo_para_cocinar: "Método para cocinar",
  metodo_extraer_humo: "Método para extraer el humo",
  metodo_cultipo_principal: "Método del cultipo principal",
  tipo_techo_cultivo: "Tipo de Techo en cultivo",
  tipo_fertilizante: "Tipo de Fertilizante",
  tipos_plaga_enfermedades: "Tipo de Plaga",
  metodo_eliminar_plangas: "Método para eliminar plagas",
  motivo_perdida_plantas: "Motivo de pérdidas de plantas",
  tipo_planta_pillones: "Tipo Planta Pillones",
  elementos_basicos_gallinero: "Elementos básicos del gallinero",
  causa_muerte_aver: "Causa muerte aves",
  grupos_bancarios: "Grupo Bancarios",
  destino_ahorros: "Destino de Ahorros",
  forma_corregir_hijos: "Forma Corregir a los hijos",
  pendamientos_espejo: "Pensamientos en el espejo",
  aplicacion_conocimientos_adquiridos: "Aplicación de conocimientos adquiridos",
  ultima_asistencias: "Últimas asistencias",
  motivo_no_consentimiento_madre: "Motivo no consentimiento madre",
  practica_consulta: "Practica Consulta",
  especialidad_evaluador: "Especialidad del Evaludador",
  impedimento_realizacion_sesion: "Impedimiento de realizar la sesión",
  motivo_impedimento_sesion: "Motivo Impedimiento Sesión",
  infraestructuras: "Infraestructuras",
  parte_estructura_cn: "Parte esctructura Centro Nútreme",
  mobiliario_equipo_cn: "Mobiliario y Equipo Centro Nútreme",
  insumos_cn: "Insumos Centro Nútreme",
  utensilios_cn: "Utensilios Centro Nútreme",
  material_didactico_cn: "Material didactico Centro Nútreme",
  material_ludicos_cn: "Material Ludicos Centro Nútreme",
  equipamiento_agua_limpia: "Equipamiento de Agua Limpia",
  equipamiento_saneamiento: "Equipamiento Saneamiento",
  meses: "Meses",
  actividades_cn: "Actividades Centro Nútreme",
  enfermedad_ninio_embarazada: "Enfermedades en niños y Embarazada",
  inasistencia_ninio_embarazada: "Inasistencia Niño y Embarazada",
  lugares_atencion_medica: "Lugares de atención médica",
  servicio_atencion_salud_embarazada: "Servicio de Atención Salud Embarazada",
  servicio_atencion_salud_ninio: "Servicio de Atención Salud Niño",
  ubicacion_punto_peso_edad: "Ubicación Punto para Peso y Edad",
  ubicacion_punto_longitud: "Ubicación Punto Longitud",
  tendencia_peso: "Tendencia de Peso",
  registro_completo: "Registro Completo",
  propietario_carnet: "Propietario de carnet",
  aspectos_evaluacion: "Aspectos de Evaluación",
};

async function seedCatalogos() {
  console.log("Insertando catálogos...");

  for (const [key, items] of Object.entries(catalogosData)) {
    // ✅ Saltar las claves especiales que tienen su propia tabla
    if (CLAVES_ESPECIALES.has(key)) continue;

    // ✅ Usar el nombre legible o capitalizar la clave si no tiene mapeo
    const nombre = NOMBRES_CATALOGO[key] ?? key.replace(/_/g, ' ');

    try {
      const catalog = await prisma.catalog.create({
        data: {
          nombre,
          tiene_cascada: false,
          campo_filtro: null,
          tabla_origen: null,
        },
      });

      const itemsData = (items as any[]).map((item: any) => ({
        id_catalog: catalog.id_catalogo,
        nombre: item.nombre,
      }));

      await prisma.catalogItem.createMany({
        data: itemsData,
        skipDuplicates: true,
      });

      console.log(`✅ ${nombre}: ${itemsData.length} items`);

    } catch (error) {
      console.error(`Error en ${nombre}:`, error);
    }
  }
}
async function seedDepartamentos() {
  const departamentos = catalogosData.departamentos;
  const departamentoMap = new Map<number, number>();

  try {
    for (let i = 0; i < departamentos.length; i++) {
      const dept = departamentos[i];
      const created = await prisma.departamento.create({
        data: {
          nombre: dept.nombre,
        },
      });
      // Guardar mapeo: indice original (1, 2) -> id generado
      departamentoMap.set(i + 1, created.id_departamento);
    }
    return departamentoMap;
  } catch (error) {
    console.error("Error insertando departamentos:", error);
    return new Map();
  }
}

async function seedComunidades(departamentoMap: Map<number, number>) {

  const comunidades = catalogosData.comunidad;

  try {
    for (const com of comunidades) {
      // Usar el ID mapeado del departamento
      const id_departamento = departamentoMap.get(com.id_departamento) || com.id_departamento;

      await prisma.comunidad.create({
        data: {
          nombre: com.nombre,
          id_departamento,
        },
      });
    }
  } catch (error) {
    console.error("Error insertando comunidades:", error);
  }
}

async function seedRangoHitos() {
  const rangos = catalogosData.rango_hitos;
  const detalles = catalogosData.detalle_rango_hitos;
  const rangoMap = new Map<number, number>();

  try {
    for (let i = 0; i < rangos.length; i++) {
      const rango = rangos[i];
      const created = await prisma.rangoHito.create({
        data: {
          nombre: rango.nombre,
        },
      });
      // Guardar mapeo: indice original (1, 2, 3, 4) -> id generado
      rangoMap.set(i + 1, created.id_rango_hito);
    }

    for (const detalle of detalles) {
      // Usar el ID mapeado del rango
      const id_rango_hito = rangoMap.get(detalle.id_hito) || detalle.id_hito;

      await prisma.rangoHitoDetalle.create({
        data: {
          id_rango_hito,
          nombre: detalle.nombre,
        },
      });
    }

  } catch (error) {
    console.error("Error insertando rangos de hitos:", error);
  }
}

// ✅ Función nueva que va después de seedRangoHitos()
async function seedCatalogosEspeciales() {
  console.log("Registrando catálogos especiales...");

  await prisma.catalog.createMany({
    data: [
      {
        nombre: 'Departamentos',
        tiene_cascada: false,
        campo_filtro: null,
        tabla_origen: 'departamento'
      },
      {
        nombre: 'Comunidades',
        tiene_cascada: true,
        campo_filtro: 'id_departamento',
        tabla_origen: 'comunidad'
      },
      {
        nombre: 'Rangos de Hitos',
        tiene_cascada: false,
        campo_filtro: null,
        tabla_origen: 'rangoHito'
      },
      {
        nombre: 'Detalle Rangos de Hitos',
        tiene_cascada: true,
        campo_filtro: 'id_rango_hito',
        tabla_origen: 'rangoHitoDetalle'
      },
    ],
    skipDuplicates: true
  });

  console.log("✅ Catálogos especiales registrados");
}

async function seedModulesRoles() {
  const modules = [
    { id_modulo: 1, nombre: "Administración de Usuarios" },
    { id_modulo: 2, nombre: "Gestión de Catálogos" },
    { id_modulo: 3, nombre: "Acceso a la información" },
    { id_modulo: 4, nombre: "Acciones en Formularios" },
  ];

  await prisma.modulo.createMany({
    data: modules,
    skipDuplicates: true,
  });



  const permisos = [
    // GESTION DE USUARIOS
    { id_permiso: 1, id_modulo: 1, accion: Accion.CREATE, codigo: 'CREATE_USER', descripcion: 'Creación de usuarios' },
    { id_permiso: 2, id_modulo: 1, accion: Accion.UPDATE, codigo: 'UPDATE_USER', descripcion: 'Editar usuarios' },
    { id_permiso: 3, id_modulo: 1, accion: Accion.DELETE, codigo: 'DELETE_USER', descripcion: 'Eliminar usuarios' },
    { id_permiso: 4, id_modulo: 1, accion: Accion.VIEW, codigo: 'VIEW_USER', descripcion: 'Ver lista de usuarios' },
    { id_permiso: 5, id_modulo: 1, accion: Accion.CREATE, codigo: 'CREATE_ROLE', descripcion: 'Creación de roles' },
    { id_permiso: 6, id_modulo: 1, accion: Accion.UPDATE, codigo: 'UPDATE_ROLE', descripcion: 'Editar roles' },
    { id_permiso: 7, id_modulo: 1, accion: Accion.DELETE, codigo: 'DELETE_ROLE', descripcion: 'Eliminar roles' },
    { id_permiso: 8, id_modulo: 1, accion: Accion.VIEW, codigo: 'VIEW_ROLE', descripcion: 'Ver lista de roles' },

    //GESTION DE CATALOGOS
    { id_permiso: 9, id_modulo: 2, accion: Accion.CREATE, codigo: 'CREATE_CATALOG', descripcion: 'Creación de catálogos' },
    { id_permiso: 10, id_modulo: 2, accion: Accion.UPDATE, codigo: 'UPDATE_CATALOG', descripcion: 'Editar catálogos' },
    { id_permiso: 11, id_modulo: 2, accion: Accion.DELETE, codigo: 'DELETE_CATALOG', descripcion: 'Eliminar catálogos' },
    { id_permiso: 12, id_modulo: 2, accion: Accion.VIEW, codigo: 'VIEW_CATALOG', descripcion: 'Ver listado de catálogos' },

    //ACCESO A LA INFORMACIÓN
    { id_permiso: 13, id_modulo: 3, accion: Accion.VIEW, codigo: 'VIEW_TOTAL_CATALOG', descripcion: 'Ver total de catálogos' },
    { id_permiso: 14, id_modulo: 3, accion: Accion.VIEW, codigo: 'VIEW_TOTAL_ANSWER', descripcion: 'Ver total de respuestas' },
    { id_permiso: 15, id_modulo: 3, accion: Accion.VIEW, codigo: 'VIEW_TOTAL_USERS', descripcion: 'Ver total de usuarios' },
    { id_permiso: 16, id_modulo: 3, accion: Accion.VIEW, codigo: 'VIEW_CHARTS', descripcion: 'Ver gráficas' },
    { id_permiso: 17, id_modulo: 3, accion: Accion.VIEW, codigo: 'VIEW_REPORT', descripcion: 'Descargar Reportes' },

    //ACCESO EN FORMULARIOS
    { id_permiso: 18, id_modulo: 4, accion: Accion.CREATE, codigo: 'CREATE_FORM', descripcion: 'Creación de formularios' },
    { id_permiso: 19, id_modulo: 4, accion: Accion.UPDATE, codigo: 'UPDATE_FORM', descripcion: 'Editar formularios' },
    { id_permiso: 20, id_modulo: 4, accion: Accion.DELETE, codigo: 'DELETE_FORM', descripcion: 'Eliminar formularios' },
    { id_permiso: 21, id_modulo: 4, accion: Accion.DELETE, codigo: 'VIEW_FORM', descripcion: 'Ver listado de formularios' },
    { id_permiso: 22, id_modulo: 4, accion: Accion.DELETE, codigo: 'ANSWER_FORM', descripcion: 'Llenar formulario' },
  ]

  await prisma.permiso.createMany({
    data: permisos,
    skipDuplicates: true,
  });

  await prisma.rol.create({
    data: {
      nombre: 'Administrador',
      estado_registro: true,
    }
  })

  await prisma.rolPermiso.createMany({
    data: [
      { id_rol: 1, id_permiso: 1 },
      { id_rol: 1, id_permiso: 2 },
      { id_rol: 1, id_permiso: 3 },
      { id_rol: 1, id_permiso: 4 },
      { id_rol: 1, id_permiso: 5 },
      { id_rol: 1, id_permiso: 6 },
      { id_rol: 1, id_permiso: 7 },
      { id_rol: 1, id_permiso: 8 },
      { id_rol: 1, id_permiso: 9 },
      { id_rol: 1, id_permiso: 10 },
      { id_rol: 1, id_permiso: 11 },
      { id_rol: 1, id_permiso: 12 },
      { id_rol: 1, id_permiso: 13 },
      { id_rol: 1, id_permiso: 14 },
      { id_rol: 1, id_permiso: 15 },
      { id_rol: 1, id_permiso: 16 },
      { id_rol: 1, id_permiso: 17 },
      { id_rol: 1, id_permiso: 18 },
      { id_rol: 1, id_permiso: 19 },
      { id_rol: 1, id_permiso: 20 },
      { id_rol: 1, id_permiso: 21 },
      { id_rol: 1, id_permiso: 22 },
    ]
  })
}

async function seedModuleUsuario() {
  await prisma.usuario.create({
    data: {
      nombres: 'Usuario',
      apellidos: 'Administrador',
      email: 'admin@gmail.com',
      password: '$2b$12$gl24vEUrZSczUhYEwAPqW.swY7UbVjz7Ctja2q3J1mV.V3.bC28qa',
      id_rol: 1,
      accesso_global: true
    }
  })
}

async function main() {
  try {
    console.log("Iniciando seed de catálogos...");

    await truncateTables();
    await seedCatalogos();
    const departamentoMap = await seedDepartamentos();
    await seedComunidades(departamentoMap);
    await seedRangoHitos();
    await seedCatalogosEspeciales();
    await seedModulesRoles();
    await seedModuleUsuario();

    console.log("Catalogos guardados");
  } catch (error) {
    console.error("Error durante el seed:", error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("ERROR AL INGRESAR CATÁLOGOS:", error);
    await prisma.$disconnect();
    process.exit(1);
  });



  /** 
   * 
   * 
   * Select * from "Catalog";
insert into "Catalog" (nombre, estado_registro, fecha_registo, fecha_edicion)
values('Idiomas', true, now(), now());


select * from "CatalogItem" order by id_catalog_item desc;


insert into "CatalogItem"
(id_catalog, nombre, estado_registro, fecha_registro, fecha_edicion)VALUES
(62, 'Español', true, now(), now()),
(62, 'Q''eqchi''', true, now(), now()),
(62, 'Kapchikel', true, now(), now()),
(62, 'Mam', true, now(), now()),
(62, 'Poqomchi''', true, now(), now()),
(62, 'Tz''utujil', true, now(), now()),
(62, 'Achi', true, now(), now()),
(62, 'Q''anjob''al', true, now(), now()),
(62, 'Ixil', true, now(), now()),
(62, 'Akateko', true, now(), now());






insert into "Catalog" (nombre, estado_registro, fecha_registo, fecha_edicion)
values('Religiones', true, now(), now());

insert into "CatalogItem"
(id_catalog, nombre, estado_registro, fecha_registro, fecha_edicion)VALUES
(63, 'Católica', true, now(), now()),
(63, 'Evangélica', true, now(), now()),
(63, 'Testigo de Jehová', true, now(), now()),
(63, 'Mormón', true, now(), now()),
(63, 'Ninguna', true, now(), now());




insert into "Catalog" (nombre, estado_registro, fecha_registo, fecha_edicion)
values('Grupo Étnico', true, now(), now());

insert into "CatalogItem"
(id_catalog, nombre, estado_registro, fecha_registro, fecha_edicion)VALUES
(64, 'Maya - Q''eqchi', true, now(), now()),
(64, 'Maya - Kaqchikel', true, now(), now()),
(64, 'Garífuna', true, now(), now()),
(64, 'Ladina', true, now(), now()),
(64, 'Mestizo', true, now(), now()),
(64, 'Xinca', true, now(), now());
   * 
   * 
   * 
   * 
  */