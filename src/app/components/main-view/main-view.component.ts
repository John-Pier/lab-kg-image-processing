import { Component, OnInit} from '@angular/core';
import {ImageProcessingService} from '../../services/image-processing.service';

@Component({
  selector: 'app-main-view',
  templateUrl: './main-view.component.html',
  styleUrls: ['./main-view.component.css']
})
export class MainViewComponent implements OnInit {

  private selectedFile: File = null;

  public checked = false;

  img: HTMLImageElement;
  private canvasElement: HTMLCanvasElement;
  private canvasElements: HTMLCanvasElement[] = [];

  private html: HTMLElement;

  public maxWidth = 300;
  public maxHeight = 300;

  public height: number;
  public width: number;

  public borderMin: number;
  public borderMax: number;

  public b1: number;
  public b2: number;

  constructor(private imageProcessing: ImageProcessingService) {
  }

  ngOnInit() {
    this.canvasElement = (document.getElementById('initial') as HTMLCanvasElement);
    for (let i = 1; i < 5; i++) {
      this.canvasElements[i - 1] = (document.getElementById('canvasElement' + i) as HTMLCanvasElement);
    }
    this.html = document.getElementById('content-c');
  }

  public onFileSelected(event) {
    this.selectedFile = (event.target.files[0] as File);
  }

  public onUpload() {
    if (!this.selectedFile) {
      return;
    }

    const reader = new FileReader();

    reader.onload = e => {
      if (!this.img) {
        this.img = new Image();
      }

      this.img.src = (e.target as any).result;
      this.img.onload = () => this.onLoadImage();
    };

    reader.readAsDataURL(this.selectedFile);
  }

  private onLoadImage(image?: HTMLImageElement): void {
    const img = image ? image : this.img;
    this.width = img.width > this.maxWidth ? this.maxWidth : img.width;
    this.height = img.height > this.maxHeight ? this.maxHeight : img.height;

    this.canvasElement.width = this.width;
    this.canvasElement.height = this.height;

    const ctx = this.canvasElement.getContext('2d');
    ctx.drawImage(this.img, 0, 0, img.width, img.height);

    const br = this.imageProcessing.getBrightness(this.canvasElement.getContext('2d').getImageData(0, 0, this.width, this.height));

    this.borderMax = Math.floor(br.max);
    this.borderMin = Math.floor(br.min);
    this.b1 = (this.borderMax - this.borderMin) / 2;
    this.b2 = ((this.borderMax - this.borderMin) / 2 + 30) % 255;
  }

  public start() {
    this.imageProcessing.toGrayscale(
      this.canvasElement.getContext('2d').getImageData(0, 0, this.width, this.height),
      picture => {
        this.imageProcessing.drawPicture(this.canvasElements[0], picture);
      });
    this.imageProcessing.brightnessSection(
      this.canvasElement.getContext('2d').getImageData(0, 0, this.width, this.height),
      picture => {
        this.imageProcessing.drawPicture(this.canvasElements[1], picture);
      },
      this.b1,
      this.b2
    );
    this.imageProcessing.maskFiltration(
      this.canvasElement.getContext('2d').getImageData(0, 0, this.width, this.height),
      picture => {
        this.imageProcessing.drawPicture(this.canvasElements[2], picture);
      });
    if (this.checked) {
      this.html.innerHTML = '';
      this.imageProcessing.lineZS(
        this.canvasElements[0].getContext('2d').getImageData(0, 0, this.width, this.height),
        picture => {
          this.imageProcessing.drawPicture(this.canvasElements[3], picture);
        },
        picture => {
          const canvasStep = (document.createElement('canvas') as HTMLCanvasElement);
          canvasStep.width = this.width;
          canvasStep.height = this.height;
          this.imageProcessing.drawPicture(canvasStep, picture);
          this.html.appendChild(canvasStep);
        }
      );
    }
  }

  public onChange(event: boolean) {
    this.checked = (event as boolean);
  }
}
