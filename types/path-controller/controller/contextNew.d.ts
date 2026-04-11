export type PropertyLoader = (ctx: any, key: string | number | symbol, data: any) => any;
export type PropertySaver = (ctx: any, key: string | number | symbol, existing: any) => any;
type CtxAny = any;
export declare function toLockedImpl(this: any): any;
export interface ILockableCtx {
    /** use toLockedImpl, e.g. toLocked = toLockedImpl */
    toLocked: () => CtxAny;
    /** default property serializer */
    saveProperty?: PropertySaver;
    /** default property deserializer */
    loadProperty?: PropertyLoader;
}
export {};
//# sourceMappingURL=contextNew.d.ts.map