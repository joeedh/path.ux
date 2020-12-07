import {CSSFont} from "./ui_theme.js";
import * as util from '../util/util.js';

export const DefaultTheme = {
  base:  {
    mobileSizeMultiplier    : 1, //does not include text
    mobileTextSizeMultiplier: 1,
    AreaHeaderBG            : 'rgba(205, 205, 205, 1.0)',
    BasePackFlag            : 0,
    BoxBG                   : 'rgba(204,204,204, 1)',
    BoxBorder               : 'rgba(255, 255, 255, 1.0)',
    BoxDepressed            : 'rgba(130, 130, 130, 1.0)',
    BoxDrawMargin           : 2, //how much to shrink rects drawn by drawRoundBox
    BoxHighlight            : 'rgba(155, 220, 255, 1.0)',
    BoxMargin               : 4,
    BoxRadius               : 7.482711108656741,
    BoxSub2BG               : 'rgba(125, 125, 125, 1.0)',
    BoxSubBG                : 'rgba(175, 175, 175, 1.0)',
    DefaultPanelBG          : 'rgba(225, 225, 225, 1.0)',
    DefaultText             : new CSSFont({
      font    : 'sans-serif',
      weight  : 'bold',
      variant : 'normal',
      style   : 'normal',
      size    : 12,
      color   : 'rgba(35, 35, 35, 1.0)'
    }),
    Disabled  : { //keys here are treated as both css and theme keys
      AreaHeaderBG : 'rgb(72, 72, 72)',
      BoxBG : 'rgb(50, 50, 50)',
      BoxSub2BG : 'rgb(50, 50, 50)',
      BoxSubBG : 'rgb(50, 50, 50)',
      DefaultPanelBG : 'rgb(72, 72, 72)',
      InnerPanelBG : 'rgb(72, 72, 72)',
      'background-color' : 'rgb(72, 72, 72)',
      'background-size' : '5px 3px',
      'border-radius' : '15px',
    },
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
    FocusOutline            : 'rgba(100, 150, 255, 1.0)',
    HotkeyText              : new CSSFont({
      font    : 'courier',
      weight  : 'normal',
      variant : 'normal',
      style   : 'normal',
      size    : 12,
      color   : 'rgba(130, 130, 130, 1.0)'
    }),
    InnerPanelBG            : 'rgba(195, 195, 195, 1.0)',
    LabelText               : new CSSFont({
      font    : 'sans-serif',
      weight  : 'bold',
      variant : 'normal',
      style   : 'normal',
      size    : 13,
      color   : 'rgba(75, 75, 75, 1.0)'
    }),
    NoteBG                  : 'rgba(220, 220, 220, 0.0)',
    NoteText                : new CSSFont({
      font    : 'sans-serif',
      weight  : 'bold',
      variant : 'normal',
      style   : 'normal',
      size    : 12,
      color   : 'rgba(135, 135, 135, 1.0)'
    }),
    ProgressBar             : 'rgba(75, 175, 255, 1.0)',
    ProgressBarBG           : 'rgba(110, 110, 110, 1.0)',
    ScreenBorderInner       : 'rgba(170, 170, 170, 1.0)',
    ScreenBorderMousePadding: 5,
    ScreenBorderOuter       : 'rgba(120, 120, 120, 1.0)',
    ScreenBorderWidth       : 2,
    TitleText               : new CSSFont({
      font    : 'sans-serif',
      weight  : 'bold',
      variant : 'normal',
      style   : 'normal',
      size    : 16,
      color   : 'rgba(0,0,0, 1)'
    }),
    ToolTipText             : new CSSFont({
      font    : 'sans-serif',
      weight  : 'bold',
      variant : 'normal',
      style   : 'normal',
      size    : 12,
      color   : 'rgba(35, 35, 35, 1.0)'
    }),
    defaultHeight           : 32,
    defaultWidth            : 32,
    numslider_height        : 24,
    numslider_width         : 24,

    //used for by icon strips and the like
    oneAxisMargin           : 6,
    oneAxisPadding          : 6,
    themeVersion            : 0.1,
  },

  button:  {
    BoxMargin    : 2.8251749218092415,
    defaultHeight: 22.965012641773395,
    defaultWidth : 100,
  },

  checkbox:  {
    BoxuMargin: 2,
    CheckSide: 'left',
    "background-color" : "orange",
    "background" : "blue"
  },

  colorfield:  {
    circleSize    : 4,
    colorBoxHeight: 24,
    defaultHeight : 200,
    defaultWidth  : 200,
    fieldsize     : 32,
    hueheight     : 24,
  },

  colorpickerbutton:  {
    defaultFont  : 'LabelText',
    defaultHeight: 25,
    defaultWidth : 100,
  },

  curvewidget:  {
    CanvasBG    : 'rgba(50, 50, 50, 0.75)',
    CanvasHeight: 256,
    CanvasWidth : 256,
  },

  dropbox:  {
    BoxHighlight : 'rgba(155, 220, 255, 0.4)',
    defaultHeight: 24,
    dropTextBG   : 'rgba(250, 250, 250, 0.7)', //if undefined, will use BoxBG
  },

  iconbutton:  {
  },

  iconcheck:  {
    drawCheck: true
  },

  listbox:  {
    DefaultPanelBG: 'rgba(230, 230, 230, 1.0)',
    ListActive    : 'rgba(200, 205, 215, 1.0)',
    ListHighlight : 'rgba(155, 220, 255, 0.5)',
    height        : 200,
    width         : 110,
  },

  menu:  {
    MenuBG       : 'rgba(250, 250, 250, 1.0)',
    MenuBorder   : '1px solid grey',
    MenuHighlight: 'rgba(155, 220, 255, 1.0)',
    MenuSeparator: `
      width : 100%;
      height : 2px;
      padding : 0px;
      margin : 0px;
      border : none;
      background-color : grey; 
    `,
    MenuSpacing  : 0,
    MenuText     : new CSSFont({
      font    : 'sans-serif',
      weight  : 'normal',
      variant : 'normal',
      style   : 'normal',
      size    : 12,
      color   : 'rgba(25, 25, 25, 1.0)'
    }),
  },

  numslider:  {
    DefaultText  : new CSSFont({
      font    : 'sans-serif',
      weight  : 'normal',
      variant : 'normal',
      style   : 'normal',
      size    : 14.204297767377387,
      color   : 'black'
    }),
    defaultHeight: 16,
    defaultWidth : 100,
    labelOnTop   : true,
  },

  numslider_simple:  {
    BoxBG        : 'rgb(225, 225, 225)',
    BoxBorder    : 'rgb(75, 75, 75)',
    BoxRadius    : 5,
    DefaultHeight: 18,
    DefaultWidth : 135,
    SlideHeight  : 10,
    TextBoxWidth : 45,
    TitleText    : new CSSFont({
      font    : undefined,
      weight  : 'normal',
      variant : 'normal',
      style   : 'normal',
      size    : 14,
      color   : undefined
    }),
    labelOnTop   : true,
  },

  numslider_textbox:  {
    TitleText : new CSSFont({
      font    : 'sans-serif',
      weight  : 'bold',
      variant : 'normal',
      style   : 'normal',
      size    : 14,
      color   : undefined
    }),
    labelOnTop: true,
  },

  panel:  {
    Background            : 'rgba(33,33,33, 0.23771520154229525)',
    BoxBorder             : 'rgba(0,0,0, 0.5598061397157866)',
    BoxLineWidth          : 1.141,
    BoxRadius             : 7.243125760182565,
    HeaderRadius          : 5.829650280441558,
    TitleBackground       : 'rgba(89,89,89, 0.7980600291285022)',
    TitleBorder           : 'rgba(93,93,93, 1)',
    TitleText             : new CSSFont({
      font    : 'sans-serif',
      weight  : 'normal',
      variant : 'normal',
      style   : 'normal',
      size    : 14,
      color   : 'rgba(225,225,225, 1)'
    }),
    'border-style'        : 'groove',
    'margin-bottom'       : 15.762442435166511,
    'margin-bottom-closed': 0,
    'margin-top'          : 0.2606556353343805,
    'margin-top-closed'   : 0,
    'padding-bottom'      : 0.8561244078997758,
    'padding-left'        : 0,
    'padding-right'       : 0,
    'padding-top'         : 0.9665377430621097,
  },


  richtext:  {
    DefaultText       : new CSSFont({
      font    : 'sans-serif',
      weight  : 'normal',
      variant : 'normal',
      style   : 'normal',
      size    : 16,
      color   : 'rgba(35, 35, 35, 1.0)'
    }),
    'background-color': 'rgb(245, 245, 245)',
  },

  scrollbars:  {
    border  : undefined,
    color   : undefined,
    color2  : undefined, //if undefined, will be derived from .color shaded with .contrast
    contrast: undefined,
    width   : undefined,
  },

  strip:  {
    BoxBorder     : 'rgba(0,0,0, 0.31325409987877156)',
    BoxLineWidth  : 1,
    BoxMargin     : 1,
    margin        : 2,
    BoxRadius     : 8.76503417507447,
    background    : 'rgba(90,90,90, 0.22704720332704742)',
    'border-style': 'solid',
  },

  tabs:  {
    TabHighlight   : 'rgba(50, 50, 50, 0.2)',
    TabInactive    : 'rgba(150, 150, 150, 1.0)',
    TabStrokeStyle1: 'rgba(200, 200, 200, 1.0)',
    TabStrokeStyle2: 'rgba(255, 255, 255, 1.0)',
    TabText        : new CSSFont({
      font    : 'sans-serif',
      weight  : 'normal',
      variant : 'normal',
      style   : 'normal',
      size    : 18,
      color   : 'rgba(35, 35, 35, 1.0)'
    }),
  },

  textbox:  {
    'background-color': 'rgb(255, 255, 255, 1.0)',
  },

  tooltip:  {
    BoxBG    : 'rgb(245, 245, 245, 1.0)',
    BoxBorder: 'rgb(145, 145, 145, 1.0)',
  },

  treeview:  {
    itemIndent: 10,
    rowHeight : 18,
  },

  vecPopupButton:  {
    BoxMargin    : 3,
    defaultHeight: 18,
    defaultWidth : 100,
  },

};
