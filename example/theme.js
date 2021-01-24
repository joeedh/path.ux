/*
 * WARNING: AUTO-GENERATED FILE
 *
 * Copy to scripts/editors/theme.js
 */

import {CSSFont} from './pathux.js';

export const theme = {
  base: {
    AreaHeaderBG            : 'rgba(221,221,221, 1)',
    BasePackFlag            : 0,
    BoxBG                   : 'rgba(231,231,231, 1)',
    BoxBorder               : 'rgba(36,36,36, 1)',
    BoxDepressed            : 'rgba(114,114,114, 1)',
    BoxDrawMargin           : 2,
    BoxHighlight            : 'rgba(74,149,255, 0.367)',
    BoxMargin               : 4,
    BoxRadius               : 6.207598321508586,
    BoxSub2BG               : 'rgba(112,112,112, 1)',
    BoxSubBG                : 'rgba(102,102,102, 1)',
    DefaultPanelBG          : 'rgba(216,216,216, 1)',
    DefaultText             : new CSSFont({
      font   : 'sans-serif',
      weight : 'normal',
      variant: 'normal',
      style  : 'normal',
      size   : 14,
      color  : 'rgba(0,0,0, 1)'
    }),
    Disabled                : {
      AreaHeaderBG      : 'rgb(72, 72, 72)',
      BoxBG             : 'rgb(50, 50, 50)',
      BoxSub2BG         : 'rgb(50, 50, 50)',
      BoxSubBG          : 'rgb(50, 50, 50)',
      DefaultPanelBG    : 'rgb(72, 72, 72)',
      InnerPanelBG      : 'rgb(72, 72, 72)',
      'background-color': 'rgb(72, 72, 72)',
      'background-size' : '5px 3px',
      'border-radius'   : '15px',
    },
    DisabledBG              : 'rgba(58,58,58, 1)',
    FocusOutline            : 'rgba(100, 150, 255, 1.0)',
    HotkeyText              : new CSSFont({
      font   : 'courier',
      weight : 'normal',
      variant: 'normal',
      style  : 'normal',
      size   : 12,
      color  : 'rgba(0,0,0, 1)'
    }),
    InnerPanelBG            : 'rgba(110,110,110, 1)',
    LabelText               : new CSSFont({
      font   : 'sans-serif',
      weight : 'normal',
      variant: 'normal',
      style  : 'normal',
      size   : 13,
      color  : 'rgba(35,35,35, 1)'
    }),
    NoteBG                  : 'rgba(220, 220, 220, 0.0)',
    NoteText                : new CSSFont({
      font   : 'sans-serif',
      weight : 'bold',
      variant: 'normal',
      style  : 'normal',
      size   : 12,
      color  : 'rgba(0,0,0, 1)'
    }),
    ProgressBar             : 'rgba(75, 175, 255, 1.0)',
    ProgressBarBG           : 'rgba(110, 110, 110, 1.0)',
    ScreenBorderInner       : 'rgba(130,130,130, 1)',
    ScreenBorderMousePadding: 5,
    ScreenBorderOuter       : 'rgba(178,178,178, 1)',
    ScreenBorderWidth       : 2,
    TitleText               : new CSSFont({
      font   : 'sans-serif',
      weight : 'bold',
      variant: 'normal',
      style  : 'normal',
      size   : 16,
      color  : 'rgba(0,0,0, 1)'
    }),
    ToolTipText             : new CSSFont({
      font   : 'sans-serif',
      weight : 'bold',
      variant: 'normal',
      style  : 'normal',
      size   : 12,
      color  : 'rgba(35, 35, 35, 1.0)'
    }),
    defaultHeight           : 32,
    defaultWidth            : 32,
    mobileSizeMultiplier    : 1,
    mobileTextSizeMultiplier: 1,
    numslider_height        : 24,
    numslider_width         : 24,
    oneAxisMargin           : 6,
    oneAxisPadding          : 6,
    themeVersion            : 0.1,
  },

  button: {
    BoxMargin    : 2.8251749218092415,
    defaultHeight: 22.965012641773395,
    defaultWidth : 100,
  },

  checkbox: {
    BoxMargin         : 6,
    BoxuMargin        : 2,
    CheckSide         : 'left',
    background        : 'blue',
    'background-color': 'orange',
  },

  colorfield: {
    circleSize    : 4,
    colorBoxHeight: 24,
    defaultHeight : 200,
    defaultWidth  : 200,
    fieldsize     : 32,
    hueheight     : 24,
  },

  colorpickerbutton: {
    defaultFont  : 'LabelText',
    defaultHeight: 25,
    defaultWidth : 100,
  },

  curvewidget: {
    CanvasBG    : 'rgba(50, 50, 50, 0.75)',
    CanvasHeight: 256,
    CanvasWidth : 256,
  },

  dropbox: {
    BoxHighlight : 'rgba(155, 220, 255, 0.4)',
    defaultHeight: 24,
    dropTextBG   : 'rgba(240,240,240, 0.7)',
  },

  iconbutton: {},

  iconcheck: {
    drawCheck: true,
  },

  listbox: {
    DefaultPanelBG: 'rgba(230, 230, 230, 1.0)',
    ListActive    : 'rgba(200, 205, 215, 1.0)',
    ListHighlight : 'rgba(155, 220, 255, 0.5)',
    height        : 200,
    width         : 110,
  },

  menu: {
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
    MenuSpacing  : 5,
    MenuText     : new CSSFont({
      font   : 'sans-serif',
      weight : 'normal',
      variant: 'normal',
      style  : 'normal',
      size   : 12,
      color  : 'rgba(25, 25, 25, 1.0)'
    }),
  },

  numslider: {
    DefaultText  : new CSSFont({
      font   : 'sans-serif',
      weight : 'normal',
      variant: 'normal',
      style  : 'normal',
      size   : 14.204297767377387,
      color  : 'rgba(63,63,63, 1)'
    }),
    defaultHeight: 16,
    defaultWidth : 100,
    labelOnTop   : true,
  },

  numslider_simple: {
    BoxBG        : 'rgba(179,179,179, 1)',
    BoxBorder    : 'rgb(75, 75, 75)',
    BoxRadius    : 5,
    DefaultHeight: 18,
    DefaultWidth : 135,
    SlideHeight  : 10,
    TextBoxWidth : 45,
    TitleText    : new CSSFont({
      font   : undefined,
      weight : 'normal',
      variant: 'normal',
      style  : 'normal',
      size   : 14,
      color  : undefined
    }),
    labelOnTop   : true,
  },

  numslider_textbox: {
    TitleText : new CSSFont({
      font   : 'sans-serif',
      weight : 'normal',
      variant: 'normal',
      style  : 'normal',
      size   : 14,
      color  : 'rgba(0,0,0, 1)'
    }),
    labelOnTop: true,
  },

  panel: {
    Background            : 'rgba(86,86,86, 0.2108836733061692)',
    BoxBorder             : 'rgba(0,0,0, 0.5598061397157866)',
    BoxLineWidth          : 1.141,
    BoxRadius             : 7.243125760182565,
    HeaderRadius          : 5.829650280441558,
    TitleBackground       : 'rgba(212,212,212, 1)',
    TitleBorder           : 'rgba(104,104,104, 1)',
    TitleText             : new CSSFont({
      font   : 'sans-serif',
      weight : 'normal',
      variant: 'normal',
      style  : 'normal',
      size   : 14,
      color  : 'rgba(0,0,0, 1)'
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

  richtext: {
    DefaultText       : new CSSFont({
      font   : 'sans-serif',
      weight : 'normal',
      variant: 'normal',
      style  : 'normal',
      size   : 16,
      color  : 'rgba(35, 35, 35, 1.0)'
    }),
    'background-color': 'rgb(245, 245, 245)',
  },

  scrollbars: {
    border  : undefined,
    color   : undefined,
    color2  : undefined,
    contrast: undefined,
    width   : undefined,
  },

  sidebar: {
    background: 'rgba(55, 55, 55, 0.5)',
  },

  strip: {
    BoxBorder     : 'rgba(0,0,0, 0.31325409987877156)',
    BoxLineWidth  : 1,
    BoxMargin     : 1,
    BoxRadius     : 8.76503417507447,
    background    : 'rgba(0,0,0, 0.22704720332704742)',
    'border-style': 'solid',
    margin        : 2,
  },

  tabs: {
    TabActive      : 'rgba(212,212,212, 1)',
    TabBarRadius   : 6,
    TabHighlight   : 'rgba(50, 50, 50, 0.2)',
    TabInactive    : 'rgba(183,183,183, 1)',
    TabStrokeStyle1: 'rgba(0,0,0, 1)',
    TabStrokeStyle2: 'rgba(0,0,0, 1)',
    TabText        : new CSSFont({
      font   : 'sans-serif',
      weight : 'normal',
      variant: 'bold',
      style  : 'normal',
      size   : 15,
      color  : 'rgba(0,0,0, 1)'
    }),
  },

  textbox: {
    DefaultText       : new CSSFont({
      font   : 'sans-serif',
      weight : 'normal',
      variant: 'normal',
      style  : 'normal',
      size   : 14,
      color  : 'rgba(3,3,3, 1)'
    }),
    'background-color': 'rgba(245,245,245, 1)',
  },

  tooltip: {
    BoxBG         : 'rgba(255,255,255, 1)',
    BoxBorder     : 'rgba(139,139,139, 1)',
    BoxLineWidth  : 1,
    BoxRadius     : 3,
    'border-style': 'solid',
    padding       : 5,
    ToolTipText   : new CSSFont({
      font   : 'sans-serif',
      weight : 'bold',
      variant: 'normal',
      style  : 'normal',
      size   : 12,
      color  : 'rgba(35, 35, 35, 1.0)'
    }),
  },

  treeview: {
    itemIndent: 10,
    rowHeight : 18,
  },

  vecPopupButton: {
    BoxMargin    : 3,
    defaultHeight: 18,
    defaultWidth : 100,
  },

};
