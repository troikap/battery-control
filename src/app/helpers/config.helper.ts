import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigHelper {
  private sounds = [
    {id: 1, value: "assets/sounds/sonido-1.mp3"},
    {id: 2, value: "assets/sounds/sonido-2.mp3"},
    {id: 3, value: "assets/sounds/sonido-3.mp3"},
    {id: 4, value: "assets/sounds/sonido-4.mp3"},
    {id: 5, value: "assets/sounds/sonido-5.mp3"},
    {id: 6, value: "assets/sounds/sonido-6.mp3"},
    {id: 7, value: "assets/sounds/sonido-7.mp3"},
    {id: 8, value: "assets/sounds/sonido-8.mp3"},
    {id: 9, value: "assets/sounds/sonido-9.mp3"},
    {id: 10, value: "assets/sounds/sonido-10.mp3"},
    {id: 11, value: "assets/sounds/sonido-11.mp3"},
  ]
  private soundSelected = {id: 1, value: "assets/sounds/sonido-9.mp3"};
  private isActivatedAlarm = true;
  private nivel: {lower: number, upper: number} = {lower: 20, upper: 80};

  constructor() { }

  public getSounds() {
    return this.sounds;
  }

  public getSound() {
    return this.soundSelected;
  }

  public setSound( sound: {id: number, value: string}) {
    this.soundSelected = sound;
  }

  public getIsActivatedAlarm() {
    return this.isActivatedAlarm;
  }

  public setIsActivatedAlarm(value: boolean) {
    this.isActivatedAlarm = value;
  }

  public setNivel(nivel: {lower: number, upper: number}) {
    this.nivel = nivel;
  }

  public getNivel() {
    return this.nivel;
  }
}
