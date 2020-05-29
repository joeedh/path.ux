import {CSSFont} from "./pathux.js";

export var theme = {
  base: {
    AreaHeaderBG: 'rgba(228,228,228, 1)',
    BasePackFlag: 0,
    BoxBG: 'rgba(198,198,198, 1)',
    BoxBorder: 'rgba(255, 255, 255, 1.0)',
    BoxDepressed: 'rgba(130, 130, 130, 1.0)',
    BoxDrawMargin: 2,
    BoxHighlight: 'rgba(155, 220, 255, 1.0)',
    BoxMargin: 4,
    BoxRadius: 12,
    BoxSub2BG: 'rgba(125, 125, 125, 1.0)',
    BoxSubBG: 'rgba(175, 175, 175, 1.0)',
    DefaultPanelBG: 'rgba(231,231,231, 1)',
    DefaultText: new CSSFont({
      font: 'sans-serif',
      weight: 'normal',
      variant: 'normal',
      style: 'normal',
      size: 12,
      color: 'rgba(35, 35, 35, 1.0)'
    }),
    Disabled: {
      AreaHeaderBG: 'rgb(72, 72, 72)',
      BoxBG: 'rgb(50, 50, 50)',
      BoxSub2BG: 'rgb(50, 50, 50)',
      BoxSubBG: 'rgb(50, 50, 50)',
      DefaultPanelBG: 'rgb(72, 72, 72)',
      InnerPanelBG: 'rgb(72, 72, 72)',
      'background-color': 'rgb(72, 72, 72)',
      'background-size': '5px 3px',
      'border-radius': '15px',
    },
    FocusOutline: 'rgba(100, 150, 255, 1.0)',
    HotkeyText: new CSSFont({
      font: 'courier',
      weight: 'normal',
      variant: 'normal',
      style: 'normal',
      size: 12,
      color: 'rgba(130, 130, 130, 1.0)'
    }),
    InnerPanelBG: 'rgba(215,215,215, 1)',
    LabelText: new CSSFont({
      font: 'sans-serif',
      weight: 'normal',
      variant: 'normal',
      style: 'normal',
      size: 13,
      color: 'rgba(75, 75, 75, 1.0)'
    }),
    NoteBG: 'rgba(220, 220, 220, 0.0)',
    NoteText: new CSSFont({
      font: 'sans-serif',
      weight: 'bold',
      variant: 'normal',
      style: 'normal',
      size: 12,
      color: 'rgba(135, 135, 135, 1.0)'
    }),
    ProgressBar: 'rgba(75, 175, 255, 1.0)',
    ProgressBarBG: 'rgba(110, 110, 110, 1.0)',
    ScreenBorderInner: 'rgba(170, 170, 170, 1.0)',
    ScreenBorderMousePadding: 5,
    ScreenBorderOuter: 'rgba(120, 120, 120, 1.0)',
    ScreenBorderWidth: 2,
    TitleText: new CSSFont({
      font: 'sans-serif',
      weight: 'normal',
      variant: 'normal',
      style: 'normal',
      size: 16,
      color: 'rgba(55, 55, 55, 1.0)'
    }),
    ToolTipText: new CSSFont({
      font: 'sans-serif',
      weight: 'bold',
      variant: 'normal',
      style: 'normal',
      size: 12,
      color: 'rgba(35, 35, 35, 1.0)'
    }),
    defaultHeight: 32,
    defaultWidth: 32,
    mobileSizeMultiplier: 1,
    mobileTextSizeMultiplier: 1,
    numslider_height: 24,
    numslider_width: 24,
    oneAxisMargin: 6,
    oneAxisPadding: 6,
    themeVersion: 0.1,
  },

  button: {
    BoxMargin: 10,
    defaultHeight: 20,
    defaultWidth: 100,
  },

  checkbox: {
    BoxMargin: 2,
    CheckSide: 'left',
  },

  colorfield: {
    circleSize: 4,
    colorBoxHeight: 24,
    defaultHeight: 200,
    defaultWidth: 200,
    fieldsize: 32,
    hueheight: 24,
  },

  colorpickerbutton: {
    defaultFont: 'LabelText',
    defaultHeight: 20,
    defaultWidth: 100,
  },

  curvewidget: {
    CanvasBG: 'rgba(50, 50, 50, 0.75)',
    CanvasHeight: 256,
    CanvasWidth: 256,
  },

  dropbox: {
    BoxHighlight: 'rgba(155, 220, 255, 0.4)',
    defaultHeight: 20.751926241157783,
    dropTextBG: 'rgba(250, 250, 250, 0.7)',
  },

  iconbutton: {},

  iconcheck: {},

  listbox: {
    DefaultPanelBG: 'rgba(230, 230, 230, 1.0)',
    ListActive: 'rgba(200, 205, 215, 1.0)',
    ListHighlight: 'rgba(155, 220, 255, 0.5)',
    height: 200,
    width: 110,
  },

  menu: {
    MenuBG: 'rgba(237,237,237, 1)',
    MenuBorder: '1px solid grey',
    MenuHighlight: 'rgba(155, 220, 255, 1.0)',
    MenuSeparator: `
        width : 100%;
        height : 2px;
        padding : 0px;
        margin : 0px;
        border : none;
        background-color : grey; 
      `,
    MenuSpacing: 1.135472052413802,
    MenuText: new CSSFont({
      font: 'sans-serif',
      weight: 'normal',
      variant: 'normal',
      style: 'normal',
      size: 12,
      color: 'rgba(25, 25, 25, 1.0)'
    }),
  },

  numslider: {
    DefaultText: new CSSFont({
      font: 'sans-serif',
      weight: 'normal',
      variant: 'normal',
      style: 'normal',
      size: 16,
      color: 'black'
    }),
    defaultHeight: 24,
    defaultWidth: 100,
  },

  numslider_simple: {
    BoxBG: 'rgb(225, 225, 225)',
    BoxBorder: 'rgb(75, 75, 75)',
    BoxRadius: 5,
    DefaultHeight: 20,
    DefaultWidth: 124,
    SlideHeight:  10,
    TextBoxWidth: 40,
    TitleText: new CSSFont({
      font: undefined,
      weight: 'normal',
      variant: 'normal',
      style: 'normal',
      size: 9.430402071976022,
      color: undefined
    }),
    labelOnTop: false,
  },

  panel: {
    Background: 'rgba(192,192,192, 1)',
    BoxBorder: 'rgba(149,149,149, 1)',
    BoxLineWidth: 1.3067810512292988,
    BoxRadius: 5,
    TitleBackground: 'rgba(207,207,207, 1)',
    TitleBorder: 'rgba(238,238,238, 1)',
    'border-style': 'inset',
    'padding-bottom': 1.0360741267728044,
    'padding-top': 2.240372811113805,
  },

  richtext: {
    DefaultText: new CSSFont({
      font: 'sans-serif',
      weight: 'normal',
      variant: 'normal',
      style: 'normal',
      size: 16,
      color: 'rgba(35, 35, 35, 1.0)'
    }),
    'background-color': 'rgb(245, 245, 245)',
  },

  scrollbars: {
    border: undefined,
    color: undefined,
    color2: undefined,
    contrast: undefined,
    width: undefined,
  },

  tabs: {
    TabHighlight: 'rgba(50, 50, 50, 0.2)',
    TabInactive: 'rgba(150, 150, 150, 1.0)',
    TabStrokeStyle1: 'rgba(200, 200, 200, 1.0)',
    TabStrokeStyle2: 'rgba(255, 255, 255, 1.0)',
    TabText: new CSSFont({
      font: 'sans-serif',
      weight: 'normal',
      variant: 'normal',
      style: 'normal',
      size: 18,
      color: 'rgba(35, 35, 35, 1.0)'
    }),
  },

  textbox: {
    'background-color': 'rgb(255, 255, 255, 1.0)',
  },

  tooltip: {
    BoxBG: 'rgb(245, 245, 245, 1.0)',
    BoxBorder: 'rgb(145, 145, 145, 1.0)',
  },

  treeview: {
    itemIndent: 10,
    rowHeight: 18,
  },
};
