import { Component, signal } from '@angular/core';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png'];

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly isDraggingOver = signal(false);
  protected readonly selectedFiles = signal<File[]>([]);

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
    this.addFiles(event.dataTransfer?.files ?? null);
  }

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addFiles(input.files);
    input.value = '';
  }

  private addFiles(fileList: FileList | null): void {
    if (!fileList) return;
    const accepted = Array.from(fileList).filter((file) => ACCEPTED_TYPES.includes(file.type));
    this.selectedFiles.update((current) => [...current, ...accepted]);
  }
}
