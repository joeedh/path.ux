/**
 * `FormControl`'s stylesheet, carried inside the form so it reads the same in any host. Every
 * selector is wrapped in `:where()`, so a host rule on the same class wins without `!important`.
 */
export function formStyles(): string {
  return `
    :where(.schema-form) {
      display       : flex;
      flex-direction: column;
      gap           : 6px;
      padding       : 8px;
      min-width     : 260px;
    }
    :where(.schema-form-row) {
      display    : flex;
      align-items: center;
      gap        : 6px;
      flex-wrap  : wrap;
    }
    :where(.schema-form-label) { flex: 0 0 105px; }
    :where(.schema-form-row) > :where(textbox-x) { box-shadow: inset 0 0 0 1px #888; }
  `;
}
