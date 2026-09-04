import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'battery',
    loadChildren: () => import('./pages/battery/battery.module').then( m => m.BatteryPageModule)
  },
  {
    path: 'power-by',
    loadChildren: () => import('./pages/power-by/power-by.module').then( m => m.PowerByPageModule)
  },
  {
    path: '',
    redirectTo: 'battery',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'battery',
    pathMatch: 'full'
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
