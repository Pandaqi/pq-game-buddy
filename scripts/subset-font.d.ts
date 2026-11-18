/**
 * `subset-font` ships no types and is a development dependency used by one script
 * (`fonts-cjk.ts`), so the one signature that script needs is declared here rather than
 * pulling a type package in for it.
 */
declare module 'subset-font' {
  interface SubsetOptions {
    targetFormat?: 'sfnt' | 'woff' | 'woff2' | 'truetype';
    preserveNameIds?: number[];
    variationAxes?: Record<string, { min?: number; max?: number; default?: number }>;
  }
  export default function subsetFont(
    source: Buffer | Uint8Array,
    text: string,
    options?: SubsetOptions,
  ): Promise<Buffer>;
}
