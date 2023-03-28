import ErrorCorrectLevel from "./ErrorCorrectLevel";
import QRData from "./QRData";
import QR8BitByte from "./QR8BitByte";
import QRUtil from './QRUtil';
import BitBuffer from "./BitBuffer";
import RSBlock from "./RSBlock";
import Polynomial from "./Polynomial";
import stringToBytes_SJIS from "../text/stringToBytes_SJIS";
import GIFImage from "../image/GIFImage";

export default class QRCode {
  private static PAD0 = 0xEC;

  private static PAD1 = 0x11;

  private typeNumber: number = 1;

  private errorCorrectLevel: ErrorCorrectLevel = ErrorCorrectLevel.L;

  private qrDataList: QRData[] = [];

  private modules: boolean[][] = [];

  private moduleCount: number = 0;

  public constructor() {
  }

  public getTypeNumber(): number {
    return this.typeNumber;
  }

  public setTypeNumber(typeNumber: number): void {
    this.typeNumber = typeNumber;
  }

  public getErrorCorrectLevel(): ErrorCorrectLevel {
    return this.errorCorrectLevel;
  }

  public setErrorCorrectLevel(errorCorrectLevel: ErrorCorrectLevel) {
    this.errorCorrectLevel = errorCorrectLevel;
  }

  public clearData(): void {
    this.qrDataList = [];
  }

  public addData(qrData: QRData | string): void {
    if (qrData instanceof QRData) {
      this.qrDataList.push(qrData);
    } else if (typeof qrData === 'string') {
      this.qrDataList.push(new QR8BitByte(qrData));
    } else {
      throw typeof qrData;
    }
  }

  private getDataCount(): number {
    return this.qrDataList.length;
  }

  private getData(index: number): QRData {
    return this.qrDataList[index];
  }

  public isDark(row: number, col: number): boolean {
    if (this.modules[row][col] != null) {
      return this.modules[row][col];
    } else {
      return false;
    }
  }

  public getModuleCount(): number {
    return this.moduleCount;
  }

  public make(): void {
    this.makeImpl(false, this.getBestMaskPattern());
  }

  private getBestMaskPattern(): number {

    let minLostPoint = 0;
    let pattern = 0;

    for (let i = 0; i < 8; i += 1) {

      this.makeImpl(true, i);

      const lostPoint = QRUtil.getLostPoint(this);

      if (i == 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        pattern = i;
      }
    }

    return pattern;
  }

  private makeImpl(test: boolean, maskPattern: number): void {

    // initialize modules
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = [];
    for (let i = 0; i < this.moduleCount; i += 1) {
      this.modules.push([]);
      for (let j = 0; j < this.moduleCount; j += 1) {
        this.modules[i].push(null!);
      }
    }

    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);

    this.setupPositionAdjustPattern();
    this.setupTimingPattern();

    this.setupTypeInfo(test, maskPattern);

    if (this.typeNumber >= 7) {
      this.setupTypeNumber(test);
    }

