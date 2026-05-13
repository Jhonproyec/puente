import { prisma } from "@/config/database";
import { logger } from "@/config/logger";
import { CreateFormInterface, FormBuilderInterface } from "@/interface/formBuilderInterface";
import { ConflictError } from "@/utils/appError";
import { EstadoForm } from "@prisma/client";
import { cacheService } from "./cache.service";

const KEY_CATALOG = 'forms'

class FormBuilderService {
    async createForm(form: CreateFormInterface): Promise<FormBuilderInterface> {
        try {
            const cacheKey = `${KEY_CATALOG}:all`;
            const result = await prisma.$transaction(async (tx) => {
                const catalog = await tx.formulario.findFirst({
                    where: { nombre: form.name, estado_registro: true }
                });

                if (catalog) {
                    throw new ConflictError('El nombre del formulario ya existe')
                }

                const newForm = await tx.formulario.create({
                    data: {
                        nombre: form.name,
                        usuario_registro: form.created_user!,
                        estado: form.status == 'PUBLICADO'
                            ? EstadoForm.PUBLICADO
                            : EstadoForm.BORRADOR,
                    }
                });
                await tx.formularioUsuario.create({
                    data: {
                        id_formulario: newForm.id_formulario,
                        id_usuario: newForm.usuario_registro
                    }
                });
                return newForm
            });
            const response: FormBuilderInterface = {
                created_user: result.usuario_registro,
                id_form: result.id_formulario,
                name: result.nombre,
                uuid: result.uuid,
            }
            cacheService.delete(cacheKey);
            return response;
        } catch (error) {
            logger.error("Error al crear el formulario", error);
            throw error;
        }
    }

    async getAllForms(): Promise<FormBuilderInterface[]> {
        try {
            const cacheKey = `${KEY_CATALOG}:all`;
            const cached = cacheService.get<FormBuilderInterface[]>(cacheKey);
            if (cached) {
                console.log('Desde cache');
                return cached;
            }
            const forms = await prisma.formulario.findMany({
                where: { estado_registro: true, estado: EstadoForm.PUBLICADO }
            })
            const response: FormBuilderInterface[] = forms.map(form => ({
                name: form.nombre,
                id_form: form.id_formulario,
                uuid: form.uuid
            }));
            cacheService.set(cacheKey, response);
            return response;
        } catch (error) {
            logger.error("Error al crear el formulario", error);
            throw error;
        }
    }

    async getMyForms(idUsuario: number): Promise<any> {
        try {
            const forms = await prisma.formulario.findMany({
                where: {
                    estado_registro: true,
                    OR: [
                        {
                            creador: { id_usuario: idUsuario }
                        },
                        {
                            usuariosAsignados: { some: { id_usuario: idUsuario } }
                        }

                    ]
                },
                distinct: ['id_formulario'],
                orderBy: {
                    fecha_registro: 'asc'
                }
            })
            console.log(forms);
            return forms;
        } catch (error) {
            logger.error('Error al obtener los formularios', error);
            throw error;
        }
    }

    async updateNameForm(data: { name: string, uuid: string, id_usuario: number }): Promise<FormBuilderInterface> {
        try {
            const cacheKey = `${KEY_CATALOG}:all`;
            const result = await prisma.$transaction(async (tx) => {
                const existing = await tx.formulario.findFirst({
                    where: {
                        nombre: data.name,
                        uuid: { not: data.uuid }
                    }
                });
                if (existing) {
                    throw new ConflictError('El nombre del formulario ya existe');
                }
                const newForm = await tx.formulario.update({
                    where: { uuid: data.uuid },
                    data: {
                        nombre: data.name,
                        usuario_modifico: data.id_usuario
                    }
                });
                return newForm
            });
            const response: FormBuilderInterface = {
                created_user: result.usuario_registro,
                id_form: result.id_formulario,
                name: result.nombre,
                uuid: result.uuid,
            }
            cacheService.delete(cacheKey);
            return response;
        } catch (error) {
            logger.error('Error al editar el nombre del formulario', error);
            throw error;
        }
    }

