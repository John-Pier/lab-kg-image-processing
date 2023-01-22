export class ImagePoint {
  public xValue: number;
  public yValue: number;

  constructor(xValue: number, yValue: number) {
    this.xValue = xValue;
    this.yValue = yValue;
  }
}

export interface ImagePixel {
  x: number;
  y: number;
  color: string;
}

export class ImageMatrix {

  public height: number;
  public width: number;

  private readonly image: any[];

  constructor(width: number, height: number, image: any[]) {
    this.height = height;
    this.width = width;
    this.image = image;
  }

  public getPixel(x: number, y: number): any {
    return this.image[x + y * this.width];
  }

  public isPixel(x: number, y: number): boolean {
    const value = x + y * this.width;
    return !(value >= this.image.length || value < 0);
  }

  public drawPixels(pixels: ImagePixel[]): ImageMatrix {
    const copy = this.image.slice();

    pixels.forEach(value => {
      copy[value.x + value.y * this.width] = value.color;
    });

    return new ImageMatrix(this.width, this.height, copy);
  }
}
