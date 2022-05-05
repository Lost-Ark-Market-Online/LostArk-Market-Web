import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'lostark-market';
  bg = 1;
  constructor(){
    this.bg = Math.round(Math.random()*10);
  }
}
