import { Component } from '@angular/core';
import { StatusBar, Style } from '@capacitor/status-bar';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  public appPages = [
    { title: 'Bateria', url: 'battery', icon: 'battery-half' },
  ];
  public labels = ['Bateria'];
  constructor() {
    this.initStatusBar();
  }

  async initStatusBar() {
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0f172a' });
    } catch (err) {
      console.warn('StatusBar not available (web browser):', err);
    }
  }
}
