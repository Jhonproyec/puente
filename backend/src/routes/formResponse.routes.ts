import { formResponseController } from '@/controllers/formResponseController';
import { Router } from 'express';

export const formResponseRouter = Router();

formResponseRouter.post('/save', formResponseController.saveResponse);
formResponseRouter.get('/:id_formulario', formResponseController.getResponses);
formResponseRouter.get('/:uuid/responses',formResponseController.getFormResponses);
formResponseRouter.delete('/:id_respuesta',formResponseController.deleteResponse);
formResponseRouter.put('/:id_respuesta',formResponseController.updateResponse);
formResponseRouter.get('/persona/:cui', formResponseController.getPersonaByCui);