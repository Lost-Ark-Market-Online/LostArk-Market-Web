import type { DocumentData } from "@angular/fire/firestore";

export interface MarketItem extends DocumentData {
  id: string;
  name: string;
  amount: number;
  rarity: number;
  category: string;
  subcategory?: string;
  image: string;
  avgPrice?: number;
  cheapestRemaining?: number;
  lowPrice?: number;
  recentPrice?: number;
  updatedAt?: Date;
  chartOptions?: any;
  variation?: number;
  shortHistoric?: { [day: string]: number }

}
export interface FavoriteItem {
  name: string;
  rarity: number;
}