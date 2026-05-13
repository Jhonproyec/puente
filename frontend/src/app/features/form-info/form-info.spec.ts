import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormInfo } from './form-info';

describe('FormInfo', () => {
  let component: FormInfo;
  let fixture: ComponentFixture<FormInfo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormInfo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormInfo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
