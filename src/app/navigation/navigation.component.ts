import { Component, ViewChild } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { MenuCloseReason } from '@angular/material/menu/menu';
import { ItemsTableComponent } from '../items-table/items-table.component';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent {
  enhancementMaterialsSubMenu = false;
  traderSubMenu = false;
  filter: {
    region: string,
    category?: string,
    subCategory?: string
  } = {
      region: 'East North America',
      category: undefined,
      subCategory: undefined
    }

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  @ViewChild(ItemsTableComponent) marketTable!: ItemsTableComponent;
  constructor(private breakpointObserver: BreakpointObserver) { }

  selectRegion(region: string) {
    console.log('selectRegion', region);
    if (this.filter.region !== region) {
      this.filter.region = region;
      this.refreshMarket();
    }
  }

  selectFilter(category: string | undefined, subCategory: string | undefined) {
    if (this.filter.category != category) {
      this.filter.category = category;
    }

    if (this.filter.subCategory != subCategory) {
      this.filter.subCategory = subCategory;
    }
    this.refreshMarket();

  }

  test(event: any) {
    console.log(event)
  }

  refreshMarket() {
    this.marketTable.dataSource.updateFilter(this.filter.region, this.filter.category, this.filter.subCategory);
  }

}
