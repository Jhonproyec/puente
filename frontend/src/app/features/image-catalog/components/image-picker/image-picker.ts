import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FileSizePipe } from '../../../../core/pipes/file-size-pipe';
import { CatalogImage } from '../../image-catalog';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { ImageCatalogsService } from '../../../../core/services/image-catalogs.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-image-picker',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    // FileSizePipe,
  ],
  templateUrl: './image-picker.html',
  styleUrl: './image-picker.css'
})
export class ImagePicker implements OnInit {
  @Input() mode: 'admin' | 'select' = 'admin';

  // ── Outputs ───────────────────────────────────────────────────────
  @Output() imageSelected = new EventEmitter<CatalogImage>();   // modo select
  @Output() editRequested = new EventEmitter<CatalogImage>();   // modo admin
  @Output() deleteRequested = new EventEmitter<CatalogImage>();  // modo admin
  @Output() viewRequested = new EventEmitter<CatalogImage>();   // ambos modos

  images: CatalogImage[] = [];
  isLoading = false;

  searchTerm = '';
  searchSubject = new Subject<string>();

  selectedImages: Set<number> = new Set();

  // ── Paginación ────────────────────────────────────────────────────
  currentPage = 1;
  pageSize = 12;
  totalItems = 0;
  totalPages = 1;

  private destroyRef = inject(DestroyRef);

  constructor(
    private imageCatalogService: ImageCatalogsService,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadImages();
    });

    this.loadImages();
  }

  // ── Carga ─────────────────────────────────────────────────────────
  loadImages(): void {
    this.isLoading = true;
    this.imageCatalogService.getImages(this.currentPage, this.pageSize, this.searchTerm).subscribe({
      next: (response) => {
        this.images = response.data;
        this.totalItems = response.pagination.total;
        this.totalPages = response.pagination.totalPages;
        this.isLoading = false;
        this.selectedImages.clear();
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ── Búsqueda ──────────────────────────────────────────────────────
  onSearch(): void { this.searchSubject.next(this.searchTerm); }

  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadImages();
  }

  // ── Paginación ────────────────────────────────────────────────────
  onPageSizeChange(): void { this.currentPage = 1; this.loadImages(); }
  goToPage(page: number): void { this.currentPage = page; this.loadImages(); }
  nextPage(): void { if (this.currentPage < this.totalPages) { this.currentPage++; this.loadImages(); } }
  prevPage(): void { if (this.currentPage > 1) { this.currentPage--; this.loadImages(); } }

  get pageStart(): number { return this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1; }
  get pageEnd(): number { return Math.min(this.currentPage * this.pageSize, this.totalItems); }

  // ── Selección múltiple (admin) ────────────────────────────────────
  toggleSelect(id: number, event: Event): void {
    event.stopPropagation();
    this.selectedImages.has(id) ? this.selectedImages.delete(id) : this.selectedImages.add(id);
    this.cdr.markForCheck();
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.images.forEach(i => checked ? this.selectedImages.add(i.id_catalogo_imagen) : this.selectedImages.delete(i.id_catalogo_imagen));
    this.cdr.markForCheck();
  }

  isAllSelected(): boolean {
    return this.images.length > 0 && this.images.every(i => this.selectedImages.has(i.id_catalogo_imagen));
  }

  isSomeSelected(): boolean {
    return this.images.some(i => this.selectedImages.has(i.id_catalogo_imagen)) && !this.isAllSelected();
  }

  // ── Clicks en tarjeta ─────────────────────────────────────────────
  onCardClick(image: CatalogImage): void {
    if (this.mode === 'select') {
      this.imageSelected.emit(image);
      return;
    }
    this.viewRequested.emit(image);
  }

  onEdit(image: CatalogImage, event: Event): void {
    event.stopPropagation();
    this.editRequested.emit(image);
  }

  onDelete(image: CatalogImage, event: Event): void {
    event.stopPropagation();
    this.deleteRequested.emit(image);
  }



}
