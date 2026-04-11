import type { ContextLike, IToolStack } from "../path-controller/controller/controller_abstract";
export interface IContextBase<AppState = any, TS extends IToolStack = IToolStack> extends ContextLike<AppState, TS> {
    state: AppState;
}
//# sourceMappingURL=context_base.d.ts.map