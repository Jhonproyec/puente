-- Índice GIN para búsquedas dentro del JSONB
CREATE INDEX idx_respuesta_datos_limpios_gin 
ON "FormularioRespuesta" USING GIN (datos_limpios);

-- Índice para reportes por formulario + comunidad + fecha
CREATE INDEX idx_respuesta_form_comunidad_fecha 
ON "FormularioRespuesta" (id_formulario, id_comunidad, fecha_registro);

-- Índice para reportes por formulario + departamento + fecha
CREATE INDEX idx_respuesta_form_depto_fecha 
ON "FormularioRespuesta" (id_formulario, id_departamento, fecha_registro);

-- Índice para consultas por usuario
CREATE INDEX idx_respuesta_usuario_fecha 
ON "FormularioRespuesta" (id_usuario, fecha_registro);

-- Índice para versiones de formulario
CREATE INDEX idx_respuesta_form_version 
ON "FormularioRespuesta" (id_formulario, version_form);

-- Índice para búsquedas por tipo + comunidad (reporte más común)
CREATE INDEX idx_persona_tipo_comunidad 
ON "Persona" (tipo_persona, id_comunidad);

-- Índice para búsquedas por fecha de nacimiento (reportes por edad)
CREATE INDEX idx_persona_fecha_nac 
ON "Persona" (fecha_nacimiento) WHERE fecha_nacimiento IS NOT NULL;

-- Índice para búsquedas por sexo + tipo (niños masculino/femenino)
CREATE INDEX idx_persona_sexo_tipo 
ON "Persona" (sexo, tipo_persona) WHERE estado_registro = true;

CREATE INDEX idx_resp_persona_rol 
ON "FormularioRespuestaPersona" (id_persona, rol_en_form);

-- Vista: Personas con comunidad, departamento y edad calculada
CREATE OR REPLACE VIEW v_personas_completo AS
SELECT
  p.id_persona,
  p.cui,
  p.nombres,
  p.apellidos,
  p.fecha_nacimiento,
  p.sexo,
  p.tipo_persona,
  p.direccion,
  p.fecha_ingreso_programa,
  p.cui_madre,
  c.id_comunidad,
  c.nombre                                              AS comunidad,
  d.id_departamento,
  d.nombre                                              AS departamento,
  EXTRACT(YEAR FROM AGE(NOW(), p.fecha_nacimiento))::INT AS edad_anios,
  (
    EXTRACT(YEAR FROM AGE(NOW(), p.fecha_nacimiento)) * 12 +
    EXTRACT(MONTH FROM AGE(NOW(), p.fecha_nacimiento))
  )::INT                                                AS edad_meses,
  CASE
    WHEN p.fecha_nacimiento IS NULL        THEN 'Sin datos'
    WHEN AGE(NOW(), p.fecha_nacimiento) <  INTERVAL '1 year'  THEN '0 a 1 año'
    WHEN AGE(NOW(), p.fecha_nacimiento) <  INTERVAL '2 years' THEN '1 a 2 años'
    WHEN AGE(NOW(), p.fecha_nacimiento) <  INTERVAL '3 years' THEN '2 a 3 años'
    WHEN AGE(NOW(), p.fecha_nacimiento) <  INTERVAL '4 years' THEN '3 a 4 años'
    ELSE 'Mayor de 4 años'
  END                                                   AS rango_edad
FROM "Persona" p
LEFT JOIN "Comunidad"    c ON c.id_comunidad    = p.id_comunidad
LEFT JOIN "Departamento" d ON d.id_departamento = c.id_departamento
WHERE p.estado_registro = true;

-- Vista: Resumen de personas por comunidad
CREATE OR REPLACE VIEW v_resumen_personas_comunidad AS
SELECT
  d.id_departamento,
  d.nombre                                                                      AS departamento,
  c.id_comunidad,
  c.nombre                                                                      AS comunidad,
  COUNT(p.id_persona)                                                           AS total_personas,
  COUNT(p.id_persona) FILTER (WHERE p.tipo_persona = 'embarazada')             AS total_embarazadas,
  COUNT(p.id_persona) FILTER (WHERE p.tipo_persona = 'nino')                   AS total_ninos,
  COUNT(p.id_persona) FILTER (WHERE p.tipo_persona = 'nino' AND p.sexo = 'M') AS ninos_masculino,
  COUNT(p.id_persona) FILTER (WHERE p.tipo_persona = 'nino' AND p.sexo = 'F') AS ninos_femenino,
  -- Rangos de edad para niños
  COUNT(p.id_persona) FILTER (
    WHERE p.tipo_persona = 'nino'
    AND AGE(NOW(), p.fecha_nacimiento) < INTERVAL '1 year'
  )                                                                             AS ninos_0_1,
  COUNT(p.id_persona) FILTER (
    WHERE p.tipo_persona = 'nino'
    AND AGE(NOW(), p.fecha_nacimiento) >= INTERVAL '1 year'
    AND AGE(NOW(), p.fecha_nacimiento) <  INTERVAL '2 years'
  )                                                                             AS ninos_1_2,
  COUNT(p.id_persona) FILTER (
    WHERE p.tipo_persona = 'nino'
    AND AGE(NOW(), p.fecha_nacimiento) >= INTERVAL '2 years'
    AND AGE(NOW(), p.fecha_nacimiento) <  INTERVAL '3 years'
  )                                                                             AS ninos_2_3,
  COUNT(p.id_persona) FILTER (
    WHERE p.tipo_persona = 'nino'
    AND AGE(NOW(), p.fecha_nacimiento) >= INTERVAL '3 years'
    AND AGE(NOW(), p.fecha_nacimiento) <  INTERVAL '4 years'
  )                                                                             AS ninos_3_4
