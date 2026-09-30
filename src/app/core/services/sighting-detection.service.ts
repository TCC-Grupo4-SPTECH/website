import { Injectable } from '@angular/core';

export interface DetectionResponse {
  arara_presente: boolean;
  url_s3: string;
}

export interface DetectionResult {
  recognized: boolean;
  label: string;
  processedImageUrl: string | null;
}

@Injectable({ providedIn: 'root' })
export class SightingDetectionService {
  async detect(file: File): Promise<DetectionResult> {
    const formData = new FormData();

    ['file', 'image', 'imagem'].forEach((fieldName) => {
      formData.append(fieldName, file, file.name);
    });

    const response = await fetch('/detectar', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao detectar a imagem: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: DetectionResponse = await response.json();

    return {
      recognized: Boolean(data.arara_presente),
      label: data.arara_presente ? 'Arara-Azul reconhecida' : 'Arara-Azul não identificada',
      processedImageUrl: data.url_s3?.trim() ? data.url_s3 : null,
    };
  }
}
