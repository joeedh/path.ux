---
description: Refactor a JavaScript file to TypeScript following path.ux conventions
---

This workflow defines the steps to systematically refactor typical JS files in this workspace into TS files. 

0. **Read CLAUDE.md**
1. **Analyze the target file**
   - Read the `.js` file the user specifies.
   - Identify dependencies, exports, and core classes.
   - Look specifically for usages of `Vector`, `UIBase` widgets, and `ToolOp` classes.

2. **Convert semantics to TypeScript using path.ux rules**
   - **File rename**: Rename the `.js` file to `.ts` in the `scripts/` directory. Keep any internal import paths consistent with the project's current module resolution strategy (`"type": "module"` implies imports may keep `.js` extensions even if the underlying file is `.ts`).
   - **Type Inference**: **Do not** add type annotations if types can be inferred automatically by the TypeScript compiler.
   - **Strict Types**: Absolutely **no `any`** usage. The only exception is directly at `JSON.parse` boundaries, which must be immediately narrowed.
   - **Vector Classes**: Remember vectors do not have a simple string-to-number index signature beyond `LEN`. Use `IndexRange(length)` for iteration (e.g. `for (const i of IndexRange(3))`) rather than a standard for-loop, or cast the index using `as Number3` (or similar).
   - **UIBase Components**: Any class inheriting from `UIBase` MUST take a `CTX` generic parameter that extends `IContextBase` and defaults to it: `class MyWidget<CTX extends IContextBase = IContextBase> extends UIBase<CTX>`. 
   - **Widget Values**: If a widget implements `getValue`, you must provide the type to the second generic slot of `UIBase`. Example: `extends UIBase<CTX, number>`.
   - **ToolOp Definitions**: Strongly typed Property System. Any `ToolOp` you translate must have its outputs and inputs correspondingly typed in the class generics (e.g. `class Tool extends ToolOp<{input1: FloatProperty}, {output1: StringProperty}>`). The generic interfaces must perfectly match the literal properties returned in the static `tooldef()` method. See `CLAUDE.md` for proper inheritance examples and nested intersections.

3. **Replace and Move the File**
   - Create the new `.ts` file content.
   - Delete the old `.js` file if writing a new file, or gracefully transition the file extensions if using terminal commands or git mv.

4. **Verify correctness**
   - Run type checking:
     // turbo
     ```bash
     npm run typecheck
     ```
   - Re-format the modified files to pass styling:
     // turbo
     ```bash
     npm run format
     ```
   - Iteratively check if errors arise from your changes. If there are typecheck errors in the file that was just converted, fix them immediately.

5. **Report to User**
   - Summarize the final structural changes that were made (especially concerning `UIBase`, `Vector` iterations, `ToolOp`, and `any` fixes) in a response or artifact.