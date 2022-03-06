import {AreaFlags} from "../screen/ScreenArea.js";
import {keymap} from "../path-controller/util/simple_events.js";

export function makePopupArea(area_class, screen, args={}) {
  let sarea = UIBase.createElement("screenarea-x");

  let width = args.width || (screen.size[0]*0.7);
  let height = args.height || (screen.size[1]*0.7);
  let addEscapeKeyHandler = args.addEscapeKeyHandler !== undefined ? args.addEscapeKeyHandler : true;

  sarea.ctx = screen.ctx;
  sarea.size[0] = width;
  sarea.size[1] = height;
  sarea.pos[0] = 100;
  sarea.pos[1] = 100;

  sarea.pos[0] = Math.min(sarea.pos[0], screen.size[0] - sarea.size[0] - 2);
  sarea.pos[1] = Math.min(sarea.pos[1], screen.size[1] - sarea.size[1] - 2);

  sarea.switch_editor(area_class);

  sarea.overrideClass("popup");
  sarea.style["background-color"] = sarea.getDefault("background-color");
  sarea.style["border-radius"] = sarea.getDefault("border-radius") + "px";
  sarea.style["border-color"] = sarea.getDefault("border-color");
  sarea.style["border-style"] = sarea.getDefault("border-style");
  sarea.style["border-width"] = sarea.getDefault("border-width") + "px";

  sarea.flag |= AreaFlags.FLOATING | AreaFlags.INDEPENDENT;

  screen.appendChild(sarea);
  sarea.setCSS();

  if (addEscapeKeyHandler) {
    sarea.on_keydown = (e) => {
      if (e.keyCode === keymap.Escape) {
        screen.removeArea(sarea);
      }
    }
  }

  sarea.bringToFront();

  return sarea;
}