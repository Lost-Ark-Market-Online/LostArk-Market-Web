import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CashShopComponent } from './cash-shop.component';

describe('CashShopComponent', () => {
  let component: CashShopComponent;
  let fixture: ComponentFixture<CashShopComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CashShopComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CashShopComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
