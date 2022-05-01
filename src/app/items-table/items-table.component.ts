import { AfterViewInit, Component, Input, ViewChild } from '@angular/core';
import { Analytics, logEvent } from '@angular/fire/analytics';
import { Firestore } from '@angular/fire/firestore';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { Observable } from 'rxjs';
import { CommonService } from 'src/services/common';
import { HistoricalComponent } from '../components/historical/historical.component';
import { Filter } from '../navigation/navigation.component';
import { FavoriteItem, MarketDataSource, MarketItem } from './market-datasource';


@Component({
  selector: 'app-items-table',
  templateUrl: './items-table.component.html',
  styleUrls: ['./items-table.component.css']
})
export class ItemsTableComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatTable) table!: MatTable<MarketItem>;
  @Input() filter?: Filter;
  @Input() favorites?: FavoriteItem[];
  dataSource: MarketDataSource;

  /** Columns displayed in the table. Columns IDs can be added, removed, or reordered. */
  displayedColumns = ['name', 'avgPrice', 'recentPrice', 'lowPrice', 'cheapestRemaining', 'updatedAt'];

  constructor(private firestore: Firestore,
    private _snackBar: MatSnackBar,
    public dialog: MatDialog,
    private analytics: Analytics,
    public common: CommonService) {
    this.dataSource = new MarketDataSource(firestore);
  }

  ngAfterViewInit(): void {
    const url = new URL(document.location.href);
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    this.dataSource.filter = this.filter;
    this.dataSource.favorites = this.favorites;
    this.table.dataSource = this.dataSource;
  }

  toggleFavorite(item: FavoriteItem) {
    if (!this.favorites) {
      return;
    }
    const favIndex = this.favorites.findIndex(i => i.name == item.name && i.rarity == item.rarity);
    if (favIndex >= 0) {
      this.favorites.splice(favIndex, 1);
    } else {
      if (this.favorites!.length >= 10) {
        this._snackBar.open('Can only have 10 favorites for now', undefined,
          {
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            duration: 1500
          });
        return;
      }
      this.favorites.push(item);
    }
    localStorage.setItem('favorites', JSON.stringify(this.favorites));
  }

  isFavorite(item: FavoriteItem) {
    if (!this.favorites) {
      return false;
    }
    return this.favorites.findIndex(i => i.name == item.name && i.rarity == item.rarity) >= 0;
  }
  openHistory(item: MarketItem) {
    logEvent(this.analytics, 'historical_component', { region: this.dataSource.filter?.region, item: item.id });
    this.dialog.open(HistoricalComponent, {
      width: '80%',
      maxWidth: '800px',
      data: { item, region: this.dataSource.filter?.region }
    })
  }
}
