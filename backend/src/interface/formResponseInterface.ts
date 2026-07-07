export interface SaveResponseInput {
  id_formulario: number | string;
  id_usuario?: number | undefined | null;
  responses: Record<string, any>;
  estructura?: {
    regions: Array<{
      id: string;
      regionType?: string;
      title?: string;
      elements: Array<{
        id: string;
        type: string;
        fieldRole?: string;
        label: string;
      }>;
    }>;
  };
  visibleElements: string[]; // IDs de elementos visibles al momento de enviar
}
