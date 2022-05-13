import { Injectable } from "@angular/core";
import { ActivatedRoute, NavigationEnd, Router } from "@angular/router";
import { filter, map, Observable, Subject } from "rxjs";
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

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.region$.subscribe(region => {
      this.region = region
      this.regionSlug = slugify(region, { lower: true });
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
        if (this.region != regionMap[region]) {
          this.updateRegion(regionMap[region], true);
        }
      });
  }

  getImageUrl(filename: string) {
    return `/assets/item_icons/${filename}`;
  }

  updateRegion(region: string, navigate: boolean = false) {
    this.region$.next(region);
    localStorage.setItem('region', region);
    if (navigate) {
      const url = this.activatedRoute.snapshot.url;
      url[0].path = '/' + this.regionSlug;
      this.router.navigate([...url.map(x => x.path)]);
    }
  }

}