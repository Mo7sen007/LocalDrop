declare module "@services/qrcode.vendor.js" {
  interface QRCodeInstance {
    addData(data: string, mode?: string): void;
    make(): void;
    createDataURL(cellSize?: number, margin?: number): string;
    createSvgTag(cellSize?: number, margin?: number): string;
  }

  type QRCodeFactory = (typeNumber: number, errorCorrectionLevel: "L" | "M" | "Q" | "H") => QRCodeInstance;

  const qrcode: QRCodeFactory;
  export default qrcode;
}
