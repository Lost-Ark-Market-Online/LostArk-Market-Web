import { AfterContentChecked, AfterContentInit, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, ViewChild } from '@angular/core';
import { Analytics, logEvent } from '@angular/fire/analytics';
import { Firestore } from '@angular/fire/firestore';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { Filter } from 'src/interfaces/common';
import { CommonService } from 'src/services/common';
import { HistoricalComponent } from '../historical/historical.component';
import { MarketDataSource } from './items-table.datasource';

import * as Highcharts from "highcharts";

import type { FavoriteItem, MarketItem } from './items-table.interfaces';
import { ApiService } from 'src/services/api';
import { BehaviorSubject, Subscription } from 'rxjs';

@Component({
  selector: 'app-items-table',
  templateUrl: './items-table.component.html',
  styleUrls: ['./items-table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ItemsTableComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatTable) table!: MatTable<MarketItem>;
  @Input() filter?: Filter;
  dataSource: MarketDataSource;
  Highcharts: typeof Highcharts = Highcharts;

  /** Columns displayed in the table. Columns IDs can be added, removed, or reordered. */
  displayedColumns = ['name', 'variation', 'recentPrice', 'lowPrice', 'cheapestRemaining', 'updatedAt'];

  constructor(
    private _snackBar: MatSnackBar,
    public dialog: MatDialog,
    private apiService: ApiService,
    private analytics: Analytics,
    public common: CommonService,
    private cdref: ChangeDetectorRef
  ) {
    this.dataSource = new MarketDataSource(this.apiService, common);
  }


  ngAfterViewInit(): void {
    this.table.dataSource = this.dataSource;
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    this.dataSource.filter = this.filter;
  }

  openHistory(item: MarketItem) {
    logEvent(this.analytics, 'historical_component', { region: this.common.region, item: item.id });
    this.dialog.open(HistoricalComponent, {
      width: '80%',
      maxWidth: '800px',
      data: { item, region: this.common.region }
    })
  }

  isUntradable(item: MarketItem) {
    if (item.category == 'Engraving Recipe') {
      return true;
    }
    return false;
  }

}
