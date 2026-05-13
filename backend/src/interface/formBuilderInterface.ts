export interface FormBuilderInterface{
    id_form?: number;
    uuid?: string;
    name: string;
    status?: string;
    version?: number;
    structure_form?: string;
    active?: boolean;
    created_user?: number;
    updated_user?: number;
    created_at?: any;
    updated_at?: any
}

export interface CreateFormInterface extends Omit<
    FormBuilderInterface, 'id_form' | 'uuid' | 'version' | 'active'>
{}