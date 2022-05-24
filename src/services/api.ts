import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { CommonService } from "./common";
import { environment } from "src/environments/environment";


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

  getLiveData(request: GetLiveDataRequest) {
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
    return this.http.get<MarketLiveItem[]>(`${this.endpoint}/export-market-live/${this.common.region}`, {
      params
    });
  }
  getHistoricalData(itemId: string) {
    return this.http.get<MarketHistoricalItem[][]>(`${this.endpoint}/export-item-history/${this.common.region}/${itemId}`);
  }
}