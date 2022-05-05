import { DataSource } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Observable, of, take, mergeMap, combineLatest, startWith, Subject, map } from 'rxjs';
import { collection, collectionData, DocumentData, Firestore, query, QueryConstraint, where } from '@angular/fire/firestore';

import type { Filter } from '../market.interfaces';
import { FavoriteItem, MarketItem } from './items-table.interfaces';

export class MarketDataSource extends DataSource<MarketItem> {
  data: MarketItem[] = [];
  collectionSize: number = 0;
  paginator?: MatPaginator;
  sort?: MatSort;
  filter?: Filter;
  filter$: Subject<Filter> = new Subject();
  favorites?: FavoriteItem[];

  constructor(private firestore: Firestore) {
    super();
  }

  refreshMarket() {
    console.log('refreshMarket')
    this.paginator?.firstPage()
    this.filter$.next({ ...this.filter! });
  }

  connect(): Observable<MarketItem[]> {
    if (this.paginator && this.sort && this.filter) {
      const firestore = this.firestore;
      return combineLatest({
        filter: this.filter$.pipe(startWith({
          region: this.filter?.region,
          category: this.filter?.category,
          subcategory: this.filter?.subcategory,
          favorites: this.filter?.favorites,
          search: this.filter?.search
        })),
        paginator: this.paginator.page.pipe(startWith({ previousPageIndex: 0, pageIndex: 0, pageSize: 10, length: 0 })),
        sort: this.sort.sortChange.pipe(startWith({ active: 'name', direction: 'asc' }))
      }).pipe(mergeMap((combined) => {
        console.log('Datasource connected',combined)
        const queryFilters: QueryConstraint[] = [];
        if (combined.filter.favorites) {
          if (this.favorites!.length > 0) {
            queryFilters.push(where('name', 'in', this.favorites?.map(a => a.name)));
          } else {
            return of({
              sort: combined.sort,
              filter: combined.filter,
              paginator: combined.paginator,
              collection: []
            });
          }
        } else {
          if (combined.filter.search !== undefined) {
            if (!combined.filter.search) {
              return of({
                sort: combined.sort,
                filter: combined.filter,
                paginator: combined.paginator,
                collection: []
              });
            }
            queryFilters.push(where('name', '>=', combined.filter.search));
            queryFilters.push(where('name', '<', combined.filter.search.replace(/.$/, c => String.fromCharCode(c.charCodeAt(0) + 1))));
          }
          if (combined.filter.category) {
            queryFilters.push(where('category', '==', combined.filter.category));
            if (combined.filter.subcategory) {
              queryFilters.push(where('subcategory', '==', combined.filter.subcategory));
            }
          }
        }
        const collectionObservable = collectionData(
          query(
            collection(firestore, combined.filter.region).withConverter<MarketItem>({
              fromFirestore: snapshot => {
                const { name, amount, rarity, category, subcategory, image, avgPrice, cheapestRemaining, lowPrice, recentPrice, updatedAt } = snapshot.data();
                const { id } = snapshot;
                const { hasPendingWrites } = snapshot.metadata;
                return { name, amount, rarity, category, subcategory, image, avgPrice, cheapestRemaining, lowPrice, recentPrice, updatedAt: updatedAt?.toDate(), id, hasPendingWrites };
              },
              toFirestore: (it: any) => it // Not writing into Firestore
            }),
            ...queryFilters
          )
        ) as Observable<MarketItem[]>;
        return collectionObservable.pipe(take(1), map(collection => ({
          sort: combined.sort,
          filter: combined.filter,
          paginator: combined.paginator,
          collection: collection
        })));
      }), map(combined => {
        const { subCollection, size } = this.filterCollection(combined.collection, { paginator: combined.paginator, sort: combined.sort, favorites: combined.filter.favorites });
        this.collectionSize = size;
        return subCollection;
      }));
    } else {
      throw Error('Please set the paginator and sort on the data source before connecting.');
    }
  }

  filterCollection(collection: MarketItem[], filter: any): { subCollection: MarketItem[], size: number } {
    collection = collection.sort((a, b) => {
      if (a.name == b.name) {
        return a.rarity - b.rarity;
      } else {
        return a.name > b.name ? -1 : 1;
      }
    })
    if (filter.favorites) {
      collection = collection.filter(item => this.favorites!.findIndex(i => i.name == item.name && i.rarity == item.rarity) >= 0);
    }
    let subcol = [...collection];
    if (filter.sort) {
      subcol = subcol.sort((a, b) => {
        if (a[filter.sort.active] > b[filter.sort.active]) {
          return filter.sort.direction == 'desc' ? -1 : 1;
        }
        if (b[filter.sort.active] > a[filter.sort.active]) {
          return filter.sort.direction == 'desc' ? 1 : -1;
        }
        return 0;
      })
    }
    if (filter.paginator) {
      subcol = subcol.slice(filter.paginator.pageIndex * filter.paginator.pageSize, (filter.paginator.pageIndex + 1) * filter.paginator.pageSize)
    }
    return { subCollection: subcol, size: collection.length };
  }

  disconnect(): void { }
}
