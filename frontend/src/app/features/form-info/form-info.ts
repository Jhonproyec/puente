import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { FillFormModal } from '../fill-form-modal/fill-form-modal';
import { FormInfoData, FormInfoService, FormResponse, GetResponsesFilters } from '../../core/services/form-info.service';
import { FormInfoFamilias } from './components/form-info-familias/form-info-familias';
import { CARNET_FORM_UUID, CENTRO_NUTREME_FORM_UUID, DOCENTES_FORM_KEY, FAMILIA_FORM_UUID, HITOS_FORM_UUID } from '../../core/constants/form-regions.constants';
import { FormInfoCarnet } from './components/form-info-carnet/form-info-carnet';
import { FormInfoHitos } from './components/form-info-hitos/form-info-hitos';
import { FormInfoCentroNutreme } from './components/form-info-centro-nutreme/form-info-centro-nutreme';
import { FormInfoDocentes } from './components/form-info-docentes/form-info-docentes';

@Component({
  selector: 'app-form-info',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatChipsModule,
    FormInfoFamilias,
    FormInfoCarnet,
    FormInfoHitos,
    FormInfoCentroNutreme,
    FormInfoDocentes,
  ],
  templateUrl: './form-info.html',
  styleUrl: './form-info.css'
})
export class FormInfo implements OnInit {

  formKey: string = '';
  formData: FormInfoData | null = null;
  isLoadingInfo = true;
  isLoadingTable = false;

  esFormularioCarnet = false;
  formId = 0;
  formDataLoaded = false;

  // Tabla
  responses: FormResponse[] = [];
  totalResponses = 0;
  pageSize = 10;
  pageIndex = 0;
  displayedColumns = ['fecha', 'usuario', 'departamento', 'comunidad', 'personas', 'acciones'];

  esFomularioFamilias: Boolean = false;
  esFormularioCentroNutreme: Boolean = false;
  esFormularioDocentes = false;
  @ViewChild(FormInfoFamilias) formInfoFamiliasRef?: FormInfoFamilias;
  @ViewChild(FormInfoCarnet) formInfoCarnetRef?: FormInfoCarnet;
  @ViewChild(FormInfoHitos) formInfoHitosRef?: FormInfoHitos;
  @ViewChild(FormInfoCentroNutreme) formCentroNutremeRef?: FormInfoCentroNutreme;
  @ViewChild(FormInfoDocentes) formInfoDocentesRef?: FormInfoDocentes;


  // VARIABLES FORMULARIO HITOS
  esFormularioHitos = false;


  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private formInfoService: FormInfoService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.formKey = params['uuid'];

      //Validar si es el formulario de familias
      this.esFomularioFamilias = this.formKey === FAMILIA_FORM_UUID;
      this.esFormularioCarnet = this.formKey === CARNET_FORM_UUID;
      this.esFormularioHitos = this.formKey === HITOS_FORM_UUID;
      this.esFormularioCentroNutreme = this.formKey === CENTRO_NUTREME_FORM_UUID
      this.esFormularioDocentes = this.formKey === DOCENTES_FORM_KEY;

      this.loadFormInfo();

      if (this.esFomularioFamilias) {
        // hijo lo maneja
      } else if (this.esFormularioCarnet) {
        // hijo lo maneja
      } else if (this.esFormularioHitos) {
        // hijo lo maneja
      } else if(this.esFormularioCentroNutreme){
        // hijo lo maneja
      } else if(this.esFormularioDocentes){
        //hijo l omaneja
      }
      else {
        this.loadResponses();
      }
    });

  }

  loadFormInfo(): void {
    this.isLoadingInfo = true;
    this.formInfoService.getFormInfo(this.formKey).subscribe({
      next: (data) => {
        this.formData = data;
        this.isLoadingInfo = false;
        this.formDataLoaded = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingInfo = false;
        this.formDataLoaded = true;
        this.cdr.markForCheck();
      }
    });
  }

  loadResponses(filters?: GetResponsesFilters): void {
    this.isLoadingTable = true;
    this.formInfoService.getFormResponses(this.formKey, {
      page: this.pageIndex + 1,
      limit: this.pageSize,
      ...filters
    }).subscribe({
      next: (data) => {
        this.responses = data.data;
        this.totalResponses = data.pagination.total;
        this.isLoadingTable = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingTable = false;
        this.cdr.markForCheck();
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadResponses();
  }

  // onFillForm(): void {
  //   this.router.navigate([`/formulario/${this.formKey}/fill`]);
  // }

  onFillForm(): void {
    const dialogRef = this.dialog.open(FillFormModal, {
      width: '80vw',
      maxWidth: '95vw',
      disableClose: false,
      data: { formKey: this.formKey }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.formInfoService.invalidateInfoCache(this.formKey);
        setTimeout(() => {
          this.loadFormInfo();
          if (this.esFomularioFamilias) {
            this.formInfoFamiliasRef?.loadFamilias();
          } else if (this.esFormularioCarnet) {
            // ✅ Recargar tabla de carnet
            this.formInfoCarnetRef?.loadPersonas();
          } else if (this.esFormularioHitos) {
            this.formInfoHitosRef?.loadEncuestas();
          } else if(this.esFormularioCentroNutreme){
            this.formCentroNutremeRef?.loadEvaluaciones();
          }else if(this.esFormularioDocentes){
            this.formInfoDocentesRef?.loadEvaluaciones();
          }
          else {
            this.loadResponses();
          }
        }, 0);
      }
    });
  }

  onDeleteResponse(id_respuesta: number): void {
    if (!confirm('¿Estás seguro de eliminar esta respuesta?')) return;

    this.formInfoService.deleteResponse(id_respuesta).subscribe({
      next: () => {
        this.formInfoService.invalidateInfoCache(this.formKey);
        this.loadFormInfo();
        this.loadResponses();
      },
      error: () => alert('❌ Error al eliminar la respuesta')
    });
  }

  onViewPreview(): void {
    window.open(`/formulario/${this.formKey}/preview`, '_blank');
  }

  onEditForm(): void {
    this.router.navigate([`/formulario/${this.formKey}/form-build`]);
  }

  getEstadoColor(): string {
    return this.formData?.estado === 'PUBLICADO' ? 'primary' : 'warn';
  }

  getPersonasLabel(response: FormResponse): string {
    if (!response.personas?.length) return 'Sin persona';
    return response.personas
      .map(p => `${p.persona.nombres} ${p.persona.apellidos}`)
      .join(', ');
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  onEditResponse(response: FormResponse): void {
    const dialogRef = this.dialog.open(FillFormModal, {
      width: '80vw',
      maxWidth: '95vw',
      disableClose: false,
      data: {
        formKey: this.formKey,
        mode: 'edit',
        id_respuesta: response.id_respuesta,
        existingResponses: response.datos_limpios  // ✅ las respuestas guardadas
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.formInfoService.invalidateInfoCache(this.formKey);
        this.loadResponses();
      }
    });
  }
}