import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PowerByPage } from './power-by.page';

const routes: Routes = [
  {
    path: '',
    component: PowerByPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PowerByPageRoutingModule {}
