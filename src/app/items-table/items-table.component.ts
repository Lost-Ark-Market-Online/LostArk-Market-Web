import { AfterViewInit, Component, Input, ViewChild } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { Observable } from 'rxjs';
import { MarketDataSource, MarketItem } from './market-datasource';



@Component({
  selector: 'app-items-table',
  templateUrl: './items-table.component.html',
  styleUrls: ['./items-table.component.css']
})
export class ItemsTableComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatTable) table!: MatTable<MarketItem>;
  @Input() region: string = 'East North America';
  dataSource: MarketDataSource;

  /** Columns displayed in the table. Columns IDs can be added, removed, or reordered. */
  displayedColumns = ['name', 'avgPrice', 'recentPrice', 'lowPrice', 'cheapestRemaining', 'updatedAt'];

  constructor(private firestore: Firestore) {
    this.dataSource = new MarketDataSource(firestore);
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    this.dataSource.filter = {
      region: this.region,
      category: undefined,
      subcategory: undefined
    }
    this.table.dataSource = this.dataSource;
  }
  getImageUrl(filename: string) {
    return `/assets/item_icons/${filename}`;
  }
}
