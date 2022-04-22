import { DataSource } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Observable, of, take, mergeMap, forkJoin, combineLatest, startWith, switchMap, Subject, last, map } from 'rxjs';
import { collection, collectionData, doc, DocumentData, Firestore, getFirestore, limit, orderBy, query, QueryConstraint, where } from '@angular/fire/firestore';

// TODO: Replace this with your own data model type
export interface MarketItem extends DocumentData {
  id: string;
  name: string;
  amount: number;
  rarity: number;
  category: string;
  subcategory: string;
  image: string;
  avgPrice?: number;
  cheapestRemaining?: number;
  lowPrice?: number;
  recentPrice?: number;
  updatedAt?: Date;
}
export interface FavoriteItem {
  name: string;
  rarity: number;
}

/**
 * Data source for the ItemsTable view. This class should
 * encapsulate all logic for fetching and manipulating the displayed data
 * (including sorting, pagination, and filtering).
 */
export class MarketDataSource extends DataSource<MarketItem> {
  data: MarketItem[] = [];
  collectionSize: number = 0;
  paginator?: MatPaginator;
  sort?: MatSort;
  filter?: { region: string, category?: string, subcategory?: string, favorites: boolean };
  filter$: Subject<{ region: string, category?: string, subcategory?: string, favorites: boolean }> = new Subject();
  favorites?: FavoriteItem[];

  constructor(private firestore: Firestore) {
    super();
  }

  updateFilter(region: string, category?: string, subcategory?: string, favorites: boolean = false) {
    this.filter$.next({
      region: region,
      category: category,
      subcategory: subcategory,
      favorites: !!favorites
    });
  }

  connect(): Observable<MarketItem[]> {
    if (this.paginator && this.sort && this.filter) {
      const firestore = this.firestore;
      return combineLatest({
        filter: this.filter$.pipe(startWith({
          region: this.filter?.region,
          category: this.filter?.category,
          subcategory: this.filter?.subcategory,
          favorites: this.filter?.favorites
        })),
        paginator: this.paginator.page.pipe(startWith({ previousPageIndex: 0, pageIndex: 0, pageSize: 10, length: 0 })),
        sort: this.sort.sortChange.pipe(startWith({ active: 'name', direction: 'asc' }))
      }).pipe(mergeMap((combined) => {
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
