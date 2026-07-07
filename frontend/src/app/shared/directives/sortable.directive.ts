import { Directive, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import Sortable, { SortableEvent } from 'sortablejs';

export interface SortableDropEvent {
  fromContainerId: string;
  toContainerId: string;
  oldIndex: number;
  newIndex: number;
  itemId: string;
}

@Directive({
  selector: '[appSortableDirective]',
  standalone: true,
})
export class SortableDirective implements OnInit, OnDestroy {
  @Input() sortableId = '';
  @Input() sortableGroup = 'form-builder';
  @Input() sortableDisabled = false;
  @Input() sortableGroupPut: string | string[] | boolean = true;
  @Input() sortableGroupPull: string | boolean = true;
  @Input() sortableClone = false;

  // 👇 NUEVO: filtro opcional para decidir si un ítem puede soltarse en ESTE contenedor
  @Input() sortablePutFilter?: (dragEl: HTMLElement, toContainerId: string, fromContainerId: string) => boolean;

  @Output() sortableDrop = new EventEmitter<SortableDropEvent>();

  private sortable: Sortable | null = null;

  constructor(private el: ElementRef<HTMLElement>) { }

  ngOnInit(): void {
    this.sortable = Sortable.create(this.el.nativeElement, {
      group: {
        name: this.sortableGroup,
        pull: this.sortableClone ? 'clone' : (this.sortableGroupPull as any),
        put: (to, from, dragEl) => {
          // Si el contenedor destino tiene un filtro propio, se respeta primero
          if (this.sortablePutFilter) {
            const toId = to.el.getAttribute('data-sortable-id') || '';
            const fromId = from.el.getAttribute('data-sortable-id') || '';
            return this.sortablePutFilter(dragEl, toId, fromId);
          }
          return this.sortableGroupPut as any;
        },
      },

      animation: 150,
      handle: '.drag-handle',
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      disabled: this.sortableDisabled,
      // SortableDirective — dentro de Sortable.create(...)
      onEnd: (event: SortableEvent) => {
        const fromId = (event.from as HTMLElement).getAttribute('data-sortable-id') || '';
        const toId = (event.to as HTMLElement).getAttribute('data-sortable-id') || '';
        const itemId = (event.item as HTMLElement).getAttribute('data-item-id') || '';
        if (event.oldIndex === undefined || event.newIndex === undefined) return;

        // 👇 Revertir el movimiento físico del DOM que hizo Sortable.
        // Angular re-renderizará según el modelo actualizado — es la única fuente de verdad.
        const { item, from, oldIndex } = event;
        if (item.parentNode) {
          item.parentNode.removeChild(item);
        }
        const referenceNode = from.children[oldIndex] ?? null;
        from.insertBefore(item, referenceNode);

        this.sortableDrop.emit({
          fromContainerId: fromId,
          toContainerId: toId,
          oldIndex: event.oldIndex,
          newIndex: event.newIndex,
          itemId,
        });
      },
    });
  }

  ngOnDestroy(): void {
    this.sortable?.destroy();
  }
}