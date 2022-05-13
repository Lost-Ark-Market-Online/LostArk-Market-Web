import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { CommonService } from "./common";
import { environment } from "src/environments/environment";


export interface MarketLiveItem {
  id:string;
  name:string;
  amount:number;
  avgPrice:number;
  lowPrice:number;
  image:string;
  recentPrice:number;
  cheapestRemaining:number;
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

  getLiveData(category?: string, subcategory?: string) {
    let params: any = {};
    if (category) {
      params['category'] = category;
    }
    if (subcategory) {
      params['subcategory'] = subcategory;
    }
    return this.http.get<MarketLiveItem[]>(`${this.endpoint}/export-market-live/${this.common.region}`, {
      params
    });
  }
}