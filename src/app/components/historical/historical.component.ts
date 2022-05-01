import { Component, Inject, OnInit } from '@angular/core';
import { Firestore, docData, doc } from '@angular/fire/firestore';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { map, Observable } from 'rxjs';
import { MarketItem } from 'src/app/items-table/market-datasource';
import { CommonService } from 'src/services/common';
import * as Highcharts from "highcharts/highstock";
import IndicatorsCore from "highcharts/indicators/indicators";
import IndicatorEma from "highcharts/indicators/ema";
import IndicatorAtr from "highcharts/indicators/atr";
import IndicatorSupertrend from "highcharts/indicators/supertrend";
import HC_exporting from 'highcharts/modules/exporting';
IndicatorsCore(Highcharts);
IndicatorEma(Highcharts);
IndicatorAtr(Highcharts);
IndicatorSupertrend(Highcharts);
HC_exporting(Highcharts);

interface HistoricItem {
  timeData: OHLC[],
  updatedAt: Date
}

interface OHLC {
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: number;
}

@Component({
  selector: 'app-historical',
  templateUrl: './historical.component.html',
  styleUrls: ['./historical.component.css']
})
export class HistoricalComponent {
  Highcharts: typeof Highcharts = Highcharts;
  chartOptions!: Highcharts.Options;
  ohlcData: number[][] = [];
  loadChart:boolean = false;


  constructor(
    public dialogRef: MatDialogRef<HistoricalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: HistoricalData,
    private firestore: Firestore,
    public common: CommonService
  ) {
    docData(doc(this.firestore, `${this.data.region}-historic/${this.data.item.id}`).withConverter<HistoricItem>({
      fromFirestore(snapshot) {
        const { timeData, updatedAt } = snapshot.data();
        return {
          timeData,
          updatedAt: updatedAt.toDate()
        };
      },
      toFirestore(historicItem) {
        return historicItem;
      }
    })).pipe(map((x) => {
      this.ohlcData = x.timeData.map(td => [td.timestamp, td.open, td.high, td.low, td.close]);
      this.loadChartOptions();
      return x;
    })).subscribe()
    
    
  }

  loadChartOptions(){
    this.chartOptions = {
      rangeSelector: {
        selected: 2
      },

      title: {
        text: 'Guardian Stone'
      },

      legend: {
        enabled: true
      },

      plotOptions: {
        series: {
          showInLegend: true
        }
      },

      series: [{
        type: 'ohlc',
        id: this.data.item.id,
        name: this.data.item.name,
        data: this.ohlcData
      }, {
        type: 'ema',
        linkedTo: this.data.item.id,
        params: {
          period: 12
        }
      }, {
        type: 'ema',
        linkedTo: this.data.item.id,
        params: {
          period: 24
        }
      }, {
        type: 'supertrend',
        linkedTo: this.data.item.id,
        lineWidth: 2,
        marker: {
          enabled: false
        },
        risingTrendColor: '#16C535',
        fallingTrendColor: '#F22303',
        changeTrendLine: {
          styles: {
            lineWidth: 0.5,
            lineColor: '#000',
            dashStyle: 'Dash'
          }
        }
      }]
    };
    this.loadChart = true;
  }
  
  close(): void {
    this.dialogRef.close();
  }

}

export type HistoricalData = {
  item: MarketItem;
  region: string;
}