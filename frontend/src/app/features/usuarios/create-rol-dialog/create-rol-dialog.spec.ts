import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateRolDialog } from './create-rol-dialog';

describe('CreateRolDialog', () => {
  let component: CreateRolDialog;
  let fixture: ComponentFixture<CreateRolDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateRolDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateRolDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
