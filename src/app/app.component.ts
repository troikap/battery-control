import { Component } from '@angular/core';
import { StatusBar } from '@ionic-native/status-bar/ngx';

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
  constructor(
    private statusBar: StatusBar
  ) {
    this.statusBar.overlaysWebView(false);
    this.statusBar.backgroundColorByHexString('#536a58');
  }
}

// String	REQUEST_COMPANION_RUN_IN_BACKGROUND
// Permite que una aplicación complementaria se ejecute en segundo plano.

// String	REQUEST_COMPANION_USE_DATA_IN_BACKGROUND
// Permite que una aplicación complementaria utilice datos en segundo plano.