import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { CommonService } from "./common";
import { environment } from "src/environments/environment";


export interface MarketLiveItem {
  id: string;
  name: string;
  amount: number;
  avgPrice: number;
  lowPrice: number;
  image: string;
  recentPrice: number;
  cheapestRemaining: number;
  updatedAt: Date;
}

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

  getLiveData(request: { category?: string, subcategory?: string, categories?: string }) {
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
    return this.http.get<MarketLiveItem[]>(`${this.endpoint}/export-market-live/${this.common.region}`, {
      params
    });
  }
}