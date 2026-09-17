import { INLINE_WIDGET_MAX_SOURCE } from "../widget_codec";
import type { Extension, Options, Token } from "mdast-util-from-markdown";
import type { Literal } from "mdast";

export interface InlineWidget extends Literal {
  type: "inlineWidget";
}

declare module "mdast" {
  interface PhrasingContentMap {
    inlineWidget: InlineWidget;
  }
  interface RootContentMap {
    inlineWidget: InlineWidget;
  }
}

/** Recognizes raw tokens before Markdown escape and character-reference decoding. */
export const inlineWidgetSyntax: NonNullable<Options["extensions"]>[number] = {
  text: {
    123: {
      name: "inlineWidget",
      tokenize(effects, ok, nok) {
        // Extension token names are open at runtime; the dependency's union is closed
        const type = "inlineWidget" as Token["type"];
        const prefix = "{{pathux-widget-v";
        let index = 0;
        let length = 0;
        let digits = 0;
        const consume = (code: number) => {
          effects.consume(code);
          length++;
        };
        const start: typeof ok = (code) => {
          if (index === 0) effects.enter(type);
          if (code !== prefix.charCodeAt(index)) return nok(code);
          consume(code);
          return ++index === prefix.length ? version : start;
        };
        const version: typeof ok = (code) => {
          if (code === null || length >= INLINE_WIDGET_MAX_SOURCE) return nok(code);
          if (code >= 48 && code <= 57) {
            digits++;
            consume(code);
            return version;
          }
          if (code !== 58 || !digits) return nok(code);
          consume(code);
          return body;
        };
        const body: typeof ok = (code) => {
          if (code === null || length > INLINE_WIDGET_MAX_SOURCE - 2) return nok(code);
          if (code === 125) {
            consume(code);
            return close;
          }
          if (code < 0 || !/[A-Za-z0-9%_.~-]/.test(String.fromCharCode(code))) return nok(code);
          consume(code);
          return body;
        };
        const close: typeof ok = (code) => {
          if (code !== 125) return nok(code);
          consume(code);
          effects.exit(type);
          return ok;
        };
        return start;
      },
    },
  },
};

export const inlineWidgetFromMarkdown: Extension = {
  enter: {
    inlineWidget(token) {
      this.enter({ type: "inlineWidget", value: this.sliceSerialize(token) }, token);
    },
  },
  exit: {
    inlineWidget(token) {
      this.exit(token);
    },
  },
};
