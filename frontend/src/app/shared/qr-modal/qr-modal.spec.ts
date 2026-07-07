import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QrModal } from './qr-modal';

describe('QrModal', () => {
  let component: QrModal;
  let fixture: ComponentFixture<QrModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QrModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