    var data = QRCode.createData(
      this.typeNumber, this.errorCorrectLevel, this.qrDataList);
    this.mapData(data, maskPattern);
  }

  private mapData(data: number[], maskPattern: number): void {

    let inc = -1;
    let row = this.moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;
    const maskFunc = QRUtil.getMaskFunc(maskPattern);

    for (let col = this.moduleCount - 1; col > 0; col -= 2) {

      if (col == 6) {
        col -= 1;
      }

      while (true) {

        for (let c = 0; c < 2; c += 1) {

          if (this.modules[row][col - c] == null) {

            let dark = false;

            if (byteIndex < data.length) {
              dark = (((data[byteIndex] >>> bitIndex) & 1) == 1);
            }

            const mask = maskFunc(row, col - c);

            if (mask) {
              dark = !dark;
            }

            this.modules[row][col - c] = dark;
            bitIndex -= 1;

            if (bitIndex == -1) {
              byteIndex += 1;
              bitIndex = 7;
            }
          }
        }

        row += inc;

        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }

  private setupPositionAdjustPattern(): void {

    const pos = QRUtil.getPatternPosition(this.typeNumber);

    for (let i = 0; i < pos.length; i += 1) {
      for (let j = 0; j < pos.length; j += 1) {

        const row = pos[i];
        const col = pos[j];

        if (this.modules[row][col] != null) {
          continue;
        }

        for (let r = -2; r <= 2; r += 1) {

          for (let c = -2; c <= 2; c += 1) {

            this.modules[row + r][col + c] = r == -2 || r == 2 || c == -2 || c == 2
              || (r == 0 && c == 0);
          }
        }
      }
    }
  }

  private setupPositionProbePattern(row: number, col: number): void {

    for (let r = -1; r <= 7; r += 1) {

      for (let c = -1; c <= 7; c += 1) {

        if (row + r <= -1 || this.moduleCount <= row + r || col + c <= -1 || this.moduleCount <= col + c) {
          continue;
        }

        this.modules[row + r][col + c] = (0 <= r && r <= 6 && (c == 0 || c == 6))
          || (0 <= c && c <= 6 && (r == 0 || r == 6))
          || (2 <= r && r <= 4 && 2 <= c && c <= 4);
      }
    }
  }

  private setupTimingPattern(): void {
    for (let r = 8; r < this.moduleCount - 8; r += 1) {
      if (this.modules[r][6] != null) {
        continue;
      }
      this.modules[r][6] = r % 2 == 0;
    }
    for (let c = 8; c < this.moduleCount - 8; c += 1) {
      if (this.modules[6][c] != null) {
        continue;
      }
      this.modules[6][c] = c % 2 == 0;
    }
  }

  private setupTypeNumber(test: boolean): void {

    const bits = QRUtil.getBCHTypeNumber(this.typeNumber);

    for (let i = 0; i < 18; i += 1) {
      this.modules[~~(i / 3)][i % 3 + this.moduleCount - 8 - 3] =
        !test && ((bits >> i) & 1) == 1;
    }

    for (let i = 0; i < 18; i += 1) {
      this.modules[i % 3 + this.moduleCount - 8 - 3][~~(i / 3)] =
        !test && ((bits >> i) & 1) == 1;
    }
  }

  private setupTypeInfo(test: boolean, maskPattern: number): void {

    const data = (this.errorCorrectLevel << 3) | maskPattern;
    const bits = QRUtil.getBCHTypeInfo(data);

    // vertical
    for (let i = 0; i < 15; i += 1) {

      let mod = !test && ((bits >> i) & 1) == 1;

      if (i < 6) {
        this.modules[i][8] = mod;
      } else if (i < 8) {
        this.modules[i + 1][8] = mod;
      } else {
        this.modules[this.moduleCount - 15 + i][8] = mod;
      }
    }

    // horizontal
    for (let i = 0; i < 15; i += 1) {

      let mod = !test && ((bits >> i) & 1) == 1;

      if (i < 8) {
        this.modules[8][this.moduleCount - i - 1] = mod;
      } else if (i < 9) {
        this.modules[8][15 - i - 1 + 1] = mod;
      } else {
        this.modules[8][15 - i - 1] = mod;
      }
    }

    // fixed
    this.modules[this.moduleCount - 8][8] = !test;
  }

  public static createData(
    typeNumber: number,
    errorCorrectLevel: ErrorCorrectLevel,
    dataArray: QRData[]
  ): number[] {

    const rsBlocks: RSBlock[] = RSBlock.getRSBlocks(
      typeNumber, errorCorrectLevel);

    const buffer = new BitBuffer();

    for (let i = 0; i < dataArray.length; i += 1) {
      const data = dataArray[i];
      buffer.put(data.getMode(), 4);
      buffer.put(data.getLength(), data.getLengthInBits(typeNumber));
      data.write(buffer);
    }

    // calc max data count
    let totalDataCount = 0;
    for (let i = 0; i < rsBlocks.length; i += 1) {
      totalDataCount += rsBlocks[i].getDataCount();
    }

    if (buffer.getLengthInBits() > totalDataCount * 8) {
      throw 'code length overflow. ('
      + buffer.getLengthInBits()
      + '>'
      + totalDataCount * 8
      + ')';
    }

    // end
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
      buffer.put(0, 4);
    }

    // padding
    while (buffer.getLengthInBits() % 8 != 0) {
      buffer.putBit(false);
    }

    // padding
    while (true) {

      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break;
      }
      buffer.put(QRCode.PAD0, 8);

      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break;
      }
      buffer.put(QRCode.PAD1, 8);
    }

    return QRCode.createBytes(buffer, rsBlocks);
  }

  private static createBytes(
    buffer: BitBuffer,
    rsBlocks: RSBlock[]
  ): number[] {

    let offset = 0;

    let maxDcCount = 0;
    let maxEcCount = 0;

    const dcdata: number[][] = [];
    const ecdata: number[][] = [];

    for (let r = 0; r < rsBlocks.length; r += 1) {
      dcdata.push([]);
      ecdata.push([]);
    }

    function createNumArray(len: number): number[] {
      const a: number[] = [];
      for (let i = 0; i < len; i += 1) {
        a.push(0);
      }
      return a;
    }

    for (let r = 0; r < rsBlocks.length; r += 1) {

      const dcCount = rsBlocks[r].getDataCount();
      const ecCount = rsBlocks[r].getTotalCount() - dcCount;

      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);

      dcdata[r] = createNumArray(dcCount);
      for (let i = 0; i < dcdata[r].length; i += 1) {
        dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
      }
      offset += dcCount;

      const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
      const rawPoly = new Polynomial(dcdata[r], rsPoly.getLength() - 1);

      const modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = createNumArray(rsPoly.getLength() - 1);
      for (let i = 0; i < ecdata[r].length; i += 1) {
        const modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = (modIndex >= 0) ? modPoly.getAt(modIndex) : 0;
      }
    }

    let totalCodeCount = 0;
    for (let i = 0; i < rsBlocks.length; i += 1) {
      totalCodeCount += rsBlocks[i].getTotalCount();
    }

    const data = createNumArray(totalCodeCount);
    let index = 0;

    for (let i = 0; i < maxDcCount; i += 1) {
      for (let r = 0; r < rsBlocks.length; r += 1) {
        if (i < dcdata[r].length) {
          data[index] = dcdata[r][i];
          index += 1;
        }
      }
    }

    for (let i = 0; i < maxEcCount; i += 1) {
      for (let r = 0; r < rsBlocks.length; r += 1) {
        if (i < ecdata[r].length) {
          data[index] = ecdata[r][i];
          index += 1;
        }
      }
    }
    return data;
  }

  public toDataURL(cellSize = 2, margin = cellSize * 4): string {
    const mods = this.getModuleCount();
    const size = cellSize * mods + margin * 2;
    const gif = new GIFImage(size, size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (margin <= x && x < size - margin &&
          margin <= y && y < size - margin &&
          this.isDark(
            ~~((y - margin) / cellSize),
            ~~((x - margin) / cellSize))) {
          gif.setPixel(x, y, 0);
        } else {
          gif.setPixel(x, y, 1);
        }
      }
    }
    return gif.toDataURL();
  }

  // by default, SJIS encoding is applied.
  public static stringToBytes = stringToBytes_SJIS;
}
