import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NavigationComponent } from './navigation/navigation.component';
import { LayoutModule } from '@angular/cdk/layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { ItemsTableComponent } from './pages/market/items-table/items-table.component';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatMenuModule } from '@angular/material/menu';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { environment } from '../environments/environment';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { MomentModule } from 'ngx-moment';
import { ApplicationFormComponent } from './components/application-form/application-form.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { AnalyticsModule, ScreenTrackingService } from '@angular/fire/analytics';
import { HistoricalComponent } from './pages/market/historical/historical.component';
import { CommonService } from 'src/services/common';
import { HighchartsChartModule } from "highcharts-angular";
import { MarketComponent } from './pages/market/market.component';
import { CraftingComponent } from './pages/crafting/crafting.component';
import { HoningComponent } from './pages/honing/honing.component';
import { Routes, RouterModule, UrlSegment, UrlMatchResult } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApiService } from '../services/api';
import { CashShopComponent } from './pages/cash-shop/cash-shop.component';

function pageMatcherFactory(page: string) {
  return function craftingPageMatcher(segments: UrlSegment[]): UrlMatchResult {
    if (segments.length >= 2 && segments[1].path == page) {
      let posParams: any = {};
      posParams['region'] = segments[0];
      if (segments.length > 2) {
        posParams['category'] = segments[2]
      }
      if (segments.length > 3) {
        posParams['subcategory'] = segments[3]
      }
      if (segments.length > 4) {
        posParams['item'] = segments[4]
      }
      return {
        consumed: segments,
        posParams
      };
    }
    return <UrlMatchResult>(null as any);
  }
}



const routes: Routes = [
  { matcher: pageMatcherFactory('crafting'), component: CraftingComponent },
  { matcher: pageMatcherFactory('cash-shop'), component: CashShopComponent },
  { matcher: pageMatcherFactory('market'), component: MarketComponent },
  { path: '', redirectTo: '/default/market', pathMatch: 'full' },
]

@NgModule({
  declarations: [
    AppComponent,
    NavigationComponent,
    ItemsTableComponent,
    ApplicationFormComponent,
    HistoricalComponent,
    MarketComponent,
    CraftingComponent,
    HoningComponent,
    CashShopComponent
  ],
  imports: [
    BrowserModule,
    RouterModule.forRoot(routes),
    HttpClientModule,
    BrowserAnimationsModule,
    LayoutModule,
    FlexLayoutModule,
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatIconModule,
    MatListModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatMenuModule,
    MatFormFieldModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => getFirestore()),
    MomentModule,
    AnalyticsModule,
    HighchartsChartModule,
    MatTooltipModule,
    MatSliderModule,
    MatSlideToggleModule
  ],
  providers: [ScreenTrackingService, CommonService, ApiService],
  bootstrap: [AppComponent]
})
export class AppModule { }
