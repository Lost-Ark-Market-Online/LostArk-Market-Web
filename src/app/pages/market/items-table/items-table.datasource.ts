import { DataSource } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Observable, of, take, mergeMap, combineLatest, startWith, Subject, map, BehaviorSubject, distinctUntilChanged, pairwise } from 'rxjs';

import { FavoriteItem, MarketItem } from './items-table.interfaces';
import { Filter } from 'src/interfaces/common';
import { CommonService } from 'src/services/common';
import { ApiService, GetLiveDataRequest } from 'src/services/api';

export interface CombinedFilter {
  filter: {
    category?: string;
    subcategory?: string;
    favorites?: boolean;
    search?: string;
  },
  paginator: {
    length: number;
    pageIndex: number;
    pageSize: number;
    previousPageIndex?: number;
  },
  sort: {
    active: string;
    direction: string;
  }
};

export class MarketDataSource extends DataSource<MarketItem> {
  data: MarketItem[] = [];
  collectionSize: number = 0;
  paginator?: MatPaginator;
  sort?: MatSort;
  filter?: Filter;
  filter$: Subject<Filter> = new Subject();
  collection: MarketItem[] = [];
  public loading = new BehaviorSubject(false);

  constructor(private apiService: ApiService, private common: CommonService) {
    super();
  }

  refreshMarket() {
    this.paginator?.firstPage()
    this.filter$.next({ ...this.filter! });
  }

  connect(): Observable<MarketItem[]> {
    if (this.paginator && this.sort && this.filter) {
      return combineLatest({
        filter: this.filter$.pipe(startWith({
          category: this.filter?.category,
          subcategory: this.filter?.subcategory,
          favorites: this.filter?.favorites,
          search: this.filter?.search
        })),
        paginator: this.paginator.page.pipe(startWith({ previousPageIndex: 0, pageIndex: 0, pageSize: 10, length: 0 })),
        sort: this.sort.sortChange.pipe(startWith({ active: 'name', direction: 'asc' }))
      }).pipe(
        startWith(undefined),
        pairwise(),
        mergeMap(([prevCombined, combined]) => {
          this.loading.next(true);
          if (!combined) {
            throw 'Implementation error';
          }
          if (prevCombined) {
            if (JSON.stringify(prevCombined.filter) == JSON.stringify(combined.filter)) {
              return of({
                sort: combined.sort,
                filter: combined.filter,
                paginator: combined.paginator,
                collection: this.collection
              })
            }
          }

          const request: GetLiveDataRequest = {};
          if (combined.filter.search) {
            request.search = combined.filter.search;
          } else if (combined.filter.category) {
            request.category = combined.filter.category;
            if (combined.filter.subcategory) {
              request.subcategory = combined.filter.subcategory;
            }
          }
          if (combined.filter.favorites) {
            request.items = this.common.marketFavorites.join(",") || "";
            if (request.items == "") {
              return of({
                sort: combined.sort,
                filter: combined.filter,
                paginator: combined.paginator,
                collection: []
              })
            }
          }
          const query$ = this.apiService.getLiveData(request);
          return query$.pipe(take(1), map(collection => ({
            sort: combined.sort,
            filter: combined.filter,
            paginator: combined.paginator,
            collection: collection.map(item => {

              const { id, name, amount, rarity, category, subcategory, image, avgPrice, cheapestRemaining, lowPrice, recentPrice, updatedAt, shortHistoric } = item;

              let shortHistoricOrdererd, labels, data, variation, color;
              if (shortHistoric) {
                shortHistoricOrdererd = Object.keys(shortHistoric).sort().reduce((acc, key) => {
                  acc[key] = shortHistoric[key];
                  return acc;
                }, {});
                labels = Object.keys(shortHistoricOrdererd);
                data = Object.values(shortHistoricOrdererd);
                variation = Math.round(((data[data.length - 1] / data[0]) - 1) * 10000) / 100;
                color = '#AED6F1';
                if (variation > 5) {
                  color = 'limegreen'
                }
                if (variation < -5) {
                  color = '#ff2020';
                }
              }
              let fullPrice;
              if (category == 'Currency Exchange') {
                if(id == 'blue-crystal-0'){
                  fullPrice = Math.round(lowPrice * 95)
                }else{                  
                  fullPrice = Math.round(lowPrice * 238)
                }
              }

              return {
                name,
                amount,
                rarity,
                category,
                subcategory,
                image,
                avgPrice,
                cheapestRemaining,
                lowPrice,
                fullPrice,
                recentPrice,
                updatedAt: updatedAt,
                id,
                variation,
                shortHistoric,
                chartOptions: shortHistoricOrdererd ? {
                  chart: {
                    backgroundColor: 'transparent',
                    borderWidth: 0,
                    type: "spline",
                    height: 40,
                    width: 150
                  },
                  title: {
                    text: ""
                  },
                  credits: {
                    enabled: false
                  },
                  xAxis: {
                    visible: false,
                    endOnTick: false,
                    startOnTick: false,
                    labels: {
                      enabled: false
                    },
                    title: {
                      text: null
                    },
                    tickPositions: [0]
                  },
                  yAxis: {
                    visible: false,
                    endOnTick: false,
                    startOnTick: false,
                    labels: {
                      enabled: false
                    },
                    title: {
                      text: null
                    },
                    tickPositions: [0]
                  },
                  legend: {
                    enabled: false
                  },
                  tooltip: {
                    hideDelay: 0,
                    outside: true,
                    shared: true,
                    useHTML: true,
                    formatter() {
                      return `<div class="price-tooltip">
                      <span class="date">${labels[this.x]}</span>
                      <span class="price">${this.y}<img src="/assets/icons/gold.png" alt="gold" class="gold"></span>
                      </div>
                      `
                    },
                  },
                  plotOptions: {
                    series: {
                      animation: false,
                      lineWidth: 3,
                      shadow: false,
                      color: color,
                      states: {
                        hover: {
                          lineWidth: 3
                        }
                      },
                      marker: {
                        radius: 1,
                        states: {
                          hover: {
                            radius: 2
                          }
                        }
                      }
                    },
                  },
                  series: [
                    {
                      name: '',
                      type: 'spline',
                      data: data
                    }
                  ]
                } : undefined
              };

            })
          })));
        }), map(combined => {
          this.collection = combined.collection;
          const { subCollection, size } = this.filterCollection(combined.collection, { paginator: combined.paginator, sort: combined.sort, favorites: combined.filter.favorites });
          this.collectionSize = size;
          this.loading.next(false);
          return subCollection;
        }));
    }
    return of([]);
  }

  filterCollection(collection: MarketItem[], filter: any): { subCollection: MarketItem[], size: number } {
    collection = collection.sort((a, b) => {
      if (a.name == b.name) {
        return a.rarity - b.rarity;
      } else {
        return a.name > b.name ? -1 : 1;
      }
    })
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
