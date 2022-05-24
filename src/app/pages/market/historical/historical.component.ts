import { Component, Inject, OnInit } from '@angular/core';
import { Firestore, docData, doc } from '@angular/fire/firestore';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { map, Observable, take } from 'rxjs';
import { CommonService } from 'src/services/common';
import * as Highcharts from "highcharts/highstock";
import IndicatorsCore from "highcharts/indicators/indicators";
import IndicatorEma from "highcharts/indicators/ema";
import IndicatorAtr from "highcharts/indicators/atr";
import IndicatorSupertrend from "highcharts/indicators/supertrend";
import HC_exporting from 'highcharts/modules/exporting';
import HC_heikinashi from 'highcharts/modules/heikinashi';
import { MarketItem } from '../items-table/items-table.interfaces';
import { ApiService } from 'src/services/api';
IndicatorsCore(Highcharts);
IndicatorEma(Highcharts);
IndicatorAtr(Highcharts);
IndicatorSupertrend(Highcharts);
HC_exporting(Highcharts);
HC_heikinashi(Highcharts);
(function (H) {
  H.wrap(H.Legend.prototype, 'colorizeItem', function (proceed, item, visible) {
    var color = item.color;
    item.color = item.options.legendColor;
    proceed.apply(this, Array.prototype.slice.call(arguments, 1));
    item.color = color;
  });
}(Highcharts));

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
  chartOptions!: Highcharts.Options | any;
  ohlcData: number[][] = [];
  loadChart: boolean = false;


  constructor(
    public dialogRef: MatDialogRef<HistoricalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: HistoricalData,
    private apiService: ApiService,
    public common: CommonService
  ) {

    apiService.getHistoricalData(this.data.item.id).pipe(take(1), map((x) => {
      this.ohlcData = x[0].map(td => [td.timestamp, td.open, td.high, td.low, td.close]);
      this.loadChartOptions();
      return x;
    })).subscribe();
  }

  loadChartOptions() {

    this.chartOptions = {
      chart: {
        backgroundColor: '#1e2329',
      },

      rangeSelector: {
        allButtonsEnabled: true,
        selected: 1,
        buttonPosition: {
          align: 'left'
        },
        buttonTheme: {
          width: 60,
          height: 12,
        },
        buttons: [
          {
            type: 'day',
            text: '3 Days',
            count: 3,
            preserveDataGrouping: true,
            dataGrouping: {
              forced: true,
              units: [['hour', [1]]]
            }
          },
          {
            type: 'week',
            text: '1 Week',
            count: 1,
            preserveDataGrouping: true,
            dataGrouping: {
              forced: true,
              units: [['hour', [4]]]
            }
          },
          {
            type: 'week',
            text: '2 Weeks',
            count: 2,
            preserveDataGrouping: true,
            dataGrouping: {
              forced: true,
              units: [['hour', [12]]]
            }
          }, {
            type: 'all',
            text: 'All',
            preserveDataGrouping: true,
            dataGrouping: {
              forced: true,
              units: [['day', [1]]]
            },
          },
        ],
        inputStyle: {
          color: 'white',
          backgroundColor: '#1e2329',
          fontWeight: 'bold',
          border: 'none'
        },
        labelStyle: {
          color: 'silver',
          fontWeight: 'bold'
        },
      },
      exporting: {
        buttons: {
          contextButton: {
            symbolFill: 'transparent',
            theme: {
              fill: 'transparent'
            }
          }
        }

      },
      navigator: {
        series: {
          type: 'areaspline',
          color: '#AED6F1',
          fillColor: '#12141633',
          dataGrouping: {
            forced: true,
            units: [['day', [1]]]
          },
          lineWidth: 1,
          marker: {
            enabled: false
          }
        }
      },
      yAxis: {
        gridLineColor: "#FFFFFF33"
      },

      title: {
        text: this.data.item.name + ' - ' + this.common.region,
        style: {
          color: 'white',
        },
      },

      legend: {
        enabled: true,
        itemStyle: {
          color: 'white'
        },
        itemHoverStyle: {
          color: '#ccc'
        },
        itemHiddenStyle: {
          color: '#888'
        },
      },

      plotOptions: {
        series: {
          showInLegend: true
        }
      },
      credits: {
        "href": null,
        "text": "Lost Ark Market Online: Community Sourced Data ( https://www.lostarkmarket.online )"
      },

      series: [{
        type: 'heikinashi',
        id: this.data.item.id,
        name: this.data.item.name,
        data: this.ohlcData,
        color: '#ff2020',
        upColor: 'limegreen',
        lineColor: 'transparent',
        legendColor: 'limegreen',
        lineWidth: 0,
      },
      {
        type: 'ema',
        linkedTo: this.data.item.id,
        params: {
          period: 12
        },
        color: '#F8C471',
        legendColor: '#F8C471',
        marker: {
          enabled: false
        },
        visible: false
      }, {
        type: 'supertrend',
        linkedTo: this.data.item.id,
        lineWidth: 4,
        marker: {
          enabled: false
        },
        legendColor: 'limegreen',
        risingTrendColor: 'limegreen',
        opacity: 0.6,
        fallingTrendColor: '#F22303',
        changeTrendLine: {
          styles: {
            lineWidth: 1,
            lineColor: '#000',
            dashStyle: 'Dash'
          }
        },
        visible: false
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
}