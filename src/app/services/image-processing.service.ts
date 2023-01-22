import {Injectable} from '@angular/core';
import {ImageMatrix} from '../model/image-classes.model';

enum IterationState {
  First,
  Second,
  Third
}

@Injectable({
  providedIn: 'root'
})
export class ImageProcessingService {

  private readonly M: number[] = [
    1, 1, 1,
    1, 2, 1,
    1, 1, 1
  ];
  private readonly K: number = 0.1;

  private readonly A: number = 0;
  private readonly B: number = 1;

  private changes = 0;

  constructor() {
  }

  public getBrightnessSectionImageMatrix(iData: ImageData, p1: number, p2: number): ImageMatrix {
    const data = iData.data;
    const pixels: { value: number, color: string }[] = [];

    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = data.slice(i, i + 3);
      // r,g,b - 0-255
      const val = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
      pixels.push({
        color: ('#' + this.hex(r) + this.hex(g) + this.hex(b)),
        value: val
      });
    }

    const colors: string[] = [];
    pixels.forEach(value => {
      if (value.value < p1 || value.value > p2) {
        colors.push(value.color);
      } else {
        colors.push('#FFFFFF'); // - максимальная в серых тонах
      }
    });

    return  new ImageMatrix(iData.width, iData.height, colors);
  }

  public getGrayscaleImageMatrix(iData: ImageData): ImageMatrix {
    const data = iData.data;
    const pixels: string[] = [];

    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = data.slice(i, i + 3);
      const y = this.hex(Math.floor(0.299 * r + 0.587 * g + 0.114 * b));
      pixels.push('#' + y + y + y);
    }

    return new ImageMatrix(iData.width, iData.height, pixels);
  }

  public getMaskFiltrationImageMatrix(iData: ImageData): ImageMatrix {
    const data = iData.data;
    const pixels: { value: number, object: { r: number, g: number, b: number } }[] = [];

    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = data.slice(i, i + 3);
      const val = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
      pixels.push({
        value: val,
        object: {r, b, g}
      });
    }

    const objPicture = new ImageMatrix(iData.width, iData.height, pixels.map(value => value.object));
    const valPicture = new ImageMatrix(iData.width, iData.height, pixels.map(value => value.value));
    const matrix = new ImageMatrix(3, 3, this.M);

    const newPixels = [];

    for (let y = 0; y < valPicture.height; y++) {
      for (let x = 0; x < valPicture.width; x++) {
        const deltaBr = this.A + this.B * this.getSum(1, valPicture, matrix, x, y) - valPicture.getPixel(x, y); // - valPicture - резкость и цветность
        const obj = objPicture.getPixel(x, y);
        newPixels.push('#' + this.hex(obj.r + deltaBr) + this.hex(obj.g + deltaBr) + this.hex(obj.b + deltaBr));
      }
    }

    return new ImageMatrix(iData.width, iData.height, newPixels);
  }

  public getLineZSImageMatrix(iData: ImageData): ImageMatrix {
    const data = iData.data;
    const pixels: {
      value: number,
      object: { r: number, g: number, b: number }
    }[] = [];

    const bottom = 15;

    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = data.slice(i, i + 3);
      pixels.push({
        value: (r <= bottom && b <= bottom && b <= bottom) ? 1 : 0,
        object: {r, g, b}
      });
    }


    let picture = new ImageMatrix(
      iData.width,
      iData.height,
      pixels.map(value => value.value)
    );
    let newPixels: number[]

    do {
      this.changes = 0;
      const picture2 = new ImageMatrix(
        iData.width,
        iData.height,
        this.iteration(picture, IterationState.First)
      );

      newPixels = this.iteration(picture2, IterationState.Second);
      picture = new ImageMatrix(iData.width, iData.height, newPixels);

      // Можно выводить шаги
    }
    while (this.changes !== 0);

    return new ImageMatrix(iData.width, iData.height,  this.getPictureWB(newPixels))
  }

  public hex(n: string | number): string {
    return n.toString(16).padStart(2, '0');
  }

  public drawPicture(canvas: HTMLCanvasElement, picture: ImageMatrix): void {
    const cx = canvas.getContext('2d');
    for (let y = 0; y < picture.height; y++) {
      for (let x = 0; x < picture.width; x++) {
        cx.fillStyle = picture.getPixel(x, y);
        cx.fillRect(x, y, 1, 1);
      }
    }
  }

  private getSum(N: number, picture: ImageMatrix, matrix: ImageMatrix, x: number, y: number): number {
    let sum = 0;

    for (let i = -N; i <= N; i++) {
      for (let j = -N; j <= N; j++) {
        if (picture.isPixel(x + i, y + j)) {
          sum += this.K * picture.getPixel(x + i, y + j) * matrix.getPixel(i + N, j + N);
        } else {
          sum += this.K * 255 * matrix.getPixel(i + N, j + N);
        }
      }
    }

    return Math.floor(sum);
  }

  private iteration(picture: ImageMatrix, iter: IterationState): number[] {
    const pixels = [];

    for (let y = 0; y < picture.height; y++) {
      for (let x = 0; x < picture.width; x++) {
        pixels.push(this.getValue(x, y, picture, iter));
      }
    }

    return pixels;
  }

  private getValue(x: number, y: number, picture: ImageMatrix, iter: IterationState): number {
    if (picture.getPixel(x, y) === 0) {
      return 0;
    }

    let b1, b2, b3, b4;

    const mat = [
      [] = [picture.isPixel(x - 1, y - 1) ? picture.getPixel(x - 1, y - 1) : 0,
        picture.isPixel(x - 1, y) ? picture.getPixel(x - 1, y) : 0,
        picture.isPixel(x - 1, y + 1) ? picture.getPixel(x - 1, y + 1) : 0],

      [] = [picture.isPixel(x, y - 1) ? picture.getPixel(x, y - 1) : 0,
        picture.isPixel(x, y) ? picture.getPixel(x, y) : 0,
        picture.isPixel(x, y + 1) ? picture.getPixel(x, y + 1) : 0],

      [] = [picture.isPixel(x + 1, y - 1) ? picture.getPixel(x + 1, y - 1) : 0,
        picture.isPixel(x + 1, y) ? picture.getPixel(x + 1, y) : 0,
        picture.isPixel(x + 1, y + 1) ? picture.getPixel(x + 1, y + 1) : 0]
    ];

    // Условия с) d)
    if (iter === IterationState.First) {
      if (mat[0][1] * mat[1][2] * mat[2][1] === 0) {
        b1 = true;
      }

      if (mat[1][2] * mat[2][1] * mat[1][0] === 0) {
        b2 = true;
      }
    } else {
      if (mat[0][1] * mat[1][2] * mat[1][0] === 0) {
        b1 = true;
      }

      if (mat[0][1] * mat[2][1] * mat[1][0] === 0) {
        b2 = true;
      }
    }

    // B(P1)
    const v = mat[0][1] + mat[0][2] + mat[1][2] + mat[2][2] + mat[2][1] + mat[2][0] + mat[1][0] + mat[0][0];

    if (v >= 2 && v <= 6) {
      b3 = true;
    }

    // Число 01 - A(P1)
    if (this.get01Count(mat) === 1) {
      b4 = true;
    }

    if (b1 && b2 && b3 && b4) {
      this.changes++;
      return 0;
    }

    return 1;

  }

  private get01Count(mat: number[][]): number {
    let n = 0;

    if (('' + mat[0][1] + mat[0][2]) === '01') {
      n++;
    }
    if ('' + mat[0][2] + mat[1][2] === '01') {
      n++;
    }
    if (('' + mat[1][2] + mat[2][2]) === '01') {
      n++;
    }
    if (('' + mat[2][2] + mat[2][1]) === '01') {
      n++;
    }
    if (('' + mat[2][1] + mat[2][0]) === '01') {
      n++;
    }
    if (('' + mat[2][0] + mat[1][0]) === '01') {
      n++;
    }
    if (('' + mat[1][0] + mat[0][0]) === '01') {
      n++;
    }
    if (('' + mat[0][0] + mat[0][1]) === '01') {
      n++;
    }
    return n;
  }

  public getBrightness(iData: ImageData): { min: number, max: number } {

    const data = iData.data;
    const pixels = [];

    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = data.slice(i, i + 3);
      const val = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
      pixels.push(val);
    }

    return {min: Math.min(...pixels), max: Math.max(...pixels)};
  }

  private getPictureWB(pixelsWB): string[] {
    return pixelsWB.map(value => {
      if (value === 1) {
        return '#000000';
      } else {
        return '#FFFFFF';
      }
    });

  }
}

/*
      IterationState.Third -> Не достаточно условий, профит малый
      const c1 = mat[0][0] === 1 ? 0 : 1;
      const c2 = mat[2][2] === 1 ? 0 : 1;
      const c3 = mat[0][2] === 1 ? 0 : 1;
      const c4 = mat[2][0] === 1 ? 0 : 1;

      if (c1 * mat[1][2] * mat[2][1] === 1) {
        return 0;
      }
      if (c2 * mat[1][0] * mat[0][1] === 1) {
        return 0;
      }
      if (c3 * mat[2][1] * mat[1][0] === 1) {
        return 0;
      }
      if (c4 * mat[0][1] * mat[1][2] === 1) {
        return 0;
      }
 */



