declare const _default: {
    compressToBase64: (input: any) => string;
    decompressFromBase64: (input: any) => string | null;
    compressToUTF16: (input: any) => string;
    decompressFromUTF16: (compressed: any) => string | null;
    compressToUint8Array: (uncompressed: any) => Uint8Array<ArrayBuffer>;
    decompressFromUint8Array: (compressed: any) => string | null;
    compressToEncodedURIComponent: (input: any) => string;
    decompressFromEncodedURIComponent: (input: any) => string | null;
    compress: (uncompressed: any) => string;
    _compress: (uncompressed: any, bitsPerChar: any, getCharFromInt: any) => string;
    decompress: (compressed: any) => string | null;
    _decompress: (length: any, resetValue: any, getNextValue: any) => string | null;
};
export default _default;
//# sourceMappingURL=lz-string.d.ts.map