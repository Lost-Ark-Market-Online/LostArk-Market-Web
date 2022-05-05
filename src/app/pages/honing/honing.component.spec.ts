import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HoningComponent } from './honing.component';

describe('HoningComponent', () => {
  let component: HoningComponent;
  let fixture: ComponentFixture<HoningComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HoningComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HoningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
