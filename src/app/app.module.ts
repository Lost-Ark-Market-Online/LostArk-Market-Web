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
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  { path: ':region/market', component: MarketComponent },
  { path: ':region/market/:category', component: MarketComponent },
  { path: ':region/market/:category/:subcategory', component: MarketComponent },
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
    HoningComponent
  ],
  imports: [
    BrowserModule,
    RouterModule.forRoot(routes),
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
    HighchartsChartModule
  ],
  providers: [ScreenTrackingService, CommonService],
  bootstrap: [AppComponent]
})
export class AppModule { }