FROM "Persona" p
LEFT JOIN "Comunidad"    c ON c.id_comunidad    = p.id_comunidad
LEFT JOIN "Departamento" d ON d.id_departamento = c.id_departamento
WHERE p.estado_registro = true
GROUP BY d.id_departamento, d.nombre, c.id_comunidad, c.nombre;

-- Vista: Respuestas por comunidad con datos del usuario
CREATE OR REPLACE VIEW v_respuestas_por_comunidad AS
SELECT
  fr.id_respuesta,
  fr.id_formulario,
  f.nombre                                       AS nombre_formulario,
  fr.version_form,
  fr.fecha_registro,
  u.id_usuario,
  u.nombres || ' ' || u.apellidos               AS usuario,
  d.id_departamento,
  d.nombre                                       AS departamento,
  c.id_comunidad,
  c.nombre                                       AS comunidad,
  fr.datos_limpios
FROM "FormularioRespuesta" fr
JOIN  "Formulario"   f ON f.id_formulario   = fr.id_formulario
LEFT JOIN "Usuario"  u ON u.id_usuario      = fr.id_usuario
LEFT JOIN "Comunidad"    c ON c.id_comunidad    = fr.id_comunidad
LEFT JOIN "Departamento" d ON d.id_departamento = fr.id_departamento
WHERE fr.estado_registro = true;

-- Vista: Detalle completo respuesta + persona
CREATE OR REPLACE VIEW v_respuestas_detalle AS
SELECT
  fr.id_respuesta,
  fr.id_formulario,
  f.nombre                                       AS formulario,
  fr.version_form,
  fr.fecha_registro,
  u.nombres || ' ' || u.apellidos               AS usuario_que_lleno,
  d.nombre                                       AS departamento,
  c.nombre                                       AS comunidad,
  p.cui,
  p.nombres,
  p.apellidos,
  p.tipo_persona,
  frp.rol_en_form,
  fr.datos_limpios
FROM "FormularioRespuesta" fr
JOIN  "Formulario"              f   ON f.id_formulario   = fr.id_formulario
LEFT JOIN "Usuario"             u   ON u.id_usuario      = fr.id_usuario
LEFT JOIN "Comunidad"           c   ON c.id_comunidad    = fr.id_comunidad
LEFT JOIN "Departamento"        d   ON d.id_departamento = fr.id_departamento
LEFT JOIN "FormularioRespuestaPersona" frp ON frp.id_respuesta = fr.id_respuesta
LEFT JOIN "Persona"             p   ON p.id_persona      = frp.id_persona
WHERE fr.estado_registro = true;


-- Vista: Respuestas agrupadas por mes
CREATE OR REPLACE VIEW v_respuestas_por_mes AS
SELECT
  f.nombre                                       AS formulario,
  fr.id_formulario,
  DATE_TRUNC('month', fr.fecha_registro)         AS mes,
  d.id_departamento,
  d.nombre                                       AS departamento,
  c.id_comunidad,
  c.nombre                                       AS comunidad,
  COUNT(*)                                       AS total_respuestas,
  COUNT(DISTINCT fr.id_usuario)                  AS total_usuarios
FROM "FormularioRespuesta" fr
JOIN  "Formulario"   f ON f.id_formulario   = fr.id_formulario
LEFT JOIN "Comunidad"    c ON c.id_comunidad    = fr.id_comunidad
LEFT JOIN "Departamento" d ON d.id_departamento = fr.id_departamento
WHERE fr.estado_registro = true
GROUP BY
  f.nombre, fr.id_formulario,
  DATE_TRUNC('month', fr.fecha_registro),
  d.id_departamento, d.nombre,
  c.id_comunidad, c.nombre;