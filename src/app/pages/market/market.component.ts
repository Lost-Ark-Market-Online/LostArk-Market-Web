import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild, ɵɵsetComponentScope } from '@angular/core';
import { FormControl } from '@angular/forms';
import { filter, map, Observable, shareReplay, startWith, Subscription, take } from 'rxjs';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ItemsTableComponent } from './items-table/items-table.component';
import { Analytics, logEvent } from '@angular/fire/analytics';
import slugify from 'slugify';

import type { FavoriteItem } from './items-table/items-table.interfaces';

import autocompleteOptions from '../../../data/market_autocomplete.json';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { CommonService, regionMap } from 'src/services/common';
import { Filter } from 'src/interfaces/common';

const categoriesMap: { [slug: string]: { category: string, subcategories?: { [subslug: string]: string } } } = {
  'enhancement-material': {
    category: 'Enhancement Material',
    subcategories: {
      'honing-materials': 'Honing Materials',
      'additional-honing-materials': 'Additional Honing Materials',
      'weapon-evolution-materials': 'Weapon Evolution Materials',
      'other-materials': 'Other Materials',
    }
  },
  'trader': {
    category: 'Trader',
    subcategories: {
      'foraging-rewards': 'Foraging Rewards',
      'loggin-loot': 'Logging Loot',
      'mining-loot': 'Mining Loot',
      'hunting-loot': 'Hunting Loot',
      'fishing-loot': 'Fishing Loot',
      'excavating-loot': 'Excavating Loot',
      'other': 'Other',
    }
  },
  'engraving-recipe': {
    category: 'Engraving Recipe'
  },
  'combat-supplies': {
    category: 'Combat Supplies',
    subcategories: {
      'recovery': 'Battle Item - Recovery',
      'offense': 'Battle Item - Offense',
      'utility': 'Battle Item - Utility',
      'buff': 'Battle Item - Buff',
    }
  },
  'adventurers-tome': {
    category: 'Adventurer\'s Tome'
  },
  'cooking': {
    category: 'Cooking'
  },
  'gem-chest': {
    category: 'Gem Chest'
  },
  'mount': {
    category: 'Mount',
    subcategories: {
      'mount': 'Mount',
      'mount-chest': 'Mount Chest',
    },
  },
  'pets': {
    category: 'Pets',
    subcategories: {
      'pets': 'Pets',
      'pet-chest': 'Pet Chest',
    }
  },
  'sailing': {
    category: 'Sailing'
  },
  'currency-exchange': {
    category: 'Currency Exchange'
  },
}

@Component({
  selector: 'app-market',
  templateUrl: './market.component.html',
  styleUrls: ['./market.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarketComponent implements OnDestroy, AfterViewInit {
  searchControl = new FormControl();
  options: string[] = autocompleteOptions;
  filteredOptions?: Observable<string[]>;
  filter: Filter;
  routeSubscription: Subscription;
  isHandset$: Observable<boolean> = this.breakpointObserver.observe([Breakpoints.Large, Breakpoints.XLarge])
    .pipe(
      map(result => !result.matches),
      shareReplay()
    );

  menu = {
    enhancementMaterialsSubMenu: false,
    traderSubMenu: false,
    combatSubMenu: false,
    engravingSubMenu: false,
    adventurersTomeSubMenu: false,
    cookingSubMenu: false,
    sailingSubMenu: false,
    petsSubMenu: false,
    mountSubMenu: false,
    gemChestSubMenu: false,
  }

  @ViewChild(ItemsTableComponent) marketTable!: ItemsTableComponent;

  constructor(
    private breakpointObserver: BreakpointObserver,
    private analytics: Analytics,
    private router: Router,
    private route: ActivatedRoute,
    public common: CommonService
  ) {
    this.filter = {
      favorites: true
    };
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
          this.filter.search = undefined;
          const { region, category, subcategory } = route.snapshot.params;
          if (category) {
            if (category == 'favorites') {
              this.filter.favorites = true;
              this.filter.category = undefined;
              this.filter.subcategory = undefined;
            } else {
              this.filter.favorites = false;
              this.filter.category = categoriesMap[category].category;
              if (subcategory) {
                this.filter.subcategory = categoriesMap[category].subcategories![subcategory];
              } else {
                this.filter.subcategory = undefined;
              }
            }
          } else {
            if (this.common.marketFavorites.length > 0) {
              this.router.navigate([this.common.regionSlug, 'market', 'favorites'])
            } else {
              this.router.navigate([this.common.regionSlug, 'market', 'enhancement-material'])
            }
          }
        }

        switch (this.filter.category) {
          case 'Enhancement Material':
            this.menu.enhancementMaterialsSubMenu = true;
            break;
          case 'Trader':
            this.menu.traderSubMenu = true;
            break;
          case 'Engraving Recipe':
            this.menu.engravingSubMenu = true;
            break;
          case 'Combat Supplies':
            this.menu.combatSubMenu = true;
            break;
          case 'Adventurer\'s Tome':
            this.menu.adventurersTomeSubMenu = true;
            break;
          case 'Cooking':
            this.menu.cookingSubMenu = true;
            break;
          case 'Sailing':
            this.menu.sailingSubMenu = true;
            break;
          case 'Pets':
            this.menu.petsSubMenu = true;
            break;
          case 'Mount':
            this.menu.mountSubMenu = true;
            break;
          case 'Gem Chest':
            this.menu.gemChestSubMenu = true;
            break;
        }
        if (this.marketTable?.dataSource) {
          this.marketTable.dataSource.refreshMarket();
        }
      });
  }

  ngAfterViewInit(): void {
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }


  resetSubMenus() {
    this.menu = {
      enhancementMaterialsSubMenu: false,
      traderSubMenu: false,
      combatSubMenu: false,
      engravingSubMenu: false,
      adventurersTomeSubMenu: false,
      cookingSubMenu: false,
      sailingSubMenu: false,
      petsSubMenu: false,
      mountSubMenu: false,
      gemChestSubMenu: false,
    }
  }
  clearSearch(){
    this.searchControl.reset();
    this.search();
  }
  search() {
    const search = this.searchControl.value;
    if (search) {
      logEvent(this.analytics, 'search', { query: search });
      this.router.navigate([this.common.regionSlug, 'market'], {
        queryParams: {
          search
        }
      });
    } else {
      if (this.common.marketFavorites.length > 0) {
        this.router.navigate([this.common.regionSlug, 'market', 'favorites'])
      } else {
        this.router.navigate([this.common.regionSlug, 'market', 'enhancement-material'])
      }
    }
  }

  private _filter(value: string): string[] {
    if (!value || value.length < 3) {
      return [];
    }
    const filterValue = value.toLowerCase();
    return this.options.filter(option => option.toLowerCase().includes(filterValue));
  }

}
