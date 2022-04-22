import { Component, ViewChild } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable, first } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { ItemsTableComponent } from '../items-table/items-table.component';
import { getAuth } from "@angular/fire/auth";
import { MatDialog } from '@angular/material/dialog';
import { ApplicationFormComponent } from '../components/application-form/application-form.component';
import { createUserWithEmailAndPassword } from '@firebase/auth';
import { Firestore, setDoc, doc } from '@angular/fire/firestore';
import { MatSnackBar } from '@angular/material/snack-bar';
import slugify from 'slugify';
import { FavoriteItem } from '../items-table/market-datasource';
import packageJson from '../../../package.json';

const filterMap: { [hash: string]: { category?: string; subcategory?: string; favorites?: boolean } } = {
  '#enhancement-materials': { category: 'Enhancement Material', subcategory: undefined },
  '#honing-materials': { category: 'Enhancement Material', subcategory: 'Honing Materials' },
  '#additional-honing-materials': { category: 'Enhancement Material', subcategory: 'Additional Honing Materials' },
  '#other-enhancement-materials': { category: 'Enhancement Material', subcategory: 'Other Materials' },
  '#trader': { category: 'Trader', subcategory: undefined },
  '#foraging-rewards': { category: 'Trader', subcategory: 'Foraging Rewards' },
  '#loggin-loot': { category: 'Trader', subcategory: 'Logging Loot' },
  '#mining-loot': { category: 'Trader', subcategory: 'Mining Loot' },
  '#hunting-loot': { category: 'Trader', subcategory: 'Hunting Loot' },
  '#fishing-loot': { category: 'Trader', subcategory: 'Fishing Loot' },
  '#excavating-loot': { category: 'Trader', subcategory: 'Excavating Loot' },
  '#other-trading': { category: 'Trader', subcategory: 'Other' },
  '#engraving': { category: 'Engraving Recipe', subcategory: undefined },
  '#combat': { category: 'Combat Supplies', subcategory: undefined },
  '#recovery': { category: 'Combat Supplies', subcategory: 'Battle Item - Recovery' },
  '#offense': { category: 'Combat Supplies', subcategory: 'Battle Item - Offense' },
  '#utility': { category: 'Combat Supplies', subcategory: 'Battle Item - Utility' },
  '#buff': { category: 'Combat Supplies', subcategory: 'Battle Item - Buff' },
  '#favorites': { category: undefined, subcategory: undefined, favorites: true },
};

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent {
  enhancementMaterialsSubMenu = false;
  traderSubMenu = false;
  combatSubMenu = false;
  engravingSubMenu = false;

  favorites: FavoriteItem[]
  version: string = packageJson.version;

  filter: {
    region: string,
    category?: string,
    subCategory?: string
    favorites: boolean
  } = {
      region: 'North America East',
      favorites: true
    }

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );


  @ViewChild(ItemsTableComponent) marketTable!: ItemsTableComponent;
  constructor(
    private firestore: Firestore,
    private breakpointObserver: BreakpointObserver,
    public dialog: MatDialog,
    private _snackBar: MatSnackBar
  ) {
    const url = new URL(document.location.href);
    if (url.pathname != '/') {
      switch (url.pathname) {
        case '/east-north-america':
          this.filter.region = 'North America East';
          break;
        case '/west-north-america':
          this.filter.region = 'North America West';
          break;
        case '/europe-central':
          this.filter.region = 'Europe Central';
          break;
        case '/europe-west':
          this.filter.region = 'Europe West';
          break;
        case '/south-america':
          this.filter.region = 'South America';
          break;
      }
    } else {
      window.history.pushState(null, 'North America East', slugify('North America East').toLowerCase() + url.hash);
      this.filter.region = 'North America East';
    }
    if (url.hash) {
      this.filter.category = filterMap[url.hash].category;
      this.filter.subCategory = filterMap[url.hash].subcategory;
      this.filter.favorites = filterMap[url.hash].favorites || false;

      switch (this.filter.category) {
        case 'Enhancement Material':
          this.enhancementMaterialsSubMenu = true;
          break;
        case 'Trader':
          this.traderSubMenu = true;
          break;
        case 'Engraving Recipe':
          this.engravingSubMenu = true;
          break;
        case 'Combat Supplies':
          this.combatSubMenu = true;
          break;
      }
    }
    this.favorites = JSON.parse(localStorage.getItem('favorites') || 'null') || [];
  }

  selectRegion(region: string) {
    if (this.filter.region !== region) {
      const url = new URL(document.location.href);
      window.history.pushState(null, region, slugify(region).toLowerCase() + url.hash);
      this.filter.region = region;
      this.refreshMarket();
    }
  }

  selectFilter(hash: string, category?: string, subCategory?: string, favorites: boolean = false) {
    if (this.filter) {
      window.history.pushState(null, this.filter.region, slugify(this.filter.region).toLowerCase() + hash);
      this.filter.category = category;
      this.filter.subCategory = subCategory;
      this.filter.favorites = favorites;
      this.refreshMarket();
    }
  }

  refreshMarket() {
    this.marketTable.dataSource.updateFilter(this.filter.region, this.filter.category, this.filter.subCategory, this.filter.favorites);
  }

  login() {
    this.dialog.open(ApplicationFormComponent, {
      width: '80%',
      maxWidth: '460px',
      data: { email: '', password: '' }
    }).afterClosed().pipe(first()).subscribe(result => {
      if (result) {
        console.log(result)
        const auth = getAuth();
        createUserWithEmailAndPassword(auth, result.email, result.password)
          .then(async (userCredential) => {
            const user = userCredential.user;
            await setDoc(doc(this.firestore, 'applications', user.uid), { region: result.region, email: result.email, uid: user.uid });
            this._snackBar.open('Application sent', undefined,
              {
                horizontalPosition: 'center',
                verticalPosition: 'bottom',
                duration: 1500
              });
          })
          .catch((error) => {
            if (error.code == "auth/email-already-in-use") {
              this._snackBar.open('Application already sent', undefined,
                {
                  horizontalPosition: 'center',
                  verticalPosition: 'bottom',
                  duration: 1500
                });
            }
          });
      }
    });

  }
}
