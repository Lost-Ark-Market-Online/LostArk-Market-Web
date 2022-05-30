import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { CommonService } from "./common";
import { environment } from "src/environments/environment";
import { catchError, Observable, of, throwError } from "rxjs";


export interface MarketLiveItem {
  id: string;
  avgPrice: number;
  lowPrice: number;
  recentPrice: number;
  cheapestRemaining: number;
  updatedAt: Date;
  name: string;
  amount: number;
  rarity: number;
  image: string;
  category: string;
  subcategory?: string;
  shortHistoric?: {
    [datetime: string]: number;
  }
}
export interface MarketHistoricalItem {
  id: string;
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: number;
}

export interface GetLiveDataRequest {
  category?: string
  subcategory?: string;
  categories?: string;
  items?: string;
  search?: string;
};

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  endpoint = environment.apiHost;
  region = "";
  constructor(
    private http: HttpClient,
    private common: CommonService
  ) {
    this.common.region$.subscribe(region => {
      this.region = region;
    });
  }

  getLiveData(request: GetLiveDataRequest): Observable<MarketLiveItem[]> {
    let params: any = {};
    if (request.category) {
      params['category'] = request.category;
    }
    if (request.subcategory) {
      params['subcategory'] = request.subcategory;
    }
    if (request.categories) {
      params['categories'] = request.categories;
    }
    if (request.items) {
      params['items'] = request.items;
    }
    if (request.search) {
      params['search'] = request.search;
    }
    return this.http.get<MarketLiveItem[]>(`${this.endpoint}/export-market-live/${this.common.region}`, {
      params
    }).pipe(catchError((error) => {

      if (error.status === 0) {
        console.error('An error occurred:', error.error);
      } else {
        console.error(
          `Backend returned code ${error.status}, body was: `, error.error);
      }
      return of([]);
    }));
  }
  getHistoricalData(itemId: string) {
    return this.http.get<MarketHistoricalItem[][]>(`${this.endpoint}/export-item-history/${this.common.region}/${itemId}`);
  }
}