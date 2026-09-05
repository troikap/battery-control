import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { registerIcons } from './app/icons';

// Registrar iconos de Ionicons antes del bootstrap para evitar
// "Failed to construct 'URL': Invalid base URL"
registerIcons();

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));
