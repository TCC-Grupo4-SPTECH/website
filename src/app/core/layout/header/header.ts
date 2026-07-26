import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';

@Component({
  selector: 'app-header',
  imports: [RouterLink, MatIconModule, MatIconButton],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {}
