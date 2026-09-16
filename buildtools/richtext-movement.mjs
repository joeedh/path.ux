import { chromium, firefox } from "@playwright/test";

for (const [name, type] of Object.entries({ chromium, firefox })) {
  const browser = await type.launch();
  const page = await browser.newPage();
  console.log(
    name,
    await page.evaluate(async () => {
      const root = document.createElement("div");
      document.body.append(root);
      root.innerHTML = '<div><input><iframe srcdoc="local fixture"></iframe></div><div></div>';
      const [a, b] = root.children;
      const input = a.firstChild;
      const frame = a.lastChild;
      await new Promise((resolve) => (frame.onload = resolve));
      const initial = frame.contentDocument;
      input.focus();
      input.value = "draft";
      input.setSelectionRange(2, 2);
      const supported = typeof b.moveBefore === "function";
      if (supported) {
        b.moveBefore(input, null);
        b.moveBefore(frame, null);
      }
      const retained = {
        focus    : document.activeElement === input,
        selection: input.selectionStart,
        frame    : initial === frame.contentDocument,
      };
      a.append(input, frame);
      await new Promise((resolve) => setTimeout(resolve, 100));
      return {
        supported,
        retained,
        append: {
          focus: document.activeElement === input,
          frame: initial === frame.contentDocument,
        },
      };
    })
  );
  await browser.close();
}
