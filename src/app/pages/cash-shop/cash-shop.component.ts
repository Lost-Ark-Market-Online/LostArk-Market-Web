import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { filter, map, Observable, shareReplay, startWith, Subscription, take } from 'rxjs';
import { ApiService, MarketLiveItem } from 'src/services/api';
import { CommonService } from 'src/services/common';
import slugify from 'slugify'

import cashshopdata from '../../../data/cashshop.json';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Filter } from 'src/interfaces/common';

export interface Category {
  id: string;
  name: string
  subcategories?: Category[];
  open: boolean;
}

export interface CashShopItem {
  marketId?: string;
  cashShopId: string;
  name: string;
  amount: number;
  blueCrystals: number;
  goldPrice?: number;
  discount?: number;
  marketGoldPrice?: number;
  category: string;
  rarity: number;
  image: string;
  class?: string;
  contains?: {
    name: string;
    id: string;
    amount: number;
  }[]
}

@Component({
  selector: 'app-cash-shop',
  templateUrl: './cash-shop.component.html',
  styleUrls: ['./cash-shop.component.css']
})
export class CashShopComponent implements OnInit {
  shopItems: CashShopItem[] = [];
  regionSubscription: Subscription;
  marketData?: { [itemId: string]: MarketLiveItem };
  searchControl = new FormControl();
  filteredOptions?: Observable<string[]>;
  options: string[];
  favorites: string[];
  categoriesMap: { [categoryId: string]: { id: string; name: string; subcategories: { [subcategoryId: string]: { id: string; name: string; } } } };
  categories: Category[];
  routeSubscription: Subscription;
  filter: Filter;

  isHandset$: Observable<boolean> = this.breakpointObserver.observe([Breakpoints.Large, Breakpoints.XLarge])
    .pipe(
      map(result => !result.matches),
      shareReplay()
    );

