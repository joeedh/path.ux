import {CSSFont} from "./ui_theme.js";

export const DefaultTheme = {
  base : {
    //used for by icon strips and the like
    "oneAxisPadding" : 6,
    "oneAxisMargin" : 6,

    "FocusOutline" : "rgba(100, 150, 255, 1.0)",

    "BasePackFlag" : 0,
    "ScreenBorderOuter" : "rgba(255, 255, 255, 1.0)",
    "ScreenBorderInner" : "rgba(170, 170, 170, 1.0)",

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

    "TabStrokeStyle1" : "rgba(200, 200, 200, 1.0)",
    "TabStrokeStyle2" : "rgba(225, 225, 225, 1.0)",
    "TabInactive" : "rgba(150, 150, 150, 1.0)",
    "TabHighlight" : "rgba(50, 50, 50, 0.2)",

    "DefaultPanelBG" : "rgba(155, 155, 155, 1.0)",
    "InnerPanelBG" : "rgba(140, 140, 140, 1.0)",

    "BoxRadius" : 12,
    "BoxMargin" : 4,
    "BoxDrawMargin" : 2, //how much to shrink rects drawn by drawRoundBox
    "BoxHighlight" : "rgba(155, 220, 255, 1.0)",
    "BoxDepressed" : "rgba(130, 130, 130, 1.0)",
    "BoxBG" : "rgba(170, 170, 170, 1.0)",
    "DisabledBG" : "rgba(110, 110, 110, 1.0)",
    "BoxSubBG" : "rgba(175, 175, 175, 1.0)",
    "BoxSub2BG" : "rgba(125, 125, 125, 1.0)", //for panels
    "BoxBorder" : "rgba(255, 255, 255, 1.0)",
    "MenuBG" : "rgba(250, 250, 250, 1.0)",
    "MenuHighlight" : "rgba(155, 220, 255, 1.0)",
    "AreaHeaderBG" : "rgba(170, 170, 170, 1.0)",

    //fonts
    "DefaultText" : new CSSFont({
      font  : "sans-serif",
      size  : 14,
      color :  "rgba(35, 35, 35, 1.0)",
      weight : "bold"
    }),

    "TabText" : new CSSFont({
      size     : 18,
      color    : "rgba(35, 35, 35, 1.0)",
      font     : "sans-serif",
      //weight   : "bold"
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

    "MenuText" : new CSSFont({
      size     : 12,
      color    : "rgba(25, 25, 25, 1.0)",
      font     : "sans-serif"
      //weight   : "bold"
    }),

    "TitleText" : new CSSFont({
      size     : 16,
      color    : "rgba(55, 55, 55, 1.0)",
      font     : "sans-serif",
      weight   : "bold"
    }),
  },

  button : {
    "defaultWidth" : 100,
    "defaultHeight" : 24
  },
  iconcheck : {

  },

  checkbox : {
    BoxMargin : 2,
    CheckSide : "left"
  },

  iconbutton : {

  },

  numslider : {
    "defaultWidth" : 100,
    "defaultHeight" : 29
  },

  numslider_simple : {
    BoxBG : "rgb(125, 125, 125)",
    BoxBorder : "rgb(75, 75, 75)",
    SlideHeight : 18,
    DefaultWidth : 125,
    DefaultHeight : 32,
    BoxRadius : 5,
    TextBoxWidth : 40
  },

  colorfield : {
    fieldsize : 32,
    defaultWidth : 200,
    defaultHeight : 200,
    hueheight : 24,
    colorBoxHeight : 24,
    circleSize : 4,
    DefaultPanelBG : "rgba(170, 170, 170, 1.0)"
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
    defaultFont   : "LabelText"
  },

  dropbox : {
    dropTextBG : "rgba(250, 250, 250, 0.7)" //if undefined, will use BoxBG
  }
};