    async deleteForm(uuid: string, id_usuario: number): Promise<void> {
        try {
            const cacheKey = `${KEY_CATALOG}:all`;
            const existing = await prisma.formulario.findFirst({
                where: { uuid, estado_registro: true }
            });
            if (!existing) {
                throw new ConflictError('El formulario no fue encontrado')
            }
            await prisma.formulario.update({
                data: {
                    estado_registro: false,
                    usuario_modifico: id_usuario
                },
                where: { uuid }
            });
            cacheService.delete(cacheKey);
        } catch (error) {
            logger.error('Error al editar el nombre del formulario', error);
            throw error;
        }
    }

    async saveJsonform(uuid: string, jsonForm: any, estado: string, idUser: number) {
        try {
            const cacheKey = `${KEY_CATALOG}:info:${uuid}`;
            const existing = await prisma.formulario.findFirst({
                where: { uuid: uuid, estado_registro: true }
            });
            if (!existing) {
                throw new ConflictError("Formulario no encontrado");
            }
            const isPublicado = estado !== 'BORRADOR';
            const updateData: any = {
                estructura: jsonForm,
                estado: isPublicado ? EstadoForm.PUBLICADO : EstadoForm.BORRADOR,
                usuario_modifico: idUser,
            };

            if (isPublicado) {
                updateData.version = { increment: 1 };
            }

            console.log(updateData);
            const form = await prisma.formulario.update({
                where: { uuid: uuid },
                data: updateData
            });
            cacheService.delete(cacheKey);
            return form;
        } catch (error) {
            logger.error('Error al editar el nombre del formulario', error);
            throw error;
        }
    }

    async getFormByUuid(uuid: string): Promise<any> {
        try {
            const form = await prisma.formulario.findFirst({
                where: { uuid, estado_registro: true }
            });
            if (!form) {
                throw new ConflictError('No se encontró el formulario');
            }
            return form;
        } catch (error) {
            logger.error('Error al editar el nombre del formulario', error);
            throw error;
        }
    }

    async getFormInfo(uuid: string): Promise<any> {
        try {
            const cacheKey = `${KEY_CATALOG}:info:${uuid}`;
            const cached = cacheService.get(cacheKey);
            if (cached) {
                console.log("Desde la caché")
                return cached;
            }

            const form = await prisma.formulario.findFirst({
                where: { uuid, estado_registro: true },
                include: {
                    creador: {
                        select: { nombres: true, apellidos: true }
                    },
                    _count: {
                        select: { respuestas: { where: { estado_registro: true } } }
                    }
                }
            });

            if (!form) throw new ConflictError('Formulario no encontrado');

            // Contar total de campos en la estructura
            let totalFields = 0;
            if (form.estructura) {
                const estructura = form.estructura as any;
                estructura.regions?.forEach((region: any) => {
                    totalFields += region.elements?.length || 0;
                });
            }

            const response = {
                id_formulario: form.id_formulario,
                uuid: form.uuid,
                nombre: form.nombre,
                estado: form.estado,
                version: form.version,
                totalFields,
                totalResponses: form._count.respuestas,
                creadoPor: `${form.creador.nombres} ${form.creador.apellidos}`,
                fecha_registro: form.fecha_registro,
                fecha_edicion: form.fecha_edicion,
            };

            cacheService.set(cacheKey, response);
            return response;
        } catch (error) {
            logger.error('Error al obtener info del formulario', error);
            throw error;
        }
    }


