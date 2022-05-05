import slugify from 'slugify';
import { filter, first, map, take } from 'rxjs';
import { Component, OnInit } from '@angular/core';
import { getAuth } from "@angular/fire/auth";
import { MatDialog } from '@angular/material/dialog';
import { ApplicationFormComponent } from '../components/application-form/application-form.component';
import { createUserWithEmailAndPassword } from '@firebase/auth';
import { Firestore, setDoc, doc } from '@angular/fire/firestore';
import { MatSnackBar } from '@angular/material/snack-bar';

import packageJson from '../../../package.json';
import { Analytics, logEvent } from '@angular/fire/analytics';
import { ActivatedRoute, NavigationEnd, Router, UrlSegment } from '@angular/router';

export const regionMap: { [slug: string]: string } = {
  'north-america-east': 'North America East',
  'north-america-west': 'North America West',
  'europe-central': 'Europe Central',
  'europe-west': 'Europe West',
  'south-america': 'South America',
}

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent implements OnInit {
  version: string = packageJson.version;
  region: string;
  regionSlug: string = "";
  activatedRoute: ActivatedRoute;

  constructor(
    private firestore: Firestore,
    public dialog: MatDialog,
    private _snackBar: MatSnackBar,
    private analytics: Analytics,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.region = localStorage.getItem('region') || 'North America East';
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
        if (this.region != region) {
          if (regionMap[region]) {
            this.updateRegion(regionMap[region]);
          } else {
            this.updateRegion(this.region, true);
          }
        }
      });
  }

  updateRegion(region: string, navigate: boolean = false) {
    localStorage.setItem('region', region);
    this.region = region;
    this.regionSlug = slugify(region, { lower: true });
    if (navigate) {
      const url = this.activatedRoute.snapshot.url;
      url[0].path = '/' + this.regionSlug;
      this.router.navigate([...url.map(x => x.path)]);
    }
  }

  ngOnInit(): void {
  }

  selectRegion(region: string) {
    this.updateRegion(region, true);
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

}
