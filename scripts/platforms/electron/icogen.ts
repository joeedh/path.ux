// @ts-nocheck
"use strict";

/*
 * Ambient type declarations for Node.js APIs used in this Electron-only module.
 * These are declared locally to avoid pulling in @types/node for the whole project.
 */
interface NodeBuffer {
  length: number;
  readUInt8(offset: number): number;
  writeUInt8(value: number, offset: number): void;
  writeUInt16LE(value: number, offset: number): void;
  writeUInt32LE(value: number, offset: number): void;
  writeInt32LE(value: number, offset: number): void;
}

interface PNGImage {
  width: number;
  height: number;
  bpp: number;
  data: NodeBuffer;
}

interface IcoOptions {
  name?: string;
  sizes?: number[];
}

interface NodeWritableStream {
  end(): void;
}

//declare const Buffer: NodeBufferConstructor;
//declare const exports: Record<string, unknown>;

//adapted from icon-gen code
if (window.haveElectron) {
  const fs = require("fs") as { writeFileSync(path: string, data: unknown): void };
  const path = require("path") as { join(...args: string[]): string };
  const pngjsNozlib = require("pngjs-nozlib") as {
    PNG: { sync: { read(data: NodeBuffer): PNGImage } };
  };
  const png = require("pngjs") as unknown;

  const REQUIRED_IMAGE_SIZES = [16, 24, 32, 48, 64, 128, 256];

  const DEFAULT_FILE_NAME = "app";
  const FILE_EXTENSION = ".ico";

  const HEADER_SIZE = 6;

  const DIRECTORY_SIZE = 16;
  const BITMAPINFOHEADER_SIZE = 40;
  const BI_RGB = 0;
  /**
   * Convert a PNG of the byte array to the DIB (Device Independent Bitmap) format.
   * PNG in color RGBA (and more), the coordinate structure is the Top/Left to Bottom/Right.
   * DIB in color BGRA, the coordinate structure is the Bottom/Left to Top/Right.
   * @see https://en.wikipedia.org/wiki/BMP_file_format
   */

  const convertPNGtoDIB = (src: NodeBuffer, width: number, height: number, bpp: number) => {
    const cols = width * bpp;
    const rows = height * cols;
    const rowEnd = rows - cols;
    const dest = Buffer.alloc(src.length);

    for (let row = 0; row < rows; row += cols) {
      for (let col = 0; col < cols; col += bpp) {
        // RGBA: Top/Left -> Bottom/Right
        let pos = row + col;
        const r = src.readUInt8(pos);
        const g = src.readUInt8(pos + 1);
        const b = src.readUInt8(pos + 2);
        const a = src.readUInt8(pos + 3); // BGRA: Right/Left -> Top/Right

        pos = rowEnd - row + col;
        dest.writeUInt8(b, pos);
        dest.writeUInt8(g, pos + 1);
        dest.writeUInt8(r, pos + 2);
        dest.writeUInt8(a, pos + 3);
      }
    }

    return dest;
  };
  /**
   * Create the BITMAPINFOHEADER.
   * @see https://msdn.microsoft.com/ja-jp/library/windows/desktop/dd183376%28v=vs.85%29.aspx
   */

  const createBitmapInfoHeader = (png: PNGImage, compression: number) => {
    const b = Buffer.alloc(BITMAPINFOHEADER_SIZE);
    b.writeUInt32LE(BITMAPINFOHEADER_SIZE, 0); // 4 DWORD biSize

    b.writeInt32LE(png.width, 4); // 4 LONG  biWidth

    b.writeInt32LE(png.height * 2, 8); // 4 LONG  biHeight

    b.writeUInt16LE(1, 12); // 2 WORD  biPlanes

    b.writeUInt16LE(png.bpp * 8, 14); // 2 WORD  biBitCount

    b.writeUInt32LE(compression, 16); // 4 DWORD biCompression

    b.writeUInt32LE(png.data.length, 20); // 4 DWORD biSizeImage

    b.writeInt32LE(0, 24); // 4 LONG  biXPelsPerMeter

    b.writeInt32LE(0, 28); // 4 LONG  biYPelsPerMeter

    b.writeUInt32LE(0, 32); // 4 DWORD biClrUsed

    b.writeUInt32LE(0, 36); // 4 DWORD biClrImportant

    return b;
  };
  /**
   * Create the Icon entry.
   *
   * @see https://msdn.microsoft.com/en-us/library/ms997538.aspx
   */

  const createDirectory = (png: PNGImage, offset: number) => {
    const b = Buffer.alloc(DIRECTORY_SIZE);
    const size = png.data.length + BITMAPINFOHEADER_SIZE;
    const width = 256 <= png.width ? 0 : png.width;
    const height = 256 <= png.height ? 0 : png.height;
    const bpp = png.bpp * 8;
    b.writeUInt8(width, 0); // 1 BYTE  Image width

    b.writeUInt8(height, 1); // 1 BYTE  Image height

    b.writeUInt8(0, 2); // 1 BYTE  Colors

    b.writeUInt8(0, 3); // 1 BYTE  Reserved

    b.writeUInt16LE(1, 4); // 2 WORD  Color planes

    b.writeUInt16LE(bpp, 6); // 2 WORD  Bit per pixel

    b.writeUInt32LE(size, 8); // 4 DWORD Bitmap (DIB) size

    b.writeUInt32LE(offset, 12); // 4 DWORD Offset

    return b;
  };
  /**
   * Create the ICO file header.
   * @see https://msdn.microsoft.com/en-us/library/ms997538.aspx
   */

  const createFileHeader = (count: number) => {
    const b = Buffer.alloc(HEADER_SIZE);
    b.writeUInt16LE(0, 0); // 2 WORD Reserved

    b.writeUInt16LE(1, 2); // 2 WORD Type

    b.writeUInt16LE(count, 4); // 2 WORD Image count

    return b;
  };
  /**
   * Check an option properties.
   */

  const checkOptions = (options: IcoOptions | undefined) => {
    if (options) {
      return {
        name:
          typeof options.name === "string" && options.name !== ""
            ? options.name
            : DEFAULT_FILE_NAME,
        sizes: Array.isArray(options.sizes) ? options.sizes : REQUIRED_IMAGE_SIZES,
      };
    } else {
      return {
        name : DEFAULT_FILE_NAME,
        sizes: REQUIRED_IMAGE_SIZES,
      };
    }
  };
  /**
   * Get the size of the required PNG.
   */

  const GetRequiredICOImageSizes = () => {
    return REQUIRED_IMAGE_SIZES;
  };

  let stream = require("stream") as {
    Writable: { new (): NodeWritableStream; prototype: NodeWritableStream };
  };

  class WriteStream extends (stream.Writable as {
    new (): NodeWritableStream;
    prototype: NodeWritableStream;
  }) {
    data: number[] | NodeBuffer;

    constructor() {
      super();
      this.data = [];
    }

    _write(chunk: NodeBuffer | string, encoding: string, cb: (err: null) => void) {
      let buf: NodeBuffer;

      if (typeof chunk === "string") {
        buf = Buffer.from(chunk, encoding);
      } else {
        buf = chunk;
      }

      for (let i = 0; i < buf.length; i++) {
        (this.data as number[]).push(buf.readUInt8(i));
      }

      cb(null);
    }

    write(data: NodeBuffer, encoding: string): boolean {
      this._write(data, encoding, () => {});
      return true;
    }

    end() {
      this.data = Buffer.from(this.data as number[]);
      super.end();
    }
  }

  exports.GetRequiredICOImageSizes = GetRequiredICOImageSizes;

  const GenerateICO = (
    images: NodeBuffer[],
    logger: { log(...args: unknown[]): void } = console
  ) => {
    logger.log("ICO:");

    const icoStream = new WriteStream();
    icoStream.write(createFileHeader(images.length), "binary");

    const pngs: PNGImage[] = [];
    for (const image of images) {
      pngs.push(pngjsNozlib.PNG.sync.read(image));
    }

    let offset = HEADER_SIZE + DIRECTORY_SIZE * images.length;
    pngs.forEach((png) => {
      const directory = createDirectory(png, offset);
      icoStream.write(directory, "binary");
      offset += png.data.length + BITMAPINFOHEADER_SIZE;
    });
    pngs.forEach((png) => {
      const header = createBitmapInfoHeader(png, BI_RGB);
      icoStream.write(header, "binary");
      const dib = convertPNGtoDIB(png.data, png.width, png.height, png.bpp);
      icoStream.write(dib, "binary");
    });
    icoStream.end();

    return icoStream.data;
    //logger.log('  Create: ' + dest);
    //resolve(dest);
  };

  exports.GenerateICO = GenerateICO;
  const _default = GenerateICO;
  exports.default = _default;
}
