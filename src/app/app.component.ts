import { Component } from '@angular/core';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  public appPages = [
    { title: 'Bateria', url: 'battery', icon: 'battery-half' },
    { title: 'Power by', url: 'power-by', icon: 'aperture' },
  ];
  public labels = ['Bateria', 'Power by'];
  constructor() {}
}
