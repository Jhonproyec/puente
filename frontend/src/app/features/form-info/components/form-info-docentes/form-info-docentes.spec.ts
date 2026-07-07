import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormInfoDocentes } from './form-info-docentes';

describe('FormInfoDocentes', () => {
  let component: FormInfoDocentes;
  let fixture: ComponentFixture<FormInfoDocentes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormInfoDocentes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormInfoDocentes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
