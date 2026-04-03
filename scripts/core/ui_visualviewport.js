import {cachering} from '../util/util.js'
import {Vector2} from '../path-controller/controller.js'

const toRets = cachering.fromConstructor(Vector2, 512)
const fromRets = cachering.fromConstructor(Vector2, 512)

export function toVisualViewport(x, y, includeScale = false) {
    const co = toRets.next().loadXY(x, y)

    if (includeScale) {
        co[0] += window.scrollX;
        co[1] += window.scrollY;
    }
    co[0] -= visualViewport.offsetLeft*visualViewport.scale
    co[1] -= visualViewport.offsetTop*visualViewport.scale
    return co
}
export function fromVisualViewport(x, y, includeScale = false) {
    const co = fromRets.next().loadXY(x, y)

    co[0] += visualViewport.offsetLeft*visualViewport.scale
    co[1] += visualViewport.offsetTop*visualViewport.scale
    if (includeScale) {
        co[0] -= window.scrollX;
        co[1] -= window.scrollY;
    }
    return co
}