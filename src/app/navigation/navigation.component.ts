import { Component, OnInit, ViewChild } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable, first, startWith } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import slugify from 'slugify';
import { ItemsTableComponent } from '../items-table/items-table.component';
import { getAuth } from "@angular/fire/auth";
import { MatDialog } from '@angular/material/dialog';
import { ApplicationFormComponent } from '../components/application-form/application-form.component';
import { createUserWithEmailAndPassword } from '@firebase/auth';
import { Firestore, setDoc, doc } from '@angular/fire/firestore';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FavoriteItem } from '../items-table/market-datasource';
import { FormControl } from '@angular/forms';


import packageJson from '../../../package.json';
import autocompleteOptions from '../../data/autocomplete.json';
import { Analytics, logEvent } from '@angular/fire/analytics';

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
  '#adventurer-s-tome': { category: 'Adventurer\'s Tome', subcategory: undefined },
  '#favorites': { category: undefined, subcategory: undefined, favorites: true },
};

export interface Filter {
  region: string,
  category?: string,
  subcategory?: string
  favorites: boolean,
  search?: string
}

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent implements OnInit {
  enhancementMaterialsSubMenu = false;
  traderSubMenu = false;
  combatSubMenu = false;
  engravingSubMenu = false;
  adventurersTomeSubMenu = false;

  favorites: FavoriteItem[]
  version: string = packageJson.version;


  myControl = new FormControl();
  options: string[] = autocompleteOptions;
  filteredOptions?: Observable<string[]>;

  filter: Filter = {
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
    private _snackBar: MatSnackBar,
    private analytics: Analytics
  ) {
    this.favorites = JSON.parse(localStorage.getItem('favorites') || 'null') || [];
  }

  ngOnInit(): void {
    this.filteredOptions = this.myControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value)),
    );
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
    const search = url.searchParams.get('search');
    if (search) {
      this.myControl.setValue(search);
      if (url.hash) {
        window.history.pushState(null, this.filter.region, slugify(this.filter.region).toLowerCase() + `?search=${encodeURIComponent(search)}`);
      }
      this.filter.category = undefined;
      this.filter.subcategory = undefined;
      this.filter.favorites = false;
      this.filter.search = search;
    } else {
      if (url.hash) {
        this.filter.category = filterMap[url.hash].category;
        this.filter.subcategory = filterMap[url.hash].subcategory;
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
            case 'Adventurer\'s Tome':
              this.adventurersTomeSubMenu = true;
              break;
        }
      }
    }
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    if (!value || value.length < 3) {
      return [];
    }

    return this.options.filter(option => option.toLowerCase().includes(filterValue));
  }

  selectRegion(region: string) {
    if (this.filter.region !== region) {
      const url = new URL(document.location.href);
      window.history.pushState(null, region, slugify(region).toLowerCase() + url.hash);
      this.filter.region = region;
      this.marketTable.dataSource.refreshMarket();
    }
  }

  selectFilter(hash: string, category?: string, subcategory?: string, favorites: boolean = false) {
    logEvent(this.analytics, 'select_filter', { hash, category, subcategory, favorites });
    if (this.filter) {
      window.history.pushState(null, this.filter.region, slugify(this.filter.region).toLowerCase() + hash);
      this.filter.category = category;
      this.filter.subcategory = subcategory;
      this.filter.favorites = favorites;
      this.filter.search = undefined;
      this.myControl.setValue('');
      this.marketTable.dataSource.refreshMarket();
      if (favorites) {
        this.enhancementMaterialsSubMenu = false;
        this.traderSubMenu = false;
        this.combatSubMenu = false;
        this.engravingSubMenu = false;
      }
    }
  }

  refreshMarket() {
    this.marketTable.dataSource.updateFilter(this.filter.region, this.filter.category, this.filter.subcategory, this.filter.favorites);
  }

  openApplyDialog() {
    logEvent(this.analytics, 'application_open_dialog');
    this.dialog.open(ApplicationFormComponent, {
      width: '80%',
      maxWidth: '460px',
      data: { email: '', password: '' }
    }).afterClosed().pipe(first()).subscribe(result => {
      if (result) {
        const auth = getAuth();
        createUserWithEmailAndPassword(auth, result.email, result.password)
          .then(async (userCredential) => {
            const user = userCredential.user;
            await setDoc(doc(this.firestore, 'applications', user.uid), { region: result.region, email: result.email, uid: user.uid, createdAt: new Date() });
            logEvent(this.analytics, 'application_sent');
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

  search() {
    const search = this.myControl.value;
    if (search) {
      logEvent(this.analytics, 'search', { query: search });
      window.history.pushState(null, this.filter.region, slugify(this.filter.region).toLowerCase() + `?search=${encodeURIComponent(search)}`);
    } else {
      window.history.pushState(null, this.filter.region, slugify(this.filter.region).toLowerCase());
    }
    this.filter.category = undefined;
    this.filter.subcategory = undefined;
    this.filter.favorites = false;
    this.filter.search = search;
    this.enhancementMaterialsSubMenu = false;
    this.traderSubMenu = false;
    this.combatSubMenu = false;
    this.engravingSubMenu = false;
    this.marketTable.dataSource.refreshMarket();
  }
}
