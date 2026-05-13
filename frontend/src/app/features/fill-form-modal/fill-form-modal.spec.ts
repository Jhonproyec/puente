import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FillFormModal } from './fill-form-modal';

describe('FillFormModal', () => {
  let component: FillFormModal;
  let fixture: ComponentFixture<FillFormModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FillFormModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FillFormModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
