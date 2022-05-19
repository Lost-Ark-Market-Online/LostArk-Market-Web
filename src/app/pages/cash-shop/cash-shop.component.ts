import { Component, OnInit } from '@angular/core';
import { startWith, Subscription, take } from 'rxjs';
import { ApiService, MarketLiveItem } from 'src/services/api';
import { CommonService } from 'src/services/common';

import cashshopdata from '../../../data/cashshop.json';

export interface CashShopItem {
  id?: string;
  name: string;
  amount: number;
  blueCrystals: number;
  goldPrice?: number;
  discount?: number;
  marketGoldPrice?: number;
  category: string;
  rarity: number;
  image: string;
  class?: string;
  contains?: {
    name: string;
    id: string;
    amount: number;
  }[]
}

@Component({
  selector: 'app-cash-shop',
  templateUrl: './cash-shop.component.html',
  styleUrls: ['./cash-shop.component.css']
})
export class CashShopComponent implements OnInit {
  shopItems: CashShopItem[];
  regionSubscription: Subscription;
  marketData?: { [itemId: string]: MarketLiveItem };

  constructor(
    public common: CommonService,
    private api: ApiService,
  ) {
    this.shopItems = cashshopdata.sort((a, b) => a.category == b.category ? (a.name > b.name ? 1 : -1) : (a.category > b.category ? 1 : -1));

    this.regionSubscription = this.common.region$.pipe(startWith(this.common.region)).subscribe(region => {
      this.api.getLiveData().pipe(take(1)).subscribe((data) => {
        this.marketData = data.reduce<{ [itemId: string]: MarketLiveItem }>((acc, item) => {
          acc[item.id] = item;
          return acc;
        }, {});
        this.setPrices();
      });
    })
  }
  setPrices() {
    if (this.marketData) {
      const blueCrystalPrice = this.marketData['blue-crystal-0'].lowPrice;
      for (const shopItemIndex in this.shopItems) {
        if (Object.prototype.hasOwnProperty.call(this.shopItems, shopItemIndex)) {
          const shopItem = this.shopItems[shopItemIndex];
          this.shopItems[shopItemIndex].goldPrice = Math.round(shopItem.blueCrystals * blueCrystalPrice);
          if (shopItem.id) {
            const marketItem = this.marketData[shopItem.id];
            if (marketItem) {
              this.shopItems[shopItemIndex].marketGoldPrice = Math.round(marketItem.lowPrice / marketItem.amount * shopItem.amount);
              if (this.shopItems[shopItemIndex].marketGoldPrice! > this.shopItems[shopItemIndex].goldPrice!) {
                this.shopItems[shopItemIndex].discount = Math.round((this.shopItems[shopItemIndex].goldPrice! - this.shopItems[shopItemIndex].marketGoldPrice!) / this.shopItems[shopItemIndex].marketGoldPrice! * 100)
              }
            }
          }
        }
      }
    }
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    if (this.regionSubscription) {
      this.regionSubscription.unsubscribe();
    }
  }

}
