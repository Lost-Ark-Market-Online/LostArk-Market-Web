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
  constructor(
    private firestore: Firestore,
    private breakpointObserver: BreakpointObserver,
    public dialog: MatDialog,
    private _snackBar: MatSnackBar
  ) {
  }

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
