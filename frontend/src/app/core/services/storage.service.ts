import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FormDefinition {
  name: string;
  regions: any[];
}

export interface StoredForm {
  id: string;
  formKey: string; // ej: "formulario1/form-build1"
  definition: FormDefinition;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class FormStorageService {
  private readonly FORM_URL = environment.BASE_URL + '/formBuilder';
  private readonly STORAGE_KEY = 'dynamic_forms_storage';
  private formsSubject = new BehaviorSubject<StoredForm[]>([]);
  public forms$ = this.formsSubject.asObservable();


  constructor(
    private http: HttpClient
  ) {
    // this.loadAllForms();
  }

  /**
   * Cargar todas las formas del localStorage
   */
  // private loadAllForms(): void {
  //   try {
  //     const stored = localStorage.getItem(this.STORAGE_KEY);
  //     if (stored) {
  //       const forms = JSON.parse(stored);
  //       this.formsSubject.next(forms);
  //       console.log('📦 Formularios cargados desde localStorage:', forms);
  //     } else {
  //       this.formsSubject.next([]);
  //       console.log('📦 localStorage vacío - Sin formularios guardados');
  //     }
  //   } catch (error) {
  //     console.error('❌ Error al cargar formularios:', error);
  //     this.formsSubject.next([]);
  //   }
  // }

  /**
   * Guardar todos los formularios en localStorage
   */
  private saveAllForms(forms: StoredForm[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(forms));
      this.formsSubject.next(forms);
      console.log('💾 Formularios guardados en localStorage:', forms);
    } catch (error) {
      console.error('❌ Error al guardar formularios:', error);
    }
  }

  /**
   * Obtener formulario por clave (ej: "formulario1/form-build1")
   * @param formKey Identificador del formulario
   * @returns FormDefinition si existe, null si no existe
   */
  getFormByKey(formKey: string):Observable< FormDefinition | null> {
    return this.http.get(`${this.FORM_URL}/getFormByUuid?uuid=${formKey}`).pipe(
      map((response:any) => {
        if(response.success){
          return response.data.estructura;
        }
        return null;
      }),
      catchError(error => {
        console.log("error al cargar el formulario");
        return throwError(() => new Error("Error al cargar el formulario"));
      })
      
    )
    // const forms = this.formsSubject.value;
    // const found = forms.find(f => f.formKey === formKey);
    
    // if (found) {
    //   console.log('✅ Formulario encontrado:', found);
    //   return found.definition;
    // }
    
    // console.log('❌ Formulario no encontrado:', formKey);
    // return null;
  }

  /**
   * Verificar si un formulario existe
   * @param formKey Identificador del formulario
   * @returns true si existe, false si no
   */
  formExists(formKey: string): boolean {
    const exists = this.formsSubject.value.some(f => f.formKey === formKey);
    console.log(`🔍 Formulario "${formKey}" existe:`, exists);
    return exists;
  }

  /**
   * Guardar o actualizar un formulario
   * @param formKey Identificador del formulario (ej: "formulario1/form-build1")
   * @param definition Estructura del formulario
   */
  saveForm(formKey: string, definition: FormDefinition, estado: string, idUser: number):Observable<FormDefinition | null> {
    const data = {
      uuid: formKey,
      jsonForm: definition,   
      estado
    }

    return this.http.put(`${this.FORM_URL}/saveForm`, data).pipe(
      map((response: any) => {
        if(response.success){
          return response.data;
        }else{
          return null;
        }
      }),
      catchError(error => {
        console.log("Error al guardar el fomrulario");
        return throwError(() => new Error("Error al guardadr el formulario"));
      })
    )
  }

  /**
   * Eliminar un formulario
   * @param formKey Identificador del formulario
   */
  deleteForm(formKey: string): void {
    const forms = this.formsSubject.value.filter(f => f.formKey !== formKey);
    this.saveAllForms(forms);
    console.log('🗑️ Formulario eliminado:', formKey);
  }

  /**
   * Obtener todos los formularios guardados
   * @returns Array de formularios guardados
   */
  getAllForms(): StoredForm[] {
    return this.formsSubject.value;
  }

  /**
   * Obtener observable de todos los formularios
   * @returns Observable con array de formularios
   */
  getAllForms$(): Observable<StoredForm[]> {
    return this.forms$;
  }

  /**
   * Limpiar todos los formularios guardados
   */
  clearAllForms(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.formsSubject.next([]);
    console.log('🗑️ Todos los formularios fueron eliminados');
  }

  /**
   * Exportar formulario como JSON
   * @param formKey Identificador del formulario
   * @returns JSON string del formulario
   */
  exportForm(formKey: string): string | null {
    const form = this.getFormByKey(formKey);
    if (form) {
      return JSON.stringify(form, null, 2);
    }
    return null;
  }

  /**
   * Importar formulario desde JSON
   * @param formKey Identificador del formulario
   * @param jsonString JSON del formulario
   * @returns true si se importó correctamente
   */
  // importForm(formKey: string, jsonString: string): boolean {
  //   try {
  //     const definition = JSON.parse(jsonString);
  //     this.saveForm(formKey, definition);
  //     console.log('✅ Formulario importado:', formKey);
  //     return true;
  //   } catch (error) {
  //     console.error('❌ Error al importar formulario:', error);
  //     return false;
  //   }
  // }

  /**
   * Obtener estadísticas de almacenamiento
   */
  getStorageStats(): {
    totalForms: number;
    forms: Array<{ formKey: string; createdAt: string; updatedAt: string }>;
  } {
    const forms = this.formsSubject.value;
    return {
      totalForms: forms.length,
      forms: forms.map(f => ({
        formKey: f.formKey,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt
      }))
    };
  }
}