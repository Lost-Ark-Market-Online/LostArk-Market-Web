import { AfterViewInit, Component, Input, ViewChild } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { Observable } from 'rxjs';
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
  @Input() filter?: { region: string; category?: string; subcategory?: string, favorites: boolean };
  @Input() favorites?: FavoriteItem[];
  dataSource: MarketDataSource;

  /** Columns displayed in the table. Columns IDs can be added, removed, or reordered. */
  displayedColumns = ['name', 'avgPrice', 'recentPrice', 'lowPrice', 'cheapestRemaining', 'updatedAt'];

  constructor(private firestore: Firestore) {
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
  getImageUrl(filename: string) {
    return `/assets/item_icons/${filename}`;
  }

  toggleFavorite(item: FavoriteItem) {
    if (!this.favorites) {
      return;
    }
    const favIndex = this.favorites.findIndex(i => i.name == item.name && i.rarity == item.rarity);
    if (favIndex >= 0) {
      this.favorites.splice(favIndex, 1);
    } else {
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
}
