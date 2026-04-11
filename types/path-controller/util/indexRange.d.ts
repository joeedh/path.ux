type Enumerate<N extends number, Acc extends number[] = []> = Acc["length"] extends N ? Acc[number] : Enumerate<N, [...Acc, Acc["length"]]>;
export declare function IndexRange<LEN extends number>(len: LEN): Iterable<Enumerate<LEN>>;
export {};
//# sourceMappingURL=indexRange.d.ts.map