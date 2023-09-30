import { Injectable } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map, Subject } from 'rxjs';
import slugify from 'slugify';

export const regionMap: { [slug: string]: string } = {
  'north-america-east': 'North America East',
  'north-america-west': 'North America West',
  'europe-central': 'Europe Central',
  'south-america': 'South America',
};

@Injectable({
  providedIn: 'root',
})
export class CommonService {
  region$ = new Subject<string>();
  region = '';
  regionSlug = '';
  activatedRoute: ActivatedRoute;
  marketFavorites: string[] = [];
  cashShopFavorites: string[] = [];
  craftingFavorites: string[] = [];
  jumpstart = false;
  jumpstartSlug = '';
  jumpstart$ = new Subject<boolean>();
  jumpstartSlug$ = new Subject<string>();

  constructor(private router: Router, private route: ActivatedRoute) {
    this.localStorageCheck();
    this.region$.subscribe((region) => {
      this.region = region;
      this.regionSlug = region ? slugify(region, { lower: true }) : '';
    });
    this.region$.next(localStorage.getItem('region') || 'North America East');
    this.activatedRoute = this.route;
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        map(() => route),
        map((route) => {
          while (route.firstChild) {
            route = route.firstChild;
          }
          return route;
        })
      )
      .subscribe((route) => {
        this.activatedRoute = route;
        console.log('Route params', route.snapshot.params);
        let { region, jumpstart } = route.snapshot.params;
        if (region == 'default') {
          region = 'north-america-east';
        }
        switch (jumpstart) {
          case 'default':
          case 'regular':
            jumpstart = false;
            break;
          case 'jumpstart':
            jumpstart = true;
        }
        region = regionMap[region];
        if (this.region != region || this.jumpstart != jumpstart) {
          console.log('Route Pipe', region, jumpstart)
          return this.updateRegion(region, jumpstart, true);
        }
      });
  }

  getImageUrl(filename: string) {
    return `/assets/item_icons/${filename}`;
  }

  updateRegion(region: string, jumpstart: boolean, navigate: boolean = false) {
    console.log('Update Region', region, jumpstart, navigate)
    this.region$.next(region);
    localStorage.setItem('region', region);
    this.jumpstart = jumpstart;
    this.jumpstartSlug = jumpstart ? 'jumpstart' : 'regular';
    this.jumpstart$.next(jumpstart);
    this.jumpstartSlug$.next(this.jumpstartSlug);
    if (navigate) {
      const url = this.activatedRoute.snapshot.url;
      console.log('Navigate to:', url);
      if (url.length > 0) {
        url[0].path = '/' + this.regionSlug;
        url[1].path = this.jumpstartSlug;
        this.router.navigate([...url.map((x) => x.path)]);
      }
    }
  }

  localStorageCheck() {
    const keys = ['marketFavorites', 'cashShopFavorites', 'craftingFavorites'];
    const version: number =
      JSON.parse(localStorage.getItem('version') || 'null') || 0;

    // Base structure check 2.0
    if (version < 2) {
      //Remove old storage
      localStorage.clear();
      //Update version
      localStorage.setItem('version', '2');
      //Set marketFavorites
      keys.forEach((key) => {
        localStorage.setItem(key, JSON.stringify([]));
      });
    }

    // Load local storage data
    this.marketFavorites =
      JSON.parse(localStorage.getItem('marketFavorites') || 'null') || [];
    this.cashShopFavorites =
      JSON.parse(localStorage.getItem('cashShopFavorites') || 'null') || [];
    this.craftingFavorites =
      JSON.parse(localStorage.getItem('craftingFavorites') || 'null') || [];

    // 2.1 Migration
    if (version < 2.1) {
      const migration = {
        "guardian-stone-crystal-0": "crystallized-guardian-stone-0",
        "destruction-stone-crystal-0": "crystallized-destruction-stone-0",
        "hunting-crystal-3": "crystallized-hunting-bauble-3",
        "fishing-crystal-3": "crystallized-fishing-bauble-3",
        "excavating-crystal-3": "crystallized-excavating-bauble-3"
      };
      this.marketFavorites = this.marketFavorites.map(itemId => {
        return migration[itemId] || itemId;
      });
      //Update version
      localStorage.setItem('version', '2.1');
    }

    // Todo: fix defaults
    // First change the autocomplete source from local to API
  }

  toggleMarketFavorite(itemId: string) {
    if (!this.marketFavorites) {
      return;
    }
    const favIndex = this.marketFavorites.indexOf(itemId);
    if (favIndex >= 0) {
      this.marketFavorites.splice(favIndex, 1);
    } else {
      this.marketFavorites.push(itemId);
    }
    localStorage.setItem(
      'marketFavorites',
      JSON.stringify(this.marketFavorites)
    );
  }

  isMarketFavorite(itemId: string) {
    if (!this.marketFavorites) {
      return false;
    }
    return this.marketFavorites.indexOf(itemId) >= 0;
  }

  toggleCashShopFavorite(itemId: string) {
    if (!this.cashShopFavorites) {
      return;
    }
    const favIndex = this.cashShopFavorites.indexOf(itemId);
    if (favIndex >= 0) {
      this.cashShopFavorites.splice(favIndex, 1);
    } else {
      this.cashShopFavorites.push(itemId);
    }
    localStorage.setItem(
      'cashShopFavorites',
      JSON.stringify(this.cashShopFavorites)
    );
  }

  isCashShopFavorite(itemId: string) {
    if (!this.cashShopFavorites) {
      return false;
    }
    return this.cashShopFavorites.indexOf(itemId) >= 0;
  }

  toggleCraftingFavorite(itemId: string) {
    if (!this.craftingFavorites) {
      return;
    }
    const favIndex = this.craftingFavorites.indexOf(itemId);
    if (favIndex >= 0) {
      this.craftingFavorites.splice(favIndex, 1);
    } else {
      this.craftingFavorites.push(itemId);
    }
    localStorage.setItem(
      'craftingFavorites',
      JSON.stringify(this.craftingFavorites)
    );
  }

  isCraftingFavorite(itemId: string) {
    if (!this.craftingFavorites) {
      return false;
    }
    return this.craftingFavorites.indexOf(itemId) >= 0;
  }
}
