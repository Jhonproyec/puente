import { formBuilderController } from "@/controllers/formBuilderController";
import { Router } from "express";

export const formRouter = Router();

formRouter.post('/create', formBuilderController.createForm);
formRouter.get('/getMyForms', formBuilderController.getMyForms);
formRouter.get('/all', formBuilderController.getAllForms);
formRouter.put('/updateName', formBuilderController.updateNameForm);
formRouter.delete('/delete', formBuilderController.deleteForm);
formRouter.put('/saveForm', formBuilderController.saveJsonform);
formRouter.get('/getFormByUuid', formBuilderController.getFormByUuid);
formRouter.get('/:uuid/info', formBuilderController.getFormInfo);
formRouter.get('/:uuid/preview', formBuilderController.getFormPreview);
