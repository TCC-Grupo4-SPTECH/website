import { Injectable } from '@angular/core';

export interface DetectionResult {
  recognized: boolean;
  label: string;
}

/**
 * Mock stand-in for the real computer-vision detection API.
 * Replace `detect` with an HTTP call once the backend endpoint exists.
 */
@Injectable({ providedIn: 'root' })
export class SightingDetectionService {
  detect(file: File): Promise<DetectionResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const recognized = Math.random() < 0.8;
        resolve({
          recognized,
          label: recognized ? 'Arara-Azul reconhecida' : 'Arara-Azul não identificada',
        });
      }, 1200);
    });
  }
}