    async getFormPreview(uuid: string): Promise<any> {
        try {
            const form = await prisma.formulario.findFirst({
                where: { uuid, estado_registro: true }
            });

            if (!form) throw new ConflictError('Formulario no encontrado');

            const estructura = form.estructura as any;
            const regions = estructura.regions || [];

            // Recopilar todos los catalogTypes únicos para buscarlos en una sola query
            const catalogIds = new Set<number>();
            regions.forEach((region: any) => {
                region.elements.forEach((element: any) => {
                    if (element.catalogType) {
                        catalogIds.add(Number(element.catalogType));
                    }
                });
            });

            // Obtener todos los catálogos necesarios con sus items en una sola query
            const catalogos = await prisma.catalog.findMany({
                where: {
                    id_catalogo: { in: Array.from(catalogIds) },
                    estado_registro: true
                },
                include: {
                    items: {
                        where: { estado_registro: true },
                        select: { id_catalog_item: true, nombre: true }
                    }
                }
            });

            // Obtener catálogos especiales (departamentos, comunidades, etc.)
            const catalogosEspeciales = await prisma.catalog.findMany({
                where: {
                    id_catalogo: { in: Array.from(catalogIds) },
                    tabla_origen: { not: null }
                }
            });

            // Resolver items de tablas especiales
            const especialesResueltos = new Map<number, any[]>();
            for (const cat of catalogosEspeciales) {
                if (cat.tabla_origen === 'departamento') {
                    const items = await prisma.departamento.findMany({
                        where: { estado_registro: true },
                        select: { id_departamento: true, nombre: true }
                    });
                    especialesResueltos.set(cat.id_catalogo, items.map(i => ({
                        id: i.id_departamento, nombre: i.nombre
                    })));
                } else if (cat.tabla_origen === 'comunidad') {
                    const items = await prisma.comunidad.findMany({
                        where: { estado_registro: true },
                        select: { id_comunidad: true, id_departamento: true, nombre: true }
                    });
                    especialesResueltos.set(cat.id_catalogo, items.map(i => ({
                        id: i.id_comunidad,
                        id_departamento: i.id_departamento,
                        nombre: i.nombre
                    })));
                } else if (cat.tabla_origen === 'rangoHito') {
                    const items = await prisma.rangoHito.findMany({
                        where: { estado_registro: true },
                        select: { id_rango_hito: true, nombre: true }
                    });
                    especialesResueltos.set(cat.id_catalogo, items.map(i => ({
                        id: i.id_rango_hito, nombre: i.nombre
                    })));
                }
            }

            // Crear mapa de catalogId -> items resueltos
            const catalogMap = new Map<number, { id: number; nombre: string }[]>();

            catalogos.forEach(cat => {
                if (especialesResueltos.has(cat.id_catalogo)) {
                    catalogMap.set(cat.id_catalogo, especialesResueltos.get(cat.id_catalogo)!);
                } else {
                    catalogMap.set(cat.id_catalogo, cat.items.map(i => ({
                        id: i.id_catalog_item,
                        nombre: i.nombre
                    })));
                }
            });

            // Resolver cada elemento de la estructura
            const regionsResueltas = regions.map((region: any) => {
                const elementosResueltos = region.elements
                    .filter((element: any) => element.type !== 'camera') // ✅ Omitir cámara
                    .map((element: any) => {
                        // ✅ Fechas y texto -> campo de texto simple
                        if (['date', 'time'].includes(element.type)) {
                            return { ...element, previewType: 'text' };
                        }

                        // ✅ Coordenadas -> texto
                        if (element.type === 'coordinates') {
                            return { ...element, previewType: 'text' };
                        }

                        // ✅ Resolver opciones de catálogo
                        if (element.catalogType) {
                            const catId = Number(element.catalogType);
                            const items = catalogMap.get(catId) || [];

                            // Si tiene selectedOptions (IDs específicos), filtrar solo esos
                            let opcionesFinales = items;
                            if (element.enableSpecificOptions && element.selectedOptions?.length > 0) {
                                const selectedIds = element.selectedOptions.map((s: any) =>
                                    typeof s === 'object' ? s.id : Number(s)
                                );
                                opcionesFinales = items.filter(i => selectedIds.includes(i.id));
                            }

                            // Verificar si tiene cascada
                            const tieneCascada = element.cascadeConfig?.enabled === true;

                            return {
                                ...element,
                                previewType: tieneCascada ? 'cascade' : element.type,
                                resolvedOptions: opcionesFinales,
                                cascadeLabel: tieneCascada ? element.cascadeConfig.triggerFieldLabel : null
                            };
                        }

                        // ✅ Opciones manuales (selectedOptions con objetos {id, nombre})
                        if (element.selectedOptions?.length > 0 &&
                            typeof element.selectedOptions[0] === 'object') {
                            return {
                                ...element,
                                previewType: element.type,
                                resolvedOptions: element.selectedOptions
                            };
                        }

                        return { ...element, previewType: element.type };
                    });

                return {
                    ...region,
                    elements: elementosResueltos
                };
            });

            return {
                uuid: form.uuid,
                nombre: form.nombre,
                estado: form.estado,
                version: form.version,
                fecha_registro: form.fecha_registro,
                regions: regionsResueltas
            };

        } catch (error) {
            logger.error('Error al generar vista previa', error);
            throw error;
        }
    }
}

export const formBuilderService = new FormBuilderService();