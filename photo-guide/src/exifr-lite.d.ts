declare module 'exifr/dist/lite.esm.mjs' {
  export function parse(
    data: Blob | ArrayBuffer | Uint8Array,
    options?: { chunked?: boolean },
  ): Promise<Record<string, unknown> | undefined>
}
