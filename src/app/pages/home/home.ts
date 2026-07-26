import { Component, OnDestroy, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DetectionResult, SightingDetectionService } from '../../core/services/sighting-detection.service';
import { SightingService } from '../../core/services/sighting.service';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png'];

type Stage = 'upload' | 'detecting' | 'result';

@Component({
  selector: 'app-home',
  imports: [ReactiveFormsModule, MatDatepickerModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnDestroy {
  protected readonly isDraggingOver = signal(false);
  protected readonly stage = signal<Stage>('upload');
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly detection = signal<DetectionResult | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly submitted = signal(false);

  protected readonly sightingForm = new FormGroup({
    latitude: new FormControl<number | null>(null, Validators.required),
    longitude: new FormControl<number | null>(null, Validators.required),
    date: new FormControl<Date | null>(null, Validators.required),
  });

  private selectedFile: File | null = null;

  constructor(
    private readonly detectionService: SightingDetectionService,
    private readonly sightingService: SightingService,
  ) {}

  ngOnDestroy(): void {
    this.revokePreview();
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver.set(false);
    this.handleFileList(event.dataTransfer?.files ?? null);
  }

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.handleFileList(input.files);
    input.value = '';
  }

  protected async onSubmit(): Promise<void> {
    if (this.sightingForm.invalid || !this.selectedFile) {
      this.sightingForm.markAllAsTouched();
      return;
    }

    const { latitude, longitude, date } = this.sightingForm.getRawValue();
    this.isSubmitting.set(true);
    await this.sightingService.submit({
      file: this.selectedFile,
      latitude: latitude!,
      longitude: longitude!,
      date: date!,
    });
    this.isSubmitting.set(false);
    this.submitted.set(true);
    setTimeout(() => this.reset(), 1500);
  }

  protected reset(): void {
    this.revokePreview();
    this.selectedFile = null;
    this.detection.set(null);
    this.submitted.set(false);
    this.sightingForm.reset();
    this.stage.set('upload');
  }

  private handleFileList(fileList: FileList | null): void {
    const file = fileList ? Array.from(fileList).find((f) => ACCEPTED_TYPES.includes(f.type)) : undefined;
    if (!file) return;

    this.revokePreview();
    this.selectedFile = file;
    this.previewUrl.set(URL.createObjectURL(file));
    this.detection.set(null);
    this.stage.set('detecting');

    this.detectionService.detect(file).then((result) => {
      this.detection.set(result);
      this.stage.set('result');
    });
  }

  private revokePreview(): void {
    const current = this.previewUrl();
    if (current) URL.revokeObjectURL(current);
  }
}
