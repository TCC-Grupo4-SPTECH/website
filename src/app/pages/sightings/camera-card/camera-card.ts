import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-camera-card',
  imports: [RouterLink],
  templateUrl: './camera-card.html',
  styleUrl: './camera-card.scss',
})
export class CameraCard {
  readonly camera = input.required<string>();
}
