import { Injectable } from "@angular/core";
import { ActivatedRoute, NavigationEnd, Router } from "@angular/router";
import { ConnectableObservable, filter, map, Observable, Subject } from "rxjs";
import slugify from "slugify";

export const regionMap: { [slug: string]: string } = {
  'north-america-east': 'North America East',
  'north-america-west': 'North America West',
  'europe-central': 'Europe Central',
  'europe-west': 'Europe West',
  'south-america': 'South America',
}

@Injectable({
  providedIn: 'root',
})
export class CommonService {
  region$ = new Subject<string>();
  region = "";
  regionSlug = "";
  activatedRoute: ActivatedRoute;
  marketFavorites: string[] = [];
  cashShopFavorites: string[] = [];
  craftingFavorites: string[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.localStorageCheck();
    this.region$.subscribe(region => {
      this.region = region
      this.regionSlug = region ? slugify(region, { lower: true }) : "";
    });
    this.region$.next(localStorage.getItem('region') || 'North America East');
    this.activatedRoute = this.route;
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => route),
      map(route => {
        while (route.firstChild) {
          route = route.firstChild;
        }
        return route;
      })).subscribe(route => {
        this.activatedRoute = route;
        const { region } = route.snapshot.params;
        if (region == 'default' && this.region) {
          return this.updateRegion(this.region, true);
        }
        if (this.region != regionMap[region]) {
          return this.updateRegion(regionMap[region], true);
        }
      });
  }

  getImageUrl(filename: string) {
    return `/assets/item_icons/${filename}`;
  }

  updateRegion(region: string, navigate: boolean = false) {
    console.log('updateRegion', region, navigate)
    if (!region) {
      region = 'North America East'
    }
    this.region$.next(region);
    localStorage.setItem('region', region);
    if (navigate) {
      const url = this.activatedRoute.snapshot.url;
      url[0].path = '/' + this.regionSlug;
      this.router.navigate([...url.map(x => x.path)]);
    }
  }

  localStorageCheck() {
    const version: number = JSON.parse(localStorage.getItem('version') || 'null') || 0;
    if (version < 2) {
      //Remove old storage
      localStorage.clear();
      //Update version
      localStorage.setItem('version', '2');
      //Set marketFavorites
      localStorage.setItem('marketFavorites', JSON.stringify([]));
      localStorage.setItem('cashShopFavorites', JSON.stringify([]));
      localStorage.setItem('craftingFavorites', JSON.stringify([]));
    }
    this.marketFavorites = JSON.parse(localStorage.getItem('marketFavorites') || 'null') || [];
    this.cashShopFavorites = JSON.parse(localStorage.getItem('cashShopFavorites') || 'null') || [];
    this.craftingFavorites = JSON.parse(localStorage.getItem('craftingFavorites') || 'null') || [];
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
    localStorage.setItem('marketFavorites', JSON.stringify(this.marketFavorites));
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
    localStorage.setItem('cashShopFavorites', JSON.stringify(this.cashShopFavorites));
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
    localStorage.setItem('craftingFavorites', JSON.stringify(this.craftingFavorites));
  }

  isCraftingFavorite(itemId: string) {
    if (!this.craftingFavorites) {
      return false;
    }
    return this.craftingFavorites.indexOf(itemId) >= 0;
  }

}