  constructor(
    private breakpointObserver: BreakpointObserver,
    public common: CommonService,
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.favorites = JSON.parse(localStorage.getItem('cashShopFavorites') || 'null') || [];
    this.filter = {
      favorites: true
    };
    this.options = [...new Set(cashshopdata.map(a => a.name))];

    this.categoriesMap = [...new Set(cashshopdata.map(a => a.subcategory ? `${a.category}-${a.subcategory}` : a.category))].reduce((acc, item) => {
      const [category, subcategory] = item.split('-');
      const categorySlug = slugify(category, { lower: true });
      const subCategorySlug = subcategory ? slugify(subcategory, { lower: true }) : undefined;
      if (!acc[categorySlug]) {
        acc[categorySlug] = {
          id: categorySlug,
          name: category
        }
      }
      if (subcategory) {
        if (!acc[categorySlug].subcategories) {
          acc[categorySlug].subcategories = {
            [subCategorySlug!]: {
              id: subCategorySlug,
              name: subcategory
            }
          };
        } else {
          acc[categorySlug].subcategories[subCategorySlug] = {
            id: subCategorySlug,
            name: subcategory
          };
        }
      }
      return acc;
    }, {});

    this.categories = Object.values([...new Set(cashshopdata.map(a => a.subcategory ? `${a.category}-${a.subcategory}` : a.category))].reduce((acc, item) => {
      const [category, subcategory] = item.split('-');
      const categorySlug = slugify(category, { lower: true });
      const subCategorySlug = subcategory ? slugify(subcategory, { lower: true }) : undefined;
      if (!acc[categorySlug]) {
        acc[categorySlug] = {
          id: categorySlug,
          name: category,
          open: false
        }
      }
      if (subcategory) {
        if (!acc[categorySlug].subcategories) {
          acc[categorySlug].subcategories = [{
            id: subCategorySlug,
            name: subcategory
          }];
        } else {
          acc[categorySlug].subcategories.push({
            id: subCategorySlug,
            name: subcategory
          });
        }
      }
      return acc;
    }, []));


    this.filteredOptions = this.searchControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value)),
    );


    this.routeSubscription = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => route),
      map(route => {
        while (route.firstChild) {
          route = route.firstChild;
        }
        return route;
      })).subscribe(route => {
        const { search } = route.snapshot.queryParams;
        if (search) {
          this.searchControl.setValue(search);
          this.filter.category = undefined;
          this.filter.subcategory = undefined;
          this.filter.favorites = false;
          this.filter.search = search;
        } else {
          this.searchControl.reset();
          this.filter.search = undefined;
          const { region, category, subcategory } = route.snapshot.params;
          if (category) {
            if (category == 'favorites') {
              this.filter.favorites = true;
              this.filter.category = undefined;
              this.filter.subcategory = undefined;
            } else {
              this.filter.favorites = false;
              this.filter.category = this.categoriesMap[category].name;
              const catIndex = this.categories.findIndex(c => c.id == category);
              if (catIndex >= 0) {
                this.categories[catIndex].open = true;
              }
              if (subcategory) {
                this.filter.subcategory = this.categoriesMap[category].subcategories[subcategory].name;
              } else {
                this.filter.subcategory = undefined;
              }
            }
          } else {
            this.filter.favorites = true;
            this.filter.category = undefined;
            this.filter.subcategory = undefined;
          }
        }
        this.filterItems();
      });

    this.regionSubscription = this.common.region$.pipe(startWith(this.common.region)).subscribe(region => {
      this.api.getLiveData({categories: "Currency Exchange,Enhancement Material,Combat Supplies"}).pipe(take(1)).subscribe((data) => {
        this.marketData = data.reduce<{ [itemId: string]: MarketLiveItem }>((acc, item) => {
          acc[item.id] = item;
          return acc;
        }, {});
        this.setPrices();
      });
    });
  }

  setPrices() {
    if (this.marketData) {
      const blueCrystalPrice = this.marketData['blue-crystal-0'].lowPrice;
      for (const shopItemIndex in this.shopItems) {
        if (Object.prototype.hasOwnProperty.call(this.shopItems, shopItemIndex)) {
          const shopItem = this.shopItems[shopItemIndex];
          this.shopItems[shopItemIndex].goldPrice = Math.round(shopItem.blueCrystals * blueCrystalPrice);
          if (shopItem.marketId) {
            const marketItem = this.marketData[shopItem.marketId];
            if (marketItem) {
              this.shopItems[shopItemIndex].marketGoldPrice = Math.round(marketItem.lowPrice / marketItem.amount * shopItem.amount);
              if (this.shopItems[shopItemIndex].marketGoldPrice! > this.shopItems[shopItemIndex].goldPrice!) {
                this.shopItems[shopItemIndex].discount = Math.round((this.shopItems[shopItemIndex].goldPrice! - this.shopItems[shopItemIndex].marketGoldPrice!) / this.shopItems[shopItemIndex].marketGoldPrice! * 100)
              }
            }
          }
        }
      }
    }
  }

  search() {
    const search = this.searchControl.value;
    this.router.navigate([this.common.regionSlug, 'cash-shop'], {
      queryParams: {
        search
      }
    });
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    if (this.regionSubscription) {
      this.regionSubscription.unsubscribe();
    }
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  filterItems() {
    this.shopItems = cashshopdata.filter(item => {
      if (this.filter.search) {
        return item.name.toLowerCase().indexOf(this.filter.search.toLowerCase()) >= 0
      }
      if (this.filter.favorites) {
        return this.favorites.indexOf(item.cashShopId) >= 0;
      }
      if (this.filter.subcategory) {
        return item.category == this.filter.category && item.subcategory == this.filter.subcategory;
      } else {
        return item.category == this.filter.category;
      }
    }).sort((a, b) => a.name > b.name ? 1 : -1);
    this.setPrices();
  }

  private _filter(value: string): string[] {
    if (!value || value.length < 3) {
      return [];
    }
    const filterValue = value.toLowerCase();
    return this.options.filter(option => option.toLowerCase().includes(filterValue));
  }

  toggleFavorite(itemId: string) {
    if (!this.favorites) {
      return;
    }
    const favIndex = this.favorites.findIndex(i => i == itemId);
    if (favIndex >= 0) {
      this.favorites.splice(favIndex, 1);
    } else {
      this.favorites.push(itemId);
    }
    localStorage.setItem('cashShopFavorites', JSON.stringify(this.favorites));
  }

  isFavorite(itemId: string) {
    if (!this.favorites) {
      return false;
    }
    return this.favorites.findIndex(i => i == itemId) >= 0;
  }

}
