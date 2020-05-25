import {CSSFont} from "./ui_theme.js";
import * as util from '../util/util.js';

export const DefaultTheme = {
  base : {
    themeVersion : 0.1,
    mobileTextSizeMultiplier : 1.5,
    mobileSizeMultiplier : 2, //does not include text

    //used for by icon strips and the like
    "oneAxisPadding" : 6,
    "oneAxisMargin" : 6,

    "FocusOutline" : "rgba(100, 150, 255, 1.0)",

    "BasePackFlag" : 0,
    "ScreenBorderOuter" : "rgba(120, 120, 120, 1.0)",
    "ScreenBorderInner" : "rgba(170, 170, 170, 1.0)",
    "ScreenBorderWidth" : util.isMobile() ? 5 : 2,
    "ScreenBorderMousePadding" : util.isMobile() ? 6 : 5,

    "numslider_width" : 24,
    "numslider_height" : 24,

    "defaultWidth" : 32,
    "defaultHeight" : 32,
    
    "ProgressBarBG" : "rgba(110, 110, 110, 1.0)",
    "ProgressBar" : "rgba(75, 175, 255, 1.0)",

    "NoteBG" : "rgba(220, 220, 220, 0.0)",
    "NoteText" : new CSSFont({
      font  : "sans-serif",
      size  : 12,
      color :  "rgba(135, 135, 135, 1.0)",
      weight : "bold"
    }),

    "DefaultPanelBG" : "rgba(225, 225, 225, 1.0)",
    "InnerPanelBG" : "rgba(195, 195, 195, 1.0)",
    "AreaHeaderBG" : "rgba(205, 205, 205, 1.0)",

    "BoxRadius" : 12,
    "BoxMargin" : 4,
    "BoxDrawMargin" : 2, //how much to shrink rects drawn by drawRoundBox
    "BoxHighlight" : "rgba(155, 220, 255, 1.0)",
    "BoxDepressed" : "rgba(130, 130, 130, 1.0)",
    "BoxBG" : "rgba(170, 170, 170, 1.0)",
    /*
    "Disabled": { //https://leaverou.github.io/css3patterns/#zig-zag
      background: "linear-gradient(135deg, rgb(100,0,0) 25%, transparent 25%) -50px 0,"+
        "linear-gradient(225deg, rgb(100,0,0) 25%, transparent 25%) -50px 0,"+
        "linear-gradient(315deg, rgb(100,0,0) 25%, transparent 25%),"+
        "linear-gradient(45deg, rgb(100,0,0) 25%, transparent 25%)",
      "background-size": "5px 3px",
      "background-color": "rgb(50, 50, 50, 1.0)",
      "border-radius" : "15px"
    },//*/
    /*
    "Disabled": { //https://leaverou.github.io/css3patterns/#waves
      "background" : "radial-gradient(circle at 100% 50%, transparent 20%, rgba(255,75,75,.8) 21%," +
                     "rgba(255,75,75,.8) 34%, transparent 35%, transparent),radial-gradient(circle at" +
                     " 0% 50%, transparent 20%, rgba(255,75,75,.8) 21%, rgba(255,75,75,.8) 34%, "+
                     "transparent 35%, transparent) 0 -50px",

      "background-color": "rgb(50, 50, 50, 0.0)",
      "background-size": "15px 20px",
      "border-radius" : "15px",
    },//*/

    Disabled : { //keys here are treated as both css and theme keys
      "background-size": "5px 3px",
      "background-color": "rgb(72, 72, 72)",
      "border-radius" : "15px",
      BoxBG : "rgb(50, 50, 50)",
      BoxSubBG : "rgb(50, 50, 50)",
      BoxSub2BG : "rgb(50, 50, 50)",
      AreaHeaderBG  : "rgb(72, 72, 72)",
      DefaultPanelBG : "rgb(72, 72, 72)",
      InnerPanelBG:  "rgb(72, 72, 72)"
    },

    "BoxSubBG" : "rgba(175, 175, 175, 1.0)",
    "BoxSub2BG" : "rgba(125, 125, 125, 1.0)",
    "BoxBorder" : "rgba(255, 255, 255, 1.0)",

    //fonts
    "DefaultText" : new CSSFont({
      font  : "sans-serif",
      size  : 12,
      color :  "rgba(35, 35, 35, 1.0)",
      weight : "bold"
    }),

    "ToolTipText" : new CSSFont({
      font  : "sans-serif",
      size  : 12,
      color :  "rgba(35, 35, 35, 1.0)",
      weight : "bold"
    }),

    "LabelText" : new CSSFont({
      size     : 13,
      color    : "rgba(75, 75, 75, 1.0)",
      font     : "sans-serif",
      weight   : "bold"
    }),

    "HotkeyText" : new CSSFont({
      size     : 12,
      color    : "rgba(130, 130, 130, 1.0)",
      font     : "courier"
      //weight   : "bold"
    }),

    "TitleText" : new CSSFont({
      size     : 16,
      color    : "rgba(55, 55, 55, 1.0)",
      font     : "sans-serif",
      weight   : "bold"
    }),
  },

  menu : {
    MenuBG : "rgba(250, 250, 250, 1.0)",
    MenuHighlight : "rgba(155, 220, 255, 1.0)",

    MenuText : new CSSFont({
      size     : 12,
      color    : "rgba(25, 25, 25, 1.0)",
      font     : "sans-serif"
      //weight   : "bold"
    }),

    MenuSeparator : `
      width : 100%;
      height : 2px;
      padding : 0px;
      margin : 0px;
      border : none;
      background-color : grey; 
    `,

    MenuBorder : "1px solid grey",
  },


  tooltip : {
    "BoxBG" : "rgb(245, 245, 245, 1.0)",
    "BoxBorder" : "rgb(145, 145, 145, 1.0)"
  },

  textbox : {
    "background-color" : "rgb(255, 255, 255, 1.0)",
  },

  richtext : {
    "background-color" : "rgb(245, 245, 245)",
    "DefaultText" : new CSSFont({
      font  : "sans-serif",
      size  : 16,
      color :  "rgba(35, 35, 35, 1.0)",
      weight : "normal"
    })
  },

  button : {
    defaultWidth : 100,
    defaultHeight : 24,
    BoxMargin     : 10
  },
  iconcheck : {

  },

  checkbox : {
    BoxMargin : 2,
    CheckSide : "left"
  },

  iconbutton : {

  },

  scrollbars : {
    color : undefined,
    color2: undefined, //if undefined, will be derived from .color shaded with .contrast
    width : undefined,
    border : undefined,
    contrast : undefined,
  },

  numslider : {
    DefaultText : new CSSFont({
      font   : "sans-serif",
      color  : "black",
      size   : 16,
      weight : 'bold'
    }),
    defaultWidth : 100,
    defaultHeight : 29
  },

  curvewidget : {
    CanvasWidth : 256,
    CanvasHeight : 256,
    CanvasBG : "rgba(50, 50, 50, 0.75)"
  },

  numslider_simple : {
    labelOnTop : false,
    TitleText : new CSSFont({
      size : 14
    }),
    BoxBG : "rgb(225, 225, 225)",
    BoxBorder : "rgb(75, 75, 75)",
    SlideHeight : 10,
    DefaultWidth : 135,
    DefaultHeight : 18,
    BoxRadius : 5,
    TextBoxWidth : 45
  },

  tabs : {
    TabStrokeStyle1 : "rgba(200, 200, 200, 1.0)",
    TabStrokeStyle2 : "rgba(255, 255, 255, 1.0)",
    TabInactive : "rgba(150, 150, 150, 1.0)",
    TabHighlight : "rgba(50, 50, 50, 0.2)",
    TabText : new CSSFont({
      size     : 18,
      color    : "rgba(35, 35, 35, 1.0)",
      font     : "sans-serif",
      //weight   : "bold"
    }),
  },

  colorfield : {
    fieldsize : 32,
    defaultWidth : 200,
    defaultHeight : 200,
    hueheight : 24,
    colorBoxHeight : 24,
    circleSize : 4,
    //DefaultPanelBG : "rgba(170, 170, 170, 1.0)"
  },

  panel : { 
    "Background" : "rgba(175, 175, 175, 1.0)",
    "TitleBackground" : "rgba(125, 125, 125, 1.0)", //for panels
    "BoxBorder" : "rgba(255, 255, 255, 0.0)",
    "TitleBorder" : "rgba(255, 255, 255, 0.0)",
    "BoxRadius" : 5,
    "BoxLineWidth"  : 1,
    "padding-top" : 7,
    "padding-bottom" : 5,
    "border-style" : "solid"
  },

  listbox : {
    DefaultPanelBG : "rgba(230, 230, 230, 1.0)",
    ListHighlight : "rgba(155, 220, 255, 0.5)",
    ListActive : "rgba(200, 205, 215, 1.0)",
    width : 110,
    height : 200
  },

  dopesheet : {
    treeWidth : 100,
    treeHeight : 600
  },

  colorpickerbutton : {
    defaultWidth  : 100,
    defaultHeight : 25,
    defaultFont   : "LabelText",
    
  },

  dropbox : {
    dropTextBG : "rgba(250, 250, 250, 0.7)", //if undefined, will use BoxBG
    BoxHighlight : "rgba(155, 220, 255, 0.4)",
    defaultHeight : 24
  }
};

