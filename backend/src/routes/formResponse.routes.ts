import { formResponseController } from '@/controllers/formResponseController';
import { Router } from 'express';

export const formResponseRouter = Router();

formResponseRouter.get('/persona/:cui', formResponseController.getPersonaByCui);
formResponseRouter.get('/persona/codigo/:codigo',  formResponseController.getPersonaByCodigoTemporal);
formResponseRouter.get('/detail/:id_respuesta', formResponseController.getResponseById);

formResponseRouter.post('/save', formResponseController.saveResponse);
formResponseRouter.get('/carnet', formResponseController.getCarnetPersonas);
formResponseRouter.get('/docentes', formResponseController.getEvaluacionesDocentes);
formResponseRouter.get('/:id_formulario', formResponseController.getResponses);
formResponseRouter.get('/:uuid/responses',formResponseController.getFormResponses);
formResponseRouter.delete('/:id_respuesta',formResponseController.deleteResponse);
formResponseRouter.put('/:id_respuesta',formResponseController.updateResponse);
formResponseRouter.get('/persona/:id_persona/qr', formResponseController.generarQrPersona);