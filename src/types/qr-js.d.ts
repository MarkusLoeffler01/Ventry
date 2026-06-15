declare module "qr.js/lib/ErrorCorrectLevel" {
  const ErrorCorrectLevel: {
    L: number;
    M: number;
    Q: number;
    H: number;
  };

  export default ErrorCorrectLevel;
}

declare module "qr.js/lib/QRCode" {
  export default class QRCode {
    modules: boolean[][];

    constructor(typeNumber: number, errorCorrectLevel: number);
    addData(data: string, mode?: string): void;
    make(): void;
  }
}
