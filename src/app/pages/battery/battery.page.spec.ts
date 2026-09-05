import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { BatteryPage } from './battery.page';
import { BatteryProvider } from 'src/app/providers/battery.provider';
import { BackgroundModeService } from 'src/app/providers/background-mode.service';
import { ConfigHelper } from 'src/app/helpers/config.helper';
import { ToastHelper } from 'src/app/helpers/toast.helper';

describe('BatteryPage', () => {
  let component: BatteryPage;
  let fixture: ComponentFixture<BatteryPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BatteryPage],
      imports: [IonicModule.forRoot(), RouterModule.forRoot([])],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        BatteryProvider,
        BackgroundModeService,
        ConfigHelper,
        ToastHelper,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BatteryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
