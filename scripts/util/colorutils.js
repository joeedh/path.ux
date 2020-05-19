import * as util from '../util/util.js';
import * as vectormath from '../util/vectormath.js';
import cconst from '../config/const.js';

let rgb_to_hsv_rets = new util.cachering(() => [0, 0, 0], 64);

export function rgb_to_hsv (r,g,b) {
    var computedH = 0;
    var computedS = 0;
    var computedV = 0;
  
    if ( r==null || g==null || b==null ||
      isNaN(r) || isNaN(g)|| isNaN(b) ) {
      throw new Error(`Please enter numeric RGB values! r: ${r} g: ${g} b: ${b}`);
      return;
    }
    /*
    if (r<0 || g<0 || b<0 || r>1.0 || g>1.0 || b>1.0) {
     throw new Error('RGB values must be in the range 0 to 1.0');
     return;
    }//*/
  
    var minRGB = Math.min(r,Math.min(g,b));
    var maxRGB = Math.max(r,Math.max(g,b));
  
    // Black-gray-white
    if (minRGB==maxRGB) {
      computedV = minRGB;
  
      let ret = rgb_to_hsv_rets.next();
      ret[0] = 0, ret[1] = 0, ret[2] = computedV;
      return ret;
    }
  
    // Colors other than black-gray-white:
    var d = (r==minRGB) ? g-b : ((b==minRGB) ? r-g : b-r);
    var h = (r==minRGB) ? 3 : ((b==minRGB) ? 1 : 5);
  
    computedH = (60*(h - d/(maxRGB - minRGB))) / 360.0;
    computedS = (maxRGB - minRGB)/maxRGB;
    computedV = maxRGB;
  
    let ret = rgb_to_hsv_rets.next();
    ret[0] = computedH, ret[1] = computedS, ret[2] = computedV;
    return ret;
  }
  
  let hsv_to_rgb_rets = new util.cachering(() => [0, 0, 0], 64);
  
  export function hsv_to_rgb(h, s, v) {
    let c=0, m=0, x=0;
    let ret = hsv_to_rgb_rets.next();
  
    ret[0] = ret[1] = ret[2] = 0.0;
    h *= 360.0;
  
    c = v * s;
    x = c * (1.0 - Math.abs(((h / 60.0) % 2) - 1.0));
    m = v - c;
    let color;
  
    function RgbF_Create(r, g, b) {
      ret[0] = r;
      ret[1] = g;
      ret[2] = b;
  
      return ret;
    }
  
    if (h >= 0.0 && h < 60.0)
    {
      color = RgbF_Create(c + m, x + m, m);
    }
    else if (h >= 60.0 && h < 120.0)
    {
      color = RgbF_Create(x + m, c + m, m);
    }
    else if (h >= 120.0 && h < 180.0)
    {
      color = RgbF_Create(m, c + m, x + m);
    }
    else if (h >= 180.0 && h < 240.0)
    {
      color = RgbF_Create(m, x + m, c + m);
    }
    else if (h >= 240.0 && h < 300.0)
    {
      color = RgbF_Create(x + m, m, c + m);
    }
    else if (h >= 300.0)
    {
      color = RgbF_Create(c + m, m, x + m);
    }
    else
    {
      color = RgbF_Create(m, m, m);
    }
  
    return color;
  }
  