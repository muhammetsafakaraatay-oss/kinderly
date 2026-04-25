declare module 'qrcode' {
  export type QRCodeToStringOptions = {
    type?: 'svg' | 'utf8' | 'terminal'
    width?: number
    margin?: number
    color?: {
      dark?: string
      light?: string
    }
  }

  const QRCode: {
    toString(value: string, options?: QRCodeToStringOptions): Promise<string>
  }

  export default QRCode
}
