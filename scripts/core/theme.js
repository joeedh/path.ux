import {CSSFont} from './ui_theme.js';

export const DefaultTheme = {
  base: {},

  button: {},

  checkbox: {},

  colorfield: {},

  colorpickerbutton: {},

  curvewidget: {
    CanvasBG    : 'rgba(50, 50, 50, 0.75)',
    CanvasHeight: 256,
    CanvasWidth : 256,
  },

  dropbox: {},

  iconbutton: {},

  iconcheck: {
    drawCheck: true,
  },

  listbox: {
    ListActive   : 'rgba(200, 205, 215, 1.0)',
    ListHighlight: 'rgba(155, 220, 255, 0.5)',
    height       : 200,
    width        : 110,
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
    "border-radius" : 1,
    "border-color" : "black"
  },

  numslider_simple: {
    DefaultHeight: 18,
    DefaultWidth : 135,
    SlideHeight  : 10,
    TextBoxWidth : 45,
    labelOnTop   : true,
  },

  numslider_textbox: {
    labelOnTop: true,
  },

  panel: {
    "background-color"    : 'rgba(86,86,86, 0.2108836733061692)',
    "border-color"        : 'rgba(0,0,0, 0.5598061397157866)',
    "border-width"        : 1.141,
    "border-radius"       : 7.243125760182565,
    HeaderBorderRadius    : 5.829650280441558,
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
    "background-color": 'rgba(55, 55, 55, 0.5)',
  },

  strip: {
    "border-color"     : 'rgba(0,0,0, 0.31325409987877156)',
    "border-width"  : 1,
    padding     : 1,
    "border-radius"     : 8.76503417507447,
    "background-color"   : 'rgba(0,0,0, 0.22704720332704742)',
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
    "background-color"         : 'rgba(255,255,255, 1)',
    "border-color"     : 'rgba(139,139,139, 1)',
    "border-width"  : 1,
    "border-radius"     : 3,
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
    padding    : 3,
    defaultHeight: 18,
    defaultWidth : 100,
  },

};
