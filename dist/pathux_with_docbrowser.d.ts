declare var struct_default: any;
declare var lz_string_default: any;
declare var util_exports: {};
declare var config_exports: {};
declare var vectormath_exports: {};
declare var Vector2: any, Vector3: any, Vector4: any, Quat: any, EulerOrders: any, Matrix4: any;
declare function singleMouseEvent(cb: any, type: any): any;
declare function isLeftClick(e: any): boolean;
declare function isMouseDown(e: any): boolean;
declare function pathDebugEvent(event: any, extra: any): void;
declare function eventWasMouseDown(e: any, button?: number): boolean;
declare function eventWasTouch(e: any): boolean;
declare function copyEvent(e: any): {
    original: any;
};
declare function _setScreenClass(cls: any): void;
declare function _setModalAreaClass(cls: any): void;
declare function pushPointerModal(obj: any, elem: any, pointerId: any, autoStopPropagation?: boolean): {
    keys: any;
    handlers: {};
    last_mpos: number[];
};
declare function pushModalLight(obj: any, autoStopPropagation: boolean, elem: any, pointerId: any): {
    keys: any;
    handlers: {};
    last_mpos: number[];
};
declare function popModalLight(state: any): void;
declare function haveModal(): boolean;
declare var modalstack: any, DoubleClickHandler: any, keymap_latin_1: any, keymap: any, reverse_keymap: any, HotKey: any, KeyMap: any;
declare var ClassIdSymbol: any;
declare function getAreaIntName(name2: any): number;
declare function setAreaTypes(def: any): void;
declare var AreaTypes: any, AreaWrangler: any, contextWrangler: any;
declare function getCurve(type: any, throw_on_error?: boolean): any;
declare function evalHermiteTable(table: any, t: any, range?: any): any;
declare function genHermiteTable(evaluate: any, steps: any, range?: number[]): any[];
declare var CurveConstructors: any, CURVE_VERSION: any, CurveFlags: any, TangentModes: any, CurveTypeData: any;
declare var toolprop_abstract_exports: {};
declare var PropTypes: any, PropFlags: any;
declare function setBaseUnit(unit: any): void;
declare function setMetric(val: any): void;
declare function parseValueIntern(string: any, baseUnit: any): any;
declare function parseValue(string: any, baseUnit: any, displayUnit: any): any;
declare function isNumber(string: any): boolean;
declare function convert(value: any, unita: any, unitb: any): any;
declare function buildString(value: any, baseUnit?: any, decimalPlaces?: number, displayUnit?: any): any;
declare var Units: any, Unit: any, MeterUnit: any, InchUnit: any, FootUnit: any, SquareFootUnit: any, MileUnit: any, DegreeUnit: any, RadianUnit: any, PixelUnit: any, PercentUnit: any;
declare function setPropTypes(types: any): void;
declare var NumberConstraintsBase: any, IntegerConstraints: any, FloatConstrinats: any, NumberConstraints: any, PropSubTypes2: any, customPropertyTypes: any, PropClasses: any, MakeUINameWordMap: any, defaultRadix: any, defaultDecimalPlaces: any, ToolProperty: any, FloatArrayProperty: any, StringPropertyBase: any, StringProperty: any, NumProperty: any, _NumberPropertyBase: any, IntProperty: any, ReportProperty: any, BoolProperty: any, FloatProperty: any, EnumKeyPair: any, EnumPropertyBase: any, EnumProperty: any, FlagProperty: any, VecPropertyBase: any, Vec2Property: any, Vec3Property: any, Vec4Property: any, QuatProperty: any, Mat4Property: any, ListProperty: any, StringSetProperty: any;
declare function getTempProp(type: any): any;
declare function getVecClass(proptype: any): any;
declare function setImplementationClass(cls: any): void;
declare function registerTool(cls: any): any;
declare var DataFlags: any, DataTypes: any, DataPathError: any, DataPath: any, StructFlags: any, DataList: any, ToolOpIface: any;
declare function setNotifier(cls: any): void;
declare function makeDerivedOverlay(parent: any): {
    new (appstate: any): {
        [x: string]: any;
        ctx: any;
        _state: any;
        __allKeys: any;
        get state(): any;
        set state(state: any);
        onRemove(_have_new_file?: boolean): void;
        copy(): any;
        validate(): void;
    };
    [x: string]: any;
    contextDefine(): {
        name: string;
        flag: number;
    };
    resolveDef(): any;
};
declare function test(): boolean;
declare var ContextFlags: any, OverlayClasses: any, ContextOverlay: any, excludedKeys: any, LockedContext: any, Context: any;
declare function setContextClass(_cls: any): void;
declare function setDefaultUndoHandlers(undoPre: any, undo: any): void;
declare function buildToolOpAPI(api: any, cls: any): any;
declare function buildToolSysAPI(api: any, registerWithNStructjs: boolean, rootCtxStruct: any, rootCtxClass: any, insertToolDefaultsIntoContext?: boolean): void;
declare var ToolClasses: any, ToolFlags: any, UndoFlags: any, InheritFlag2: any, ToolPropertyCache: any, SavedToolDefaults: any, ToolOp: any, MacroLink: any, MacroClasses: any, ToolMacro: any, ToolStack: any;
declare function IndexRange(len: any): any;
declare function mySafeJSONStringify(obj: any): string;
declare function mySafeJSONParse(buf: any): any;
declare function binomial(n: any, i: any): any;
declare function initSplineTemplates(): void;
declare var SplineTemplates: any, SplineTemplateIcons: any, Curve1dBSplineOpBase: any, Curve1dBSplineResetOp: any, Curve1dBSplineLoadTemplOp: any, Curve1dBSplineDeleteOp: any, Curve1dBSplineSelectOp: any, Curve1dBSplineAddOp: any, BSplineTransformOp: any, Curve1DPoint: any, BSplineCurve: any;
declare var Curve1D: any;
declare var math_exports: {};
declare function quad_bilinear(v1: any, v2: any, v3: any, v4: any, u: any, v: any): number;
declare function quad_uv_2d(p: any, v1: any, v2: any, v3: any, v4: any): any;
declare function closestPoint(p: any, curve: any, mode: any): void;
declare function normal_poly(vs: any): any;
declare function dihedral_v3_sqr(v1: any, v2: any, v3: any, v4: any): number;
declare function tet_volume(a2: any, b: any, c: any, d: any): number;
declare function calc_projection_axes(no: any): any;
declare function aabb_isect_line_3d(v1: any, v2: any, min: any, max: any): boolean;
declare function aabb_isect_cylinder_3d(v1: any, v2: any, radius: any, min: any, max: any): boolean;
declare function barycentric_v2(p: any, v1: any, v2: any, v3: any, axis1: number, axis2: number, out: any): any;
declare function closest_point_on_quad(p: any, v1: any, v2: any, v3: any, v4: any, n: any, uvw: any): any;
declare function closest_point_on_tri(p: any, v1: any, v2: any, v3: any, n: any, uvw: any): any;
declare function dist_to_tri_v3_old(co: any, v1: any, v2: any, v3: any, no: any): number;
declare function dist_to_tri_v3(p: any, v1: any, v2: any, v3: any, n: any): number;
declare function dist_to_tri_v3_sqr(p: any, v1: any, v2: any, v3: any, n: any): number;
declare function tri_area(v1: any, v2: any, v3: any): number;
declare function aabb_overlap_area(pos1: any, size1: any, pos2: any, size2: any): number;
declare function aabb_isect_2d(pos1: any, size1: any, pos2: any, size2: any): boolean;
declare function aabb_isect_3d(pos1: any, size1: any, pos2: any, size2: any): boolean;
declare function aabb_intersect_2d(pos1: any, size1: any, pos2: any, size2: any): any;
declare function aabb_intersect_3d(min1: any, max1: any, min2: any, max2: any): boolean;
declare function aabb_union(a2: any, b: any): any;
declare function aabb_union_2d(pos1: any, size1: any, pos2: any, size2: any): any;
declare function get_rect_points(p: any, size: any): any;
declare function get_rect_lines(p: any, size: any): any[][];
declare function simple_tri_aabb_isect(v1: any, v2: any, v3: any, min: any, max: any): boolean;
declare function winding_axis(a2: any, b: any, c: any, up_axis: any): boolean;
declare function winding(a2: any, b: any, c: any, zero_z?: boolean, tol?: number): boolean;
declare function inrect_2d(p: any, pos: any, size: any): boolean;
declare function aabb_isect_line_2d(v1: any, v2: any, min: any, max: any): boolean;
declare function expand_rect2d(pos: any, size: any, margin: any): void;
declare function expand_line(l: any, margin: any): any;
declare function colinear(a2: any, b: any, c: any, limit?: number, distLimit?: number): boolean;
declare function colinear2d(a2: any, b: any, c: any, limit?: number, precise?: boolean): boolean;
declare function corner_normal(vec1: any, vec2: any, width: any): any;
declare function line_line_isect(v1: any, v2: any, v3: any, v4: any, test_segment?: boolean): any;
declare function line_line_cross(a2: any, b: any, c: any, d: any): boolean;
declare function point_in_aabb_2d(p: any, min: any, max: any): boolean;
declare function aabb_sphere_isect_2d(p: any, r: any, min: any, max: any): boolean;
declare function point_in_aabb(p: any, min: any, max: any): boolean;
declare function aabb_sphere_isect(p: any, r: any, min: any, max: any): boolean;
declare function aabb_sphere_dist(p: any, min: any, max: any): any;
declare function point_in_tri(p: any, v1: any, v2: any, v3: any): boolean;
declare function quadIsConvex(v1: any, v2: any, v3: any, v4: any): boolean;
declare function isNum(f2: any): boolean;
declare function normal_tri(v1: any, v2: any, v3: any): any;
declare function normal_quad(v1: any, v2: any, v3: any, v4: any): any;
declare function normal_quad_old(v1: any, v2: any, v3: any, v4: any): any;
declare function line_isect(v1: any, v2: any, v3: any, v4: any, calc_t: any): any[];
declare function dist_to_line_2d(p: any, v1: any, v2: any, clip2: boolean, closest_co_out: any, t_out: any): any;
declare function dist_to_line_sqr(p: any, v1: any, v2: any, clip2?: boolean): number;
declare function dist_to_line(p: any, v1: any, v2: any, clip2?: boolean): number;
declare function clip_line_w(_v1: any, _v2: any, znear: any, zfar: any): boolean;
declare function closest_point_on_line(p: any, v1: any, v2: any, clip2?: boolean): any;
declare function circ_from_line_tan(a2: any, b: any, t: any): any;
declare function circ_from_line_tan_2d(a2: any, b: any, t: any): any;
declare function get_tri_circ(a2: any, b: any, c: any): any;
declare function gen_circle(m: any, origin: any, r: any, stfeps: any): any[];
declare function rot2d(v1: any, A: any, axis: any): void;
declare function makeCircleMesh(gl: any, radius: any, stfeps: any): any;
declare function minmax_verts(verts: any): any[];
declare function unproject(vec: any, ipers: any, iview: any): any;
declare function project(vec: any, pers: any, view: any): any;
declare function get_boundary_winding(points: any): boolean;
declare function isect_ray_plane(planeorigin: any, planenormal: any, rayorigin: any, raynormal: any): any;
declare function _old_isect_ray_plane(planeorigin: any, planenormal: any, rayorigin: any, raynormal: any): any;
declare function trilinear_v3(uvw: any, boxverts: any): any;
declare function point_in_hex(p: any, boxverts: any, boxfacecents: any, boxfacenormals: any): boolean;
declare function trilinear_co(p: any, boxverts: any): any;
declare function trilinear_co2(p: any, boxverts: any, uvw: any): any;
declare function tri_angles(v1: any, v2: any, v3: any): any;
declare function angle_between_vecs(v1: any, vcent: any, v2: any): number;
declare var ClosestModes: any, AbstractCurve: any, ClosestCurveRets: any, feps: any, COLINEAR: any, LINECROSS: any, COLINEAR_ISECT: any, SQRT2: any, FEPS_DATA: any, FEPS: any, FLOAT_MIN: any, FLOAT_MAX: any, Matrix4UI: any, MinMax1: any, MinMax: any, PlaneOps: any, Mat4Stack: any;
declare var parseutil_exports: {};
declare var DataPathSetOp: any;
declare var EquationCurve: any, GuassianCurve: any;
declare var ParamKey: any, SimpleCurveBase: any, BounceCurve: any, ElasticCurve: any, EaseCurve: any, RandCurve: any;
declare var Curve1DProperty: any;
declare function buildParser(): any;
declare function parseToolPath(str: any, check_tool_exists?: boolean): {
    toolclass: any;
    args: any;
};
declare function testToolParser(): {
    toolclass: any;
    args: any;
};
declare function initToolPaths(): void;
declare var ToolPaths: any, Parser: any;
declare var ModelInterface: any;
declare function pushReportName(name2: any): void;
declare function popReportName(): void;
declare function initSimpleController(): void;
declare function getDataPathToolOp(): any;
declare function setDataPathToolOp(cls: any): void;
declare var pathParser: any, DataStruct2: any, DataAPI2: any;
declare function rgb_to_hsv(r: any, g: any, b: any): any;
declare function hsv_to_rgb(h: any, s: any, v: any): any;
declare function cmyk_to_rgb(c: any, m: any, y: any, k: any): any;
declare function rgb_to_cmyk(r: any, g: any, b: any): any;
declare var const_default: any;
declare var CSSFont: any;
declare function parsepx2(css: any): number;
declare function color2css3(c: any, alpha_override: any): string;
declare function color2web(color: any): string;
declare function css2color2(color: any): any;
declare function web2color(str: any): any;
declare function validateWebColor(str: any): boolean;
declare function validateCSSColor(color: any): boolean;
declare function invertTheme(): void;
declare function setColorSchemeType(mode: any): void;
declare function exportTheme(themeIn?: any, addVarDecl?: boolean): string;
declare function copyTheme(themeObj: any): any;
declare var ThemeScrollBars: any, compatMap: any, ColorSchemeTypes: any, theme: any;
declare function setIconMap(icons: any): void;
declare var Icons: any;
declare var eventdag_exports: {};
declare function _setTextboxClass(cls: any): void;
declare function setTagPrefix(prefix: any): void;
declare function getTagPrefix(): any;
declare function setTheme(theme2: any): void;
declare function report2(...args: any[]): void;
declare function getDefault(key: any, elem: any): any;
declare function IsMobile(): any;
declare function iconSheetFromPackFlag(flag: any): number;
declare function getIconManager(): any;
declare function setIconManager(manager3: any, IconSheetsOverride: any): void;
declare function makeIconDiv(icon: any, sheet?: number): HTMLDivElement;
declare function styleScrollBars(color: string, color2: any, contrast?: number, width?: number, border?: string, selector?: string): string;
declare function calcThemeKey(digest?: any): any;
declare function flagThemeUpdate(): void;
declare function internalSetTimeout(cb: any, timeout?: number): void;
declare function drawRoundBox2(elem: any, options: any): void;
declare function drawRoundBox(elem: any, canvas: any, g: any, width: any, height: any, r: any, op: string, color: any, margin: any, no_clear?: boolean): void;
declare function _getFont_new(elem: any, size: any, font?: string, do_dpi?: boolean): any;
declare function getFont(elem: any, size: any, font?: string, do_dpi?: boolean): any;
declare function _getFont(elem: any, size: any, font?: string, do_dpi?: boolean): any;
declare function _ensureFont(elem: any, canvas: any, g: any, size: any): void;
declare function measureTextBlock(elem: any, text2: any, canvas: any, g: any, size: any, font: any): {
    width: number;
    height: number;
};
declare function measureText(elem: any, text2: any, canvas: any, g: any, size: any, font: any): any;
declare function drawText(elem: any, x: any, y: any, text2: any, args?: {}): void;
declare function saveUIData(node: any, key: any): string;
declare function loadUIData(node: any, buf: any): void;
declare var PackFlags: any, ElementClasses: any, ErrorColors: any, marginPaddingCSSKeys: any, CustomIcon: any, IconManager: any, iconmanager: any, IconSheets: any, dpistack: any, UIFlags: any, _testSetScrollbars: any, _themeUpdateKey: any, UIBase2: any;
declare var ButtonEventBase: any, Button: any, OldButton: any;
declare var html5_fileapi_exports: {};
declare function saveFile(data: any, filename?: string, _exts?: any[], mime?: string): void;
declare function loadFile(_filename?: string, exts?: any[]): Promise<unknown>;
declare function startMenuEventWrangling(screen: any): void;
declare function setWranglerScreen(screen: any): void;
declare function getWranglerScreen(): any;
declare function createMenu(ctx: any, title: any, templ: any): any;
declare function startMenu(menu: any, x: any, y: any, searchMenuMode?: boolean, safetyDelay?: number): void;
declare var SEP: any, Menu: any, DropBox: any, MenuWrangler: any, menuWrangler: any;
declare function isMimeText(mime: any): any;
declare function getMime(path: any): any;
declare var mimeMap: any, textMimes: any, PlatformAPI: any, FileDialogArgs: any, FilePath: any;
declare var electron_api_exports: {};
declare var TextBoxBase: {
    new (): {
        [x: string]: any;
    };
    [x: string]: any;
    define(): {
        tagname: string;
        modalKeyEvents: boolean;
    };
};
declare var TextBox2: {
    new (): {
        [x: string]: any;
        dom: any;
        _editing: boolean;
        _width: string;
        _textBoxEvents: boolean;
        _had_error: boolean;
        _modal: any;
        _focus: number;
        onend: any;
        "__#private@#radix": number;
        get radix(): number;
        set radix(_: number);
        decimalPlaces: any;
        baseUnit: any;
        displayUnit: any;
        get startSelected(): boolean;
        set startSelected(v: boolean);
        /** realtime dom attribute getter, defaults to true in absence of attribute*/
        get realtime(): boolean;
        set realtime(val: boolean);
        get isModal(): boolean;
        set isModal(val: boolean);
        _startModal(): void;
        _flash_focus(): void;
        get editing(): boolean;
        _endModal(ok: any): void;
        get tabIndex(): any;
        set tabIndex(val: any);
        init(): void;
        set width(val: any);
        setCSS(): void;
        background: any;
        updateDataPath(): void;
        internalDisabled: boolean;
        update(): void;
        select(): void;
        focus(): any;
        blur(): any;
        get text(): any;
        set text(value: any);
        _prop_update(prop: any, text2: any): void;
        _updatePathVal(text2: any): void;
        _change(text2: any): void;
    };
    define(): {
        tagname: string;
        style: string;
        modalKeyEvents: boolean;
    };
};
declare function checkForTextBox(screen: any, x: any, y: any): boolean;
declare var IconLabel: {
    new (): {
        [x: string]: any;
        _icon: any;
        iconsheet: any;
        get icon(): any;
        set icon(id: any);
        init(): void;
        setCSS(): void;
    };
    [x: string]: any;
    define(): {
        tagname: string;
    };
};
declare var ValueButtonBase: {
    new (): {
        [x: string]: any;
        _value: any;
        get value(): any;
        set value(val: any);
        updateDataPath(): void;
        internalDisabled: boolean;
        update(): void;
    };
    [x: string]: any;
};
declare var Check: {
    new (): {
        [x: string]: any;
        icon: number;
        iconsheet: number;
        _checked: any;
        _highlight: any;
        _focus: any;
        canvas: any;
        g: any;
        checkbox: any;
        _label: any;
        _updatekey: string;
        _last_dpi: number;
        get internalDisabled(): any;
        set internalDisabled(val: any);
        get value(): any;
        set value(v: any);
        get checked(): any;
        set checked(v: any);
        get label(): any;
        set label(l: any);
        init(): void;
        tabIndex: number;
        setCSS(): void;
        updateDataPath(): void;
        _repos_canvas(): void;
        _redraw(): void;
        updateDPI(): void;
        update(): void;
    };
    [x: string]: any;
    define(): {
        tagname: string;
        style: string;
        parentStyle: string;
    };
};
declare var IconButton: {
    new (): {
        [x: string]: any;
        _icon_pressed: any;
        _icon: any;
        iconsheet: any;
        _customIcon: any;
        _pressed: any;
        _highlight: any;
        _draw_pressed: any;
        drawButtonBG: any;
        _extraIcon: any;
        extraDom: any;
        _last_iconsheet: any;
        _onpress: any;
        dom: any;
        click(): void;
        get customIcon(): any;
        set customIcon(domImage: any);
        get icon(): any;
        set icon(val: any);
        _on_press(_e: any): void;
        _on_depress(_e: any): void;
        updateDefaultSize(): void;
        setCSS(): void;
        init(): void;
        tabIndex: number;
        update(): void;
        getIconSize(): any;
        /** Get the icon size plus any padding. */
        getSize(): any;
        _getsize(): any;
    };
    [x: string]: any;
    define(): {
        tagname: string;
        style: string;
    };
};
declare var IconCheck: {
    new (): {
        [x: string]: any;
        _checked: any;
        _drawCheck: any;
        get drawCheck(): any;
        set drawCheck(val: any);
        click(): void;
        get icon(): any;
        set icon(val: any);
        _icon: any;
        get checked(): any;
        set checked(val: any);
        get noEmboss(): boolean;
        set noEmboss(val: boolean);
        _updatePressed(val: any): void;
        _draw_pressed: any;
        _pressed: any;
        _on_depress(_e: any): void;
        _on_press(_e: any): void;
        updateDefaultSize(): void;
        _calcUpdateKey(): string;
        updateDataPath(): void;
        _icon_pressed: any;
        description: any;
        internalDisabled: boolean;
        updateDrawCheck(): void;
        _extraIcon: any;
        update(): void;
        _getsize(): any;
        setCSS(): void;
        iconsheet: any;
        _customIcon: any;
        _highlight: any;
        drawButtonBG: any;
        extraDom: any;
        _last_iconsheet: any;
        _onpress: any;
        dom: any;
        get customIcon(): any;
        set customIcon(domImage: any);
        init(): void;
        tabIndex: number;
        getIconSize(): any;
        /** Get the icon size plus any padding. */
        getSize(): any;
    };
    define(): {
        tagname: string;
        style: string;
        parentStyle: string;
    };
};
declare var Check1: {
    new (): {
        [x: string]: any;
        _value: any;
        _namePad: number;
        _redraw(draw_text?: boolean): void;
    };
    [x: string]: any;
    define(): {
        tagname: string;
        style: string;
        parentStyle: string;
    };
};
declare var Label: {
    new (): {
        [x: string]: any;
        _label: string;
        _lastText: string;
        _font: any;
        _last_font: any;
        _enabled_font: any;
        dom: HTMLDivElement;
        get font(): any;
        /**Set a font defined in ui_base.defaults
         e.g. DefaultText*/
        set font(fontDefaultName: any);
        get text(): string;
        set text(text2: string);
        init(): void;
        setCSS(): void;
        on_disabled(): void;
        on_enabled(): void;
        _updateFont(): void;
        updateDataPath(): void;
        update(): void;
    };
    [x: string]: any;
    define(): {
        tagname: string;
        style: string;
    };
};
declare var Container3: {
    new (): {
        [x: string]: any;
        "__#private@#dataPrefix": string;
        get dataPrefix(): string;
        set dataPrefix(_: string);
        "__#private@#massSetPrefix": string;
        get massSetPrefix(): string;
        set massSetPrefix(_: string);
        "__#private@#inherit_packflag": number;
        get inherit_packflag(): number;
        set inherit_packflag(_: number);
        styletag: any;
        reversed: boolean;
        storagePrefix: string;
        _prefixstack: any[];
        _mass_prefixstack: any[];
        noUndo(): /*elided*/ any;
        set background(bg: any);
        __background: any;
        get childWidgets(): any[];
        /** recursively change path prefix for all children*/
        changePathPrefix(newprefix: any): void;
        reverse(): /*elided*/ any;
        pushMassSetPrefix(val: any): /*elided*/ any;
        pushDataPrefix(val: any): /*elided*/ any;
        popDataPrefix(): /*elided*/ any;
        popMassSetPrefix(): /*elided*/ any;
        saveData(): {
            scrollTop: any;
            scrollLeft: any;
        } | {
            scrollTop?: undefined;
            scrollLeft?: undefined;
        };
        loadData(obj: any): /*elided*/ any;
        init(): void;
        /** Returns previous icon flags */
        useIcons: (enabled_or_sheet?: boolean) => number;
        /**
         *
         * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
         * @returns {Container}
         */
        wrap(mode?: string): Container;
        noMarginsOrPadding(): /*elided*/ any;
        setCSS(): void;
        overrideDefault(key: any, val: any): /*elided*/ any;
        strip(themeClass_or_obj: string, margin1: any, margin2: number, horiz: any): any;
        /**
         * tries to set margin along one axis only in smart manner
         * */
        oneAxisMargin(m?: any, m2?: number): /*elided*/ any;
        /**
         * tries to set padding along one axis only in smart manner
         * */
        oneAxisPadding(axisPadding?: any, otherPadding?: number): /*elided*/ any;
        setMargin(m: any): /*elided*/ any;
        setPadding(m: any): /*elided*/ any;
        setSize(width: any, height: any): /*elided*/ any;
        save(): void;
        load(): void;
        saveVisibility(): /*elided*/ any;
        loadVisibility(): boolean;
        toJSON(): any;
        _ondestroy(): void;
        loadJSON(obj: any): /*elided*/ any;
        redrawCurves(): void;
        listen(): void;
        update(): void;
        appendChild(child: any): any;
        clear(trigger_on_destroy?: boolean): void;
        prepend(child: any): void;
        _prepend(child: any): any;
        add(child: any): any;
        insert(i: any, ch: any): void;
        _add(child: any, prepend?: boolean): any;
        dynamicMenu(title: any, list5: any, packflag?: number): any;
        /**example usage:
        
           .menu([
           "some_tool_path.tool()|CustomLabel",
           ui_widgets.Menu.SEP,
           "some_tool_path.another_tool()",
           "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
           ["Name", () => {console.log("do something")}]
           ])
        
           **/
        menu(title: any, list5: any, packflag?: number): any;
        toolPanel(path_or_cls: any, args?: {}): any;
        tool(path_or_cls: any, packflag_or_args: number, createCb: any, label: any): any;
        textbox(inpath: any, text2: any, cb: any, packflag?: number): any;
        pathlabel(inpath: any, label: any, packflag?: number): any;
        label(text2: any): any;
        /**
         *
         * makes a button for a help picker tool
         * to view tooltips on mobile devices
         * */
        helppicker(): any;
        iconbutton(icon: any, description: any, cb: any, thisvar: any, packflag?: number): any;
        button(label: any, cb: any, thisvar: any, id: any, packflag?: number): any;
        _joinPrefix(path: any, prefix?: string): any;
        colorbutton(inpath: any, packflag: any, mass_set_path: any): any;
        noteframe(packflag?: number): any;
        curve1d(inpath: any, packflag: number, mass_set_path: any): any;
        vecpopup(inpath: any, packflag: number, mass_set_path: any): any;
        _getMassPath(ctx: any, inpath: any, mass_set_path: any): any;
        prop(inpath: any, packflag: number, mass_set_path: any): any;
        ctx: any;
        iconcheck(inpath: any, icon: any, description: any, mass_set_path: any): any;
        check(inpath: any, name2: any, packflag: number, mass_set_path: any): any;
        checkenum(inpath: any, name2: any, packflag: any, enummap: any, defaultval: any, callback: any, iconmap: any, mass_set_path: any): any;
        checkenum_panel(inpath: any, name2: any, packflag: number, callback: any, mass_set_path: any, prop: any): any;
        listenum(inpath: any, name2: any, enumDef: any, defaultval: any, callback: any, iconmap: any, packflag?: number): any;
        getroot(): /*elided*/ any;
        simpleslider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, isInt: any, do_redraw: any, callback: any, packflag?: number): any;
        /**
         *
         * usage: .slider(inpath, {
         *  name : bleh,
         *  defaultval : number,
         *  etc...
         * });
         * */
        slider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, is_int: any, do_redraw: any, callback: any, packflag: number, decimalPlaces: any): any;
        _container_inherit(elem: any, packflag?: number): void;
        treeview(): any;
        panel(name2: any, id: any, packflag: number, tooltip: any): any;
        row(packflag?: number): any;
        listbox(packflag?: number): any;
        table(packflag?: number): any;
        twocol(parentDepth?: number, packflag?: number): any;
        col(packflag?: number): any;
        colorPicker(inpath: any, packflag_or_args: number, mass_set_path: any, themeOverride: any): any;
        textarea(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        /**
         * html5 viewer
         * */
        viewer(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        tabs(position?: string, packflag?: number): any;
        asDialogFooter(): /*elided*/ any;
    };
    [x: string]: any;
    define(): {
        tagname: string;
    };
};
declare var RowFrame: {
    new (): {
        [x: string]: any;
        connectedCallback(): void;
        init(): void;
        oneAxisMargin(m?: any, m2?: number): /*elided*/ any;
        oneAxisPadding(m?: any, m2?: number): /*elided*/ any;
        update(): void;
        "__#private@#dataPrefix": string;
        get dataPrefix(): string;
        set dataPrefix(_: string);
        "__#private@#massSetPrefix": string;
        get massSetPrefix(): string;
        set massSetPrefix(_: string);
        "__#private@#inherit_packflag": number;
        get inherit_packflag(): number;
        set inherit_packflag(_: number);
        styletag: any;
        reversed: boolean;
        storagePrefix: string;
        _prefixstack: any[];
        _mass_prefixstack: any[];
        noUndo(): /*elided*/ any;
        set background(bg: any);
        __background: any;
        get childWidgets(): any[];
        /** recursively change path prefix for all children*/
        changePathPrefix(newprefix: any): void;
        reverse(): /*elided*/ any;
        pushMassSetPrefix(val: any): /*elided*/ any;
        pushDataPrefix(val: any): /*elided*/ any;
        popDataPrefix(): /*elided*/ any;
        popMassSetPrefix(): /*elided*/ any;
        saveData(): {
            scrollTop: any;
            scrollLeft: any;
        } | {
            scrollTop?: undefined;
            scrollLeft?: undefined;
        };
        loadData(obj: any): /*elided*/ any;
        /** Returns previous icon flags */
        useIcons: (enabled_or_sheet?: boolean) => number;
        /**
         *
         * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
         * @returns {Container}
         */
        wrap(mode?: string): Container;
        noMarginsOrPadding(): /*elided*/ any;
        setCSS(): void;
        overrideDefault(key: any, val: any): /*elided*/ any;
        strip(themeClass_or_obj: string, margin1: any, margin2: number, horiz: any): any;
        setMargin(m: any): /*elided*/ any;
        setPadding(m: any): /*elided*/ any;
        setSize(width: any, height: any): /*elided*/ any;
        save(): void;
        load(): void;
        saveVisibility(): /*elided*/ any;
        loadVisibility(): boolean;
        toJSON(): any;
        _ondestroy(): void;
        loadJSON(obj: any): /*elided*/ any;
        redrawCurves(): void;
        listen(): void;
        appendChild(child: any): any;
        clear(trigger_on_destroy?: boolean): void;
        prepend(child: any): void;
        _prepend(child: any): any;
        add(child: any): any;
        insert(i: any, ch: any): void;
        _add(child: any, prepend?: boolean): any;
        dynamicMenu(title: any, list5: any, packflag?: number): any;
        /**example usage:
        
           .menu([
           "some_tool_path.tool()|CustomLabel",
           ui_widgets.Menu.SEP,
           "some_tool_path.another_tool()",
           "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
           ["Name", () => {console.log("do something")}]
           ])
        
           **/
        menu(title: any, list5: any, packflag?: number): any;
        toolPanel(path_or_cls: any, args?: {}): any;
        tool(path_or_cls: any, packflag_or_args: number, createCb: any, label: any): any;
        textbox(inpath: any, text2: any, cb: any, packflag?: number): any;
        pathlabel(inpath: any, label: any, packflag?: number): any;
        label(text2: any): any;
        /**
         *
         * makes a button for a help picker tool
         * to view tooltips on mobile devices
         * */
        helppicker(): any;
        iconbutton(icon: any, description: any, cb: any, thisvar: any, packflag?: number): any;
        button(label: any, cb: any, thisvar: any, id: any, packflag?: number): any;
        _joinPrefix(path: any, prefix?: string): any;
        colorbutton(inpath: any, packflag: any, mass_set_path: any): any;
        noteframe(packflag?: number): any;
        curve1d(inpath: any, packflag: number, mass_set_path: any): any;
        vecpopup(inpath: any, packflag: number, mass_set_path: any): any;
        _getMassPath(ctx: any, inpath: any, mass_set_path: any): any;
        prop(inpath: any, packflag: number, mass_set_path: any): any;
        ctx: any;
        iconcheck(inpath: any, icon: any, description: any, mass_set_path: any): any;
        check(inpath: any, name2: any, packflag: number, mass_set_path: any): any;
        checkenum(inpath: any, name2: any, packflag: any, enummap: any, defaultval: any, callback: any, iconmap: any, mass_set_path: any): any;
        checkenum_panel(inpath: any, name2: any, packflag: number, callback: any, mass_set_path: any, prop: any): any;
        listenum(inpath: any, name2: any, enumDef: any, defaultval: any, callback: any, iconmap: any, packflag?: number): any;
        getroot(): /*elided*/ any;
        simpleslider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, isInt: any, do_redraw: any, callback: any, packflag?: number): any;
        /**
         *
         * usage: .slider(inpath, {
         *  name : bleh,
         *  defaultval : number,
         *  etc...
         * });
         * */
        slider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, is_int: any, do_redraw: any, callback: any, packflag: number, decimalPlaces: any): any;
        _container_inherit(elem: any, packflag?: number): void;
        treeview(): any;
        panel(name2: any, id: any, packflag: number, tooltip: any): any;
        row(packflag?: number): any;
        listbox(packflag?: number): any;
        table(packflag?: number): any;
        twocol(parentDepth?: number, packflag?: number): any;
        col(packflag?: number): any;
        colorPicker(inpath: any, packflag_or_args: number, mass_set_path: any, themeOverride: any): any;
        textarea(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        /**
         * html5 viewer
         * */
        viewer(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        tabs(position?: string, packflag?: number): any;
        asDialogFooter(): /*elided*/ any;
    };
    define(): {
        tagname: string;
    };
};
declare var ColumnFrame: {
    new (): {
        [x: string]: any;
        init(): void;
        update(): void;
        oneAxisMargin(m?: any, m2?: number): /*elided*/ any;
        oneAxisPadding(m?: any, m2?: number): /*elided*/ any;
        "__#private@#dataPrefix": string;
        get dataPrefix(): string;
        set dataPrefix(_: string);
        "__#private@#massSetPrefix": string;
        get massSetPrefix(): string;
        set massSetPrefix(_: string);
        "__#private@#inherit_packflag": number;
        get inherit_packflag(): number;
        set inherit_packflag(_: number);
        styletag: any;
        reversed: boolean;
        storagePrefix: string;
        _prefixstack: any[];
        _mass_prefixstack: any[];
        noUndo(): /*elided*/ any;
        set background(bg: any);
        __background: any;
        get childWidgets(): any[];
        /** recursively change path prefix for all children*/
        changePathPrefix(newprefix: any): void;
        reverse(): /*elided*/ any;
        pushMassSetPrefix(val: any): /*elided*/ any;
        pushDataPrefix(val: any): /*elided*/ any;
        popDataPrefix(): /*elided*/ any;
        popMassSetPrefix(): /*elided*/ any;
        saveData(): {
            scrollTop: any;
            scrollLeft: any;
        } | {
            scrollTop?: undefined;
            scrollLeft?: undefined;
        };
        loadData(obj: any): /*elided*/ any;
        /** Returns previous icon flags */
        useIcons: (enabled_or_sheet?: boolean) => number;
        /**
         *
         * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
         * @returns {Container}
         */
        wrap(mode?: string): Container;
        noMarginsOrPadding(): /*elided*/ any;
        setCSS(): void;
        overrideDefault(key: any, val: any): /*elided*/ any;
        strip(themeClass_or_obj: string, margin1: any, margin2: number, horiz: any): any;
        setMargin(m: any): /*elided*/ any;
        setPadding(m: any): /*elided*/ any;
        setSize(width: any, height: any): /*elided*/ any;
        save(): void;
        load(): void;
        saveVisibility(): /*elided*/ any;
        loadVisibility(): boolean;
        toJSON(): any;
        _ondestroy(): void;
        loadJSON(obj: any): /*elided*/ any;
        redrawCurves(): void;
        listen(): void;
        appendChild(child: any): any;
        clear(trigger_on_destroy?: boolean): void;
        prepend(child: any): void;
        _prepend(child: any): any;
        add(child: any): any;
        insert(i: any, ch: any): void;
        _add(child: any, prepend?: boolean): any;
        dynamicMenu(title: any, list5: any, packflag?: number): any;
        /**example usage:
        
           .menu([
           "some_tool_path.tool()|CustomLabel",
           ui_widgets.Menu.SEP,
           "some_tool_path.another_tool()",
           "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
           ["Name", () => {console.log("do something")}]
           ])
        
           **/
        menu(title: any, list5: any, packflag?: number): any;
        toolPanel(path_or_cls: any, args?: {}): any;
        tool(path_or_cls: any, packflag_or_args: number, createCb: any, label: any): any;
        textbox(inpath: any, text2: any, cb: any, packflag?: number): any;
        pathlabel(inpath: any, label: any, packflag?: number): any;
        label(text2: any): any;
        /**
         *
         * makes a button for a help picker tool
         * to view tooltips on mobile devices
         * */
        helppicker(): any;
        iconbutton(icon: any, description: any, cb: any, thisvar: any, packflag?: number): any;
        button(label: any, cb: any, thisvar: any, id: any, packflag?: number): any;
        _joinPrefix(path: any, prefix?: string): any;
        colorbutton(inpath: any, packflag: any, mass_set_path: any): any;
        noteframe(packflag?: number): any;
        curve1d(inpath: any, packflag: number, mass_set_path: any): any;
        vecpopup(inpath: any, packflag: number, mass_set_path: any): any;
        _getMassPath(ctx: any, inpath: any, mass_set_path: any): any;
        prop(inpath: any, packflag: number, mass_set_path: any): any;
        ctx: any;
        iconcheck(inpath: any, icon: any, description: any, mass_set_path: any): any;
        check(inpath: any, name2: any, packflag: number, mass_set_path: any): any;
        checkenum(inpath: any, name2: any, packflag: any, enummap: any, defaultval: any, callback: any, iconmap: any, mass_set_path: any): any;
        checkenum_panel(inpath: any, name2: any, packflag: number, callback: any, mass_set_path: any, prop: any): any;
        listenum(inpath: any, name2: any, enumDef: any, defaultval: any, callback: any, iconmap: any, packflag?: number): any;
        getroot(): /*elided*/ any;
        simpleslider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, isInt: any, do_redraw: any, callback: any, packflag?: number): any;
        /**
         *
         * usage: .slider(inpath, {
         *  name : bleh,
         *  defaultval : number,
         *  etc...
         * });
         * */
        slider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, is_int: any, do_redraw: any, callback: any, packflag: number, decimalPlaces: any): any;
        _container_inherit(elem: any, packflag?: number): void;
        treeview(): any;
        panel(name2: any, id: any, packflag: number, tooltip: any): any;
        row(packflag?: number): any;
        listbox(packflag?: number): any;
        table(packflag?: number): any;
        twocol(parentDepth?: number, packflag?: number): any;
        col(packflag?: number): any;
        colorPicker(inpath: any, packflag_or_args: number, mass_set_path: any, themeOverride: any): any;
        textarea(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        /**
         * html5 viewer
         * */
        viewer(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        tabs(position?: string, packflag?: number): any;
        asDialogFooter(): /*elided*/ any;
    };
    define(): {
        tagname: string;
    };
};
declare var TableFrame: {
    new (): {
        [x: string]: any;
        "__#private@#dataPrefix": string;
        get dataPrefix(): string;
        set dataPrefix(_: string);
        "__#private@#massSetPrefix": string;
        get massSetPrefix(): string;
        set massSetPrefix(_: string);
        "__#private@#inherit_packflag": number;
        get inherit_packflag(): number;
        set inherit_packflag(_: number);
        styletag: any;
        reversed: boolean;
        storagePrefix: string;
        _prefixstack: any[];
        _mass_prefixstack: any[];
        noUndo(): /*elided*/ any;
        set background(bg: any);
        __background: any;
        get childWidgets(): any[];
        /** recursively change path prefix for all children*/
        changePathPrefix(newprefix: any): void;
        reverse(): /*elided*/ any;
        pushMassSetPrefix(val: any): /*elided*/ any;
        pushDataPrefix(val: any): /*elided*/ any;
        popDataPrefix(): /*elided*/ any;
        popMassSetPrefix(): /*elided*/ any;
        saveData(): {
            scrollTop: any;
            scrollLeft: any;
        } | {
            scrollTop?: undefined;
            scrollLeft?: undefined;
        };
        loadData(obj: any): /*elided*/ any;
        init(): void;
        /** Returns previous icon flags */
        useIcons: (enabled_or_sheet?: boolean) => number;
        /**
         *
         * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
         * @returns {Container}
         */
        wrap(mode?: string): Container;
        noMarginsOrPadding(): /*elided*/ any;
        setCSS(): void;
        overrideDefault(key: any, val: any): /*elided*/ any;
        strip(themeClass_or_obj: string, margin1: any, margin2: number, horiz: any): any;
        /**
         * tries to set margin along one axis only in smart manner
         * */
        oneAxisMargin(m?: any, m2?: number): /*elided*/ any;
        /**
         * tries to set padding along one axis only in smart manner
         * */
        oneAxisPadding(axisPadding?: any, otherPadding?: number): /*elided*/ any;
        setMargin(m: any): /*elided*/ any;
        setPadding(m: any): /*elided*/ any;
        setSize(width: any, height: any): /*elided*/ any;
        save(): void;
        load(): void;
        saveVisibility(): /*elided*/ any;
        loadVisibility(): boolean;
        toJSON(): any;
        _ondestroy(): void;
        loadJSON(obj: any): /*elided*/ any;
        redrawCurves(): void;
        listen(): void;
        update(): void;
        appendChild(child: any): any;
        clear(trigger_on_destroy?: boolean): void;
        prepend(child: any): void;
        _prepend(child: any): any;
        add(child: any): any;
        insert(i: any, ch: any): void;
        _add(child: any, prepend?: boolean): any;
        dynamicMenu(title: any, list5: any, packflag?: number): any;
        /**example usage:
        
           .menu([
           "some_tool_path.tool()|CustomLabel",
           ui_widgets.Menu.SEP,
           "some_tool_path.another_tool()",
           "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
           ["Name", () => {console.log("do something")}]
           ])
        
           **/
        menu(title: any, list5: any, packflag?: number): any;
        toolPanel(path_or_cls: any, args?: {}): any;
        tool(path_or_cls: any, packflag_or_args: number, createCb: any, label: any): any;
        textbox(inpath: any, text2: any, cb: any, packflag?: number): any;
        pathlabel(inpath: any, label: any, packflag?: number): any;
        label(text2: any): any;
        /**
         *
         * makes a button for a help picker tool
         * to view tooltips on mobile devices
         * */
        helppicker(): any;
        iconbutton(icon: any, description: any, cb: any, thisvar: any, packflag?: number): any;
        button(label: any, cb: any, thisvar: any, id: any, packflag?: number): any;
        _joinPrefix(path: any, prefix?: string): any;
        colorbutton(inpath: any, packflag: any, mass_set_path: any): any;
        noteframe(packflag?: number): any;
        curve1d(inpath: any, packflag: number, mass_set_path: any): any;
        vecpopup(inpath: any, packflag: number, mass_set_path: any): any;
        _getMassPath(ctx: any, inpath: any, mass_set_path: any): any;
        prop(inpath: any, packflag: number, mass_set_path: any): any;
        ctx: any;
        iconcheck(inpath: any, icon: any, description: any, mass_set_path: any): any;
        check(inpath: any, name2: any, packflag: number, mass_set_path: any): any;
        checkenum(inpath: any, name2: any, packflag: any, enummap: any, defaultval: any, callback: any, iconmap: any, mass_set_path: any): any;
        checkenum_panel(inpath: any, name2: any, packflag: number, callback: any, mass_set_path: any, prop: any): any;
        listenum(inpath: any, name2: any, enumDef: any, defaultval: any, callback: any, iconmap: any, packflag?: number): any;
        getroot(): /*elided*/ any;
        simpleslider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, isInt: any, do_redraw: any, callback: any, packflag?: number): any;
        /**
         *
         * usage: .slider(inpath, {
         *  name : bleh,
         *  defaultval : number,
         *  etc...
         * });
         * */
        slider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, is_int: any, do_redraw: any, callback: any, packflag: number, decimalPlaces: any): any;
        _container_inherit(elem: any, packflag?: number): void;
        treeview(): any;
        panel(name2: any, id: any, packflag: number, tooltip: any): any;
        row(packflag?: number): any;
        listbox(packflag?: number): any;
        table(packflag?: number): any;
        twocol(parentDepth?: number, packflag?: number): any;
        col(packflag?: number): any;
        colorPicker(inpath: any, packflag_or_args: number, mass_set_path: any, themeOverride: any): any;
        textarea(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        /**
         * html5 viewer
         * */
        viewer(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        tabs(position?: string, packflag?: number): any;
        asDialogFooter(): /*elided*/ any;
    };
    define(): {
        tagname: string;
    };
};
declare var TwoColumnFrame: {
    new (): {
        [x: string]: any;
        _colWidth: number;
        parentDepth: number;
        get colWidth(): number;
        set colWidth(v: number);
        init(): void;
        update(): void;
        "__#private@#dataPrefix": string;
        get dataPrefix(): string;
        set dataPrefix(_: string);
        "__#private@#massSetPrefix": string;
        get massSetPrefix(): string;
        set massSetPrefix(_: string);
        "__#private@#inherit_packflag": number;
        get inherit_packflag(): number;
        set inherit_packflag(_: number);
        styletag: any;
        reversed: boolean;
        storagePrefix: string;
        _prefixstack: any[];
        _mass_prefixstack: any[];
        noUndo(): /*elided*/ any;
        set background(bg: any);
        __background: any;
        get childWidgets(): any[];
        /** recursively change path prefix for all children*/
        changePathPrefix(newprefix: any): void;
        reverse(): /*elided*/ any;
        pushMassSetPrefix(val: any): /*elided*/ any;
        pushDataPrefix(val: any): /*elided*/ any;
        popDataPrefix(): /*elided*/ any;
        popMassSetPrefix(): /*elided*/ any;
        saveData(): {
            scrollTop: any;
            scrollLeft: any;
        } | {
            scrollTop?: undefined;
            scrollLeft?: undefined;
        };
        loadData(obj: any): /*elided*/ any;
        /** Returns previous icon flags */
        useIcons: (enabled_or_sheet?: boolean) => number;
        /**
         *
         * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
         * @returns {Container}
         */
        wrap(mode?: string): Container;
        noMarginsOrPadding(): /*elided*/ any;
        setCSS(): void;
        overrideDefault(key: any, val: any): /*elided*/ any;
        strip(themeClass_or_obj: string, margin1: any, margin2: number, horiz: any): any;
        /**
         * tries to set margin along one axis only in smart manner
         * */
        oneAxisMargin(m?: any, m2?: number): /*elided*/ any;
        /**
         * tries to set padding along one axis only in smart manner
         * */
        oneAxisPadding(axisPadding?: any, otherPadding?: number): /*elided*/ any;
        setMargin(m: any): /*elided*/ any;
        setPadding(m: any): /*elided*/ any;
        setSize(width: any, height: any): /*elided*/ any;
        save(): void;
        load(): void;
        saveVisibility(): /*elided*/ any;
        loadVisibility(): boolean;
        toJSON(): any;
        _ondestroy(): void;
        loadJSON(obj: any): /*elided*/ any;
        redrawCurves(): void;
        listen(): void;
        appendChild(child: any): any;
        clear(trigger_on_destroy?: boolean): void;
        prepend(child: any): void;
        _prepend(child: any): any;
        add(child: any): any;
        insert(i: any, ch: any): void;
        _add(child: any, prepend?: boolean): any;
        dynamicMenu(title: any, list5: any, packflag?: number): any;
        /**example usage:
        
           .menu([
           "some_tool_path.tool()|CustomLabel",
           ui_widgets.Menu.SEP,
           "some_tool_path.another_tool()",
           "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
           ["Name", () => {console.log("do something")}]
           ])
        
           **/
        menu(title: any, list5: any, packflag?: number): any;
        toolPanel(path_or_cls: any, args?: {}): any;
        tool(path_or_cls: any, packflag_or_args: number, createCb: any, label: any): any;
        textbox(inpath: any, text2: any, cb: any, packflag?: number): any;
        pathlabel(inpath: any, label: any, packflag?: number): any;
        label(text2: any): any;
        /**
         *
         * makes a button for a help picker tool
         * to view tooltips on mobile devices
         * */
        helppicker(): any;
        iconbutton(icon: any, description: any, cb: any, thisvar: any, packflag?: number): any;
        button(label: any, cb: any, thisvar: any, id: any, packflag?: number): any;
        _joinPrefix(path: any, prefix?: string): any;
        colorbutton(inpath: any, packflag: any, mass_set_path: any): any;
        noteframe(packflag?: number): any;
        curve1d(inpath: any, packflag: number, mass_set_path: any): any;
        vecpopup(inpath: any, packflag: number, mass_set_path: any): any;
        _getMassPath(ctx: any, inpath: any, mass_set_path: any): any;
        prop(inpath: any, packflag: number, mass_set_path: any): any;
        ctx: any;
        iconcheck(inpath: any, icon: any, description: any, mass_set_path: any): any;
        check(inpath: any, name2: any, packflag: number, mass_set_path: any): any;
        checkenum(inpath: any, name2: any, packflag: any, enummap: any, defaultval: any, callback: any, iconmap: any, mass_set_path: any): any;
        checkenum_panel(inpath: any, name2: any, packflag: number, callback: any, mass_set_path: any, prop: any): any;
        listenum(inpath: any, name2: any, enumDef: any, defaultval: any, callback: any, iconmap: any, packflag?: number): any;
        getroot(): /*elided*/ any;
        simpleslider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, isInt: any, do_redraw: any, callback: any, packflag?: number): any;
        /**
         *
         * usage: .slider(inpath, {
         *  name : bleh,
         *  defaultval : number,
         *  etc...
         * });
         * */
        slider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, is_int: any, do_redraw: any, callback: any, packflag: number, decimalPlaces: any): any;
        _container_inherit(elem: any, packflag?: number): void;
        treeview(): any;
        panel(name2: any, id: any, packflag: number, tooltip: any): any;
        row(packflag?: number): any;
        listbox(packflag?: number): any;
        table(packflag?: number): any;
        twocol(parentDepth?: number, packflag?: number): any;
        col(packflag?: number): any;
        colorPicker(inpath: any, packflag_or_args: number, mass_set_path: any, themeOverride: any): any;
        textarea(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        /**
         * html5 viewer
         * */
        viewer(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        tabs(position?: string, packflag?: number): any;
        asDialogFooter(): /*elided*/ any;
    };
    define(): {
        tagname: string;
    };
};
declare var sliderDomAttributes: Set<string>;
declare var SliderDefaults: {
    stepIsRelative: boolean;
    expRate: number;
    radix: number;
    decimalPlaces: number;
    baseUnit: string;
    displayUnit: string;
    slideSpeed: number;
    step: number;
    sliderDisplayExp: number;
};
declare var NumSlider: {
    new (): {
        [x: string]: any;
        _last_label: any;
        mdown: any;
        ma: any;
        mpos: any;
        start_mpos: any;
        _last_overarrow: any;
        vertical: any;
        _last_disabled: any;
        _last_width: any;
        last_time: any;
        _on_click: any;
        __pressed: any;
        _name: any;
        _value: any;
        expRate: number;
        range: number[];
        isInt: boolean;
        editAsBaseUnit: any;
        loadNumConstraints(prop: any, dom: any, onModifiedCallback: any): void;
        get value(): any;
        set value(val: any);
        /** Current name label.  If set to null label will
         * be pulled from the datapath api.*/
        get name(): any;
        /** Current name label.  If set to null label will
         * be pulled from the datapath api.*/
        set name(name2: any);
        updateWidth(w_add?: number): void;
        updateDataPath(): void;
        update(): void;
        clipboardCopy(): void;
        clipboardPaste(): void;
        swapWithTextbox(): void;
        hidden: boolean;
        bindEvents(): void;
        _highlight: boolean;
        overArrow(x: any, y: any): any;
        doRange(): void;
        setValue(value: any, fire_onchange?: boolean, setDataPath?: boolean, checkConstraints?: boolean): void;
        setMpos(e: any): void;
        dragStart(e: any): void;
        get _pressed(): any;
        set _pressed(v: any);
        setCSS(unused_setBG: any, fromRedraw: any): void;
        _repos_canvas(): void;
        updateDefaultSize(): void;
        updateName(force: any): void;
        _genLabel(): any;
        _redraw(fromCSS: any): void;
        _getArrowSize(): number;
        internalDisabled: boolean;
    };
    define(): {
        tagname: string;
        style: string;
        parentStyle: string;
        havePickClipboard: boolean;
    };
};
declare var NumSliderSimpleBase: {
    new (): {
        [x: string]: any;
        canvas: any;
        g: any;
        highlight: any;
        _value: any;
        ma: any;
        _focus: any;
        modal: any;
        _last_slider_key: any;
        baseUnit: any;
        displayUnit: any;
        editAsBaseUnit: any;
        sliderDisplayExp: any;
        isInt: boolean;
        range: number[];
        uiRange: any;
        step: number;
        loadNumConstraints(prop: any, dom: any, onModifiedCallback: any): void;
        get value(): any;
        set value(val: any);
        setValue(val: any, fire_onchange?: boolean, setDataPath?: boolean): void;
        updateDataPath(): void;
        _setFromMouse(e: any): void;
        _startModal(e: any): void;
        init(): void;
        setHighlight(e: any): void;
        _redraw(): void;
        isOverButton(e: any): boolean;
        _invertButtonX(x: any): any;
        _getButtonPos(): any[];
        setCSS(): void;
        updateSize(): void;
        _ondestroy(): void;
        update(): void;
        tabIndex: number;
    };
    [x: string]: any;
    define(): {
        tagname: string;
        style: string;
        parentStyle: string;
    };
};
declare var SliderWithTextbox: {
    new (): {
        [x: string]: any;
        _value: any;
        _name: any;
        _lock_textbox: any;
        _labelOnTop: any;
        _last_label_on_top: any;
        container: any;
        _last_value: any;
        _textbox: any;
        get addLabel(): any;
        set addLabel(v: any);
        /**
         * whether to put label on top or to the left of sliders
         *
         * If undefined value will be either this.getAtttribute("labelOnTop"),
         * if "labelOnTop" attribute exists, or it will be this.getDefault("labelOnTop")
         * (theme default)
         **/
        get labelOnTop(): boolean;
        set labelOnTop(v: boolean);
        get numslider(): any;
        set numslider(v: any);
        _numslider: any;
        get editAsBaseUnit(): any;
        set editAsBaseUnit(v: any);
        get range(): any;
        set range(v: any);
        get step(): any;
        set step(v: any);
        get expRate(): any;
        set expRate(v: any);
        get decimalPlaces(): any;
        set decimalPlaces(v: any);
        get isInt(): any;
        set isInt(v: any);
        get slideSpeed(): any;
        set slideSpeed(v: any);
        get sliderDisplayExp(): any;
        set sliderDisplayExp(v: any);
        get radix(): any;
        set radix(v: any);
        get stepIsRelative(): any;
        set stepIsRelative(v: any);
        get displayUnit(): any;
        set displayUnit(val: any);
        get baseUnit(): any;
        set baseUnit(val: any);
        get realTimeTextBox(): boolean;
        set realTimeTextBox(val: boolean);
        get value(): any;
        set value(val: any);
        init(): void;
        rebuild(): void;
        l: any;
        updateTextBox(): void;
        linkTextBox(): void;
        setValue(val: any, fire_onchange?: boolean): void;
        updateName(): void;
        updateLabelOnTop(): void;
        updateDataPath(): void;
        update(): void;
        setCSS(): void;
        "__#private@#dataPrefix": string;
        get dataPrefix(): string;
        set dataPrefix(_: string);
        "__#private@#massSetPrefix": string;
        get massSetPrefix(): string;
        set massSetPrefix(_: string);
        "__#private@#inherit_packflag": number;
        get inherit_packflag(): number;
        set inherit_packflag(_: number);
        styletag: any;
        reversed: boolean;
        storagePrefix: string;
        _prefixstack: any[];
        _mass_prefixstack: any[];
        noUndo(): /*elided*/ any;
        set background(bg: any);
        __background: any;
        get childWidgets(): any[];
        /** recursively change path prefix for all children*/
        changePathPrefix(newprefix: any): void;
        reverse(): /*elided*/ any;
        pushMassSetPrefix(val: any): /*elided*/ any;
        pushDataPrefix(val: any): /*elided*/ any;
        popDataPrefix(): /*elided*/ any;
        popMassSetPrefix(): /*elided*/ any;
        saveData(): {
            scrollTop: any;
            scrollLeft: any;
        } | {
            scrollTop?: undefined;
            scrollLeft?: undefined;
        };
        loadData(obj: any): /*elided*/ any;
        /** Returns previous icon flags */
        useIcons: (enabled_or_sheet?: boolean) => number;
        /**
         *
         * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
         * @returns {Container}
         */
        wrap(mode?: string): Container;
        noMarginsOrPadding(): /*elided*/ any;
        overrideDefault(key: any, val: any): /*elided*/ any;
        strip(themeClass_or_obj: string, margin1: any, margin2: number, horiz: any): any;
        setMargin(m: any): /*elided*/ any;
        setPadding(m: any): /*elided*/ any;
        setSize(width: any, height: any): /*elided*/ any;
        save(): void;
        load(): void;
        saveVisibility(): /*elided*/ any;
        loadVisibility(): boolean;
        toJSON(): any;
        _ondestroy(): void;
        loadJSON(obj: any): /*elided*/ any;
        redrawCurves(): void;
        listen(): void;
        appendChild(child: any): any;
        clear(trigger_on_destroy?: boolean): void;
        prepend(child: any): void;
        _prepend(child: any): any;
        add(child: any): any;
        insert(i: any, ch: any): void;
        _add(child: any, prepend?: boolean): any;
        dynamicMenu(title: any, list5: any, packflag?: number): any;
        /**example usage:
        
           .menu([
           "some_tool_path.tool()|CustomLabel",
           ui_widgets.Menu.SEP,
           "some_tool_path.another_tool()",
           "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
           ["Name", () => {console.log("do something")}]
           ])
        
           **/
        menu(title: any, list5: any, packflag?: number): any;
        toolPanel(path_or_cls: any, args?: {}): any;
        tool(path_or_cls: any, packflag_or_args: number, createCb: any, label: any): any;
        textbox(inpath: any, text2: any, cb: any, packflag?: number): any;
        pathlabel(inpath: any, label: any, packflag?: number): any;
        label(text2: any): any;
        /**
         *
         * makes a button for a help picker tool
         * to view tooltips on mobile devices
         * */
        helppicker(): any;
        iconbutton(icon: any, description: any, cb: any, thisvar: any, packflag?: number): any;
        button(label: any, cb: any, thisvar: any, id: any, packflag?: number): any;
        _joinPrefix(path: any, prefix?: string): any;
        colorbutton(inpath: any, packflag: any, mass_set_path: any): any;
        noteframe(packflag?: number): any;
        curve1d(inpath: any, packflag: number, mass_set_path: any): any;
        vecpopup(inpath: any, packflag: number, mass_set_path: any): any;
        _getMassPath(ctx: any, inpath: any, mass_set_path: any): any;
        prop(inpath: any, packflag: number, mass_set_path: any): any;
        ctx: any;
        iconcheck(inpath: any, icon: any, description: any, mass_set_path: any): any;
        check(inpath: any, name2: any, packflag: number, mass_set_path: any): any;
        checkenum(inpath: any, name2: any, packflag: any, enummap: any, defaultval: any, callback: any, iconmap: any, mass_set_path: any): any;
        checkenum_panel(inpath: any, name2: any, packflag: number, callback: any, mass_set_path: any, prop: any): any;
        listenum(inpath: any, name2: any, enumDef: any, defaultval: any, callback: any, iconmap: any, packflag?: number): any;
        getroot(): /*elided*/ any;
        simpleslider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, isInt: any, do_redraw: any, callback: any, packflag?: number): any;
        /**
         *
         * usage: .slider(inpath, {
         *  name : bleh,
         *  defaultval : number,
         *  etc...
         * });
         * */
        slider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, is_int: any, do_redraw: any, callback: any, packflag: number, decimalPlaces: any): any;
        _container_inherit(elem: any, packflag?: number): void;
        treeview(): any;
        panel(name2: any, id: any, packflag: number, tooltip: any): any;
        row(packflag?: number): any;
        listbox(packflag?: number): any;
        table(packflag?: number): any;
        twocol(parentDepth?: number, packflag?: number): any;
        col(packflag?: number): any;
        colorPicker(inpath: any, packflag_or_args: number, mass_set_path: any, themeOverride: any): any;
        textarea(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        /**
         * html5 viewer
         * */
        viewer(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        tabs(position?: string, packflag?: number): any;
        asDialogFooter(): /*elided*/ any;
        oneAxisMargin(m?: any, m2?: number): /*elided*/ any;
        oneAxisPadding(m?: any, m2?: number): /*elided*/ any;
    };
    define(): {
        tagname: string;
    };
};
declare var NumSliderSimple: {
    new (): {
        [x: string]: any;
        numslider: any;
        _redraw(): void;
        "__#private@#dataPrefix": string;
        get dataPrefix(): string;
        set dataPrefix(_: string);
        "__#private@#massSetPrefix": string;
        get massSetPrefix(): string;
        set massSetPrefix(_: string);
        "__#private@#inherit_packflag": number;
        get inherit_packflag(): number;
        set inherit_packflag(_: number);
        styletag: any;
        reversed: boolean;
        storagePrefix: string;
        _prefixstack: any[];
        _mass_prefixstack: any[];
        noUndo(): /*elided*/ any;
        set background(bg: any);
        __background: any;
        get childWidgets(): any[];
        /** recursively change path prefix for all children*/
        changePathPrefix(newprefix: any): void;
        reverse(): /*elided*/ any;
        pushMassSetPrefix(val: any): /*elided*/ any;
        pushDataPrefix(val: any): /*elided*/ any;
        popDataPrefix(): /*elided*/ any;
        popMassSetPrefix(): /*elided*/ any;
        saveData(): {
            scrollTop: any;
            scrollLeft: any;
        } | {
            scrollTop?: undefined;
            scrollLeft?: undefined;
        };
        loadData(obj: any): /*elided*/ any;
        /** Returns previous icon flags */
        useIcons: (enabled_or_sheet?: boolean) => number;
        /**
         *
         * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
         * @returns {Container}
         */
        wrap(mode?: string): Container;
        noMarginsOrPadding(): /*elided*/ any;
        overrideDefault(key: any, val: any): /*elided*/ any;
        strip(themeClass_or_obj: string, margin1: any, margin2: number, horiz: any): any;
        setMargin(m: any): /*elided*/ any;
        setPadding(m: any): /*elided*/ any;
        setSize(width: any, height: any): /*elided*/ any;
        save(): void;
        load(): void;
        saveVisibility(): /*elided*/ any;
        loadVisibility(): boolean;
        toJSON(): any;
        _ondestroy(): void;
        loadJSON(obj: any): /*elided*/ any;
        redrawCurves(): void;
        listen(): void;
        appendChild(child: any): any;
        clear(trigger_on_destroy?: boolean): void;
        prepend(child: any): void;
        _prepend(child: any): any;
        add(child: any): any;
        insert(i: any, ch: any): void;
        _add(child: any, prepend?: boolean): any;
        dynamicMenu(title: any, list5: any, packflag?: number): any;
        /**example usage:
        
           .menu([
           "some_tool_path.tool()|CustomLabel",
           ui_widgets.Menu.SEP,
           "some_tool_path.another_tool()",
           "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
           ["Name", () => {console.log("do something")}]
           ])
        
           **/
        menu(title: any, list5: any, packflag?: number): any;
        toolPanel(path_or_cls: any, args?: {}): any;
        tool(path_or_cls: any, packflag_or_args: number, createCb: any, label: any): any;
        textbox(inpath: any, text2: any, cb: any, packflag?: number): any;
        pathlabel(inpath: any, label: any, packflag?: number): any;
        label(text2: any): any;
        /**
         *
         * makes a button for a help picker tool
         * to view tooltips on mobile devices
         * */
        helppicker(): any;
        iconbutton(icon: any, description: any, cb: any, thisvar: any, packflag?: number): any;
        button(label: any, cb: any, thisvar: any, id: any, packflag?: number): any;
        _joinPrefix(path: any, prefix?: string): any;
        colorbutton(inpath: any, packflag: any, mass_set_path: any): any;
        noteframe(packflag?: number): any;
        curve1d(inpath: any, packflag: number, mass_set_path: any): any;
        vecpopup(inpath: any, packflag: number, mass_set_path: any): any;
        _getMassPath(ctx: any, inpath: any, mass_set_path: any): any;
        prop(inpath: any, packflag: number, mass_set_path: any): any;
        ctx: any;
        iconcheck(inpath: any, icon: any, description: any, mass_set_path: any): any;
        check(inpath: any, name2: any, packflag: number, mass_set_path: any): any;
        checkenum(inpath: any, name2: any, packflag: any, enummap: any, defaultval: any, callback: any, iconmap: any, mass_set_path: any): any;
        checkenum_panel(inpath: any, name2: any, packflag: number, callback: any, mass_set_path: any, prop: any): any;
        listenum(inpath: any, name2: any, enumDef: any, defaultval: any, callback: any, iconmap: any, packflag?: number): any;
        getroot(): /*elided*/ any;
        simpleslider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, isInt: any, do_redraw: any, callback: any, packflag?: number): any;
        /**
         *
         * usage: .slider(inpath, {
         *  name : bleh,
         *  defaultval : number,
         *  etc...
         * });
         * */
        slider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, is_int: any, do_redraw: any, callback: any, packflag: number, decimalPlaces: any): any;
        _container_inherit(elem: any, packflag?: number): void;
        treeview(): any;
        panel(name2: any, id: any, packflag: number, tooltip: any): any;
        row(packflag?: number): any;
        listbox(packflag?: number): any;
        table(packflag?: number): any;
        twocol(parentDepth?: number, packflag?: number): any;
        col(packflag?: number): any;
        colorPicker(inpath: any, packflag_or_args: number, mass_set_path: any, themeOverride: any): any;
        textarea(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        /**
         * html5 viewer
         * */
        viewer(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        tabs(position?: string, packflag?: number): any;
        asDialogFooter(): /*elided*/ any;
        oneAxisMargin(m?: any, m2?: number): /*elided*/ any;
        oneAxisPadding(m?: any, m2?: number): /*elided*/ any;
        _value: any;
        _name: any;
        _lock_textbox: any;
        _labelOnTop: any;
        _last_label_on_top: any;
        container: any;
        _last_value: any;
        _textbox: any;
        get addLabel(): any;
        set addLabel(v: any);
        /**
         * whether to put label on top or to the left of sliders
         *
         * If undefined value will be either this.getAtttribute("labelOnTop"),
         * if "labelOnTop" attribute exists, or it will be this.getDefault("labelOnTop")
         * (theme default)
         **/
        get labelOnTop(): boolean;
        set labelOnTop(v: boolean);
        _numslider: any;
        get editAsBaseUnit(): any;
        set editAsBaseUnit(v: any);
        get range(): any;
        set range(v: any);
        get step(): any;
        set step(v: any);
        get expRate(): any;
        set expRate(v: any);
        get decimalPlaces(): any;
        set decimalPlaces(v: any);
        get isInt(): any;
        set isInt(v: any);
        get slideSpeed(): any;
        set slideSpeed(v: any);
        get sliderDisplayExp(): any;
        set sliderDisplayExp(v: any);
        get radix(): any;
        set radix(v: any);
        get stepIsRelative(): any;
        set stepIsRelative(v: any);
        get displayUnit(): any;
        set displayUnit(val: any);
        get baseUnit(): any;
        set baseUnit(val: any);
        get realTimeTextBox(): boolean;
        set realTimeTextBox(val: boolean);
        get value(): any;
        set value(val: any);
        init(): void;
        rebuild(): void;
        l: any;
        updateTextBox(): void;
        linkTextBox(): void;
        setValue(val: any, fire_onchange?: boolean): void;
        updateName(): void;
        updateLabelOnTop(): void;
        updateDataPath(): void;
        update(): void;
        setCSS(): void;
    };
    define(): {
        tagname: string;
        style: string;
    };
};
declare var NumSliderWithTextBox: {
    new (): {
        [x: string]: any;
        numslider: any;
        update(): void;
        _redraw(): void;
        "__#private@#dataPrefix": string;
        get dataPrefix(): string;
        set dataPrefix(_: string);
        "__#private@#massSetPrefix": string;
        get massSetPrefix(): string;
        set massSetPrefix(_: string);
        "__#private@#inherit_packflag": number;
        get inherit_packflag(): number;
        set inherit_packflag(_: number);
        styletag: any;
        reversed: boolean;
        storagePrefix: string;
        _prefixstack: any[];
        _mass_prefixstack: any[];
        noUndo(): /*elided*/ any;
        set background(bg: any);
        __background: any;
        get childWidgets(): any[];
        /** recursively change path prefix for all children*/
        changePathPrefix(newprefix: any): void;
        reverse(): /*elided*/ any;
        pushMassSetPrefix(val: any): /*elided*/ any;
        pushDataPrefix(val: any): /*elided*/ any;
        popDataPrefix(): /*elided*/ any;
        popMassSetPrefix(): /*elided*/ any;
        saveData(): {
            scrollTop: any;
            scrollLeft: any;
        } | {
            scrollTop?: undefined;
            scrollLeft?: undefined;
        };
        loadData(obj: any): /*elided*/ any;
        /** Returns previous icon flags */
        useIcons: (enabled_or_sheet?: boolean) => number;
        /**
         *
         * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
         * @returns {Container}
         */
        wrap(mode?: string): Container;
        noMarginsOrPadding(): /*elided*/ any;
        overrideDefault(key: any, val: any): /*elided*/ any;
        strip(themeClass_or_obj: string, margin1: any, margin2: number, horiz: any): any;
        setMargin(m: any): /*elided*/ any;
        setPadding(m: any): /*elided*/ any;
        setSize(width: any, height: any): /*elided*/ any;
        save(): void;
        load(): void;
        saveVisibility(): /*elided*/ any;
        loadVisibility(): boolean;
        toJSON(): any;
        _ondestroy(): void;
        loadJSON(obj: any): /*elided*/ any;
        redrawCurves(): void;
        listen(): void;
        appendChild(child: any): any;
        clear(trigger_on_destroy?: boolean): void;
        prepend(child: any): void;
        _prepend(child: any): any;
        add(child: any): any;
        insert(i: any, ch: any): void;
        _add(child: any, prepend?: boolean): any;
        dynamicMenu(title: any, list5: any, packflag?: number): any;
        /**example usage:
        
           .menu([
           "some_tool_path.tool()|CustomLabel",
           ui_widgets.Menu.SEP,
           "some_tool_path.another_tool()",
           "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
           ["Name", () => {console.log("do something")}]
           ])
        
           **/
        menu(title: any, list5: any, packflag?: number): any;
        toolPanel(path_or_cls: any, args?: {}): any;
        tool(path_or_cls: any, packflag_or_args: number, createCb: any, label: any): any;
        textbox(inpath: any, text2: any, cb: any, packflag?: number): any;
        pathlabel(inpath: any, label: any, packflag?: number): any;
        label(text2: any): any;
        /**
         *
         * makes a button for a help picker tool
         * to view tooltips on mobile devices
         * */
        helppicker(): any;
        iconbutton(icon: any, description: any, cb: any, thisvar: any, packflag?: number): any;
        button(label: any, cb: any, thisvar: any, id: any, packflag?: number): any;
        _joinPrefix(path: any, prefix?: string): any;
        colorbutton(inpath: any, packflag: any, mass_set_path: any): any;
        noteframe(packflag?: number): any;
        curve1d(inpath: any, packflag: number, mass_set_path: any): any;
        vecpopup(inpath: any, packflag: number, mass_set_path: any): any;
        _getMassPath(ctx: any, inpath: any, mass_set_path: any): any;
        prop(inpath: any, packflag: number, mass_set_path: any): any;
        ctx: any;
        iconcheck(inpath: any, icon: any, description: any, mass_set_path: any): any;
        check(inpath: any, name2: any, packflag: number, mass_set_path: any): any;
        checkenum(inpath: any, name2: any, packflag: any, enummap: any, defaultval: any, callback: any, iconmap: any, mass_set_path: any): any;
        checkenum_panel(inpath: any, name2: any, packflag: number, callback: any, mass_set_path: any, prop: any): any;
        listenum(inpath: any, name2: any, enumDef: any, defaultval: any, callback: any, iconmap: any, packflag?: number): any;
        getroot(): /*elided*/ any;
        simpleslider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, isInt: any, do_redraw: any, callback: any, packflag?: number): any;
        /**
         *
         * usage: .slider(inpath, {
         *  name : bleh,
         *  defaultval : number,
         *  etc...
         * });
         * */
        slider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, is_int: any, do_redraw: any, callback: any, packflag: number, decimalPlaces: any): any;
        _container_inherit(elem: any, packflag?: number): void;
        treeview(): any;
        panel(name2: any, id: any, packflag: number, tooltip: any): any;
        row(packflag?: number): any;
        listbox(packflag?: number): any;
        table(packflag?: number): any;
        twocol(parentDepth?: number, packflag?: number): any;
        col(packflag?: number): any;
        colorPicker(inpath: any, packflag_or_args: number, mass_set_path: any, themeOverride: any): any;
        textarea(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        /**
         * html5 viewer
         * */
        viewer(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        tabs(position?: string, packflag?: number): any;
        asDialogFooter(): /*elided*/ any;
        oneAxisMargin(m?: any, m2?: number): /*elided*/ any;
        oneAxisPadding(m?: any, m2?: number): /*elided*/ any;
        _value: any;
        _name: any;
        _lock_textbox: any;
        _labelOnTop: any;
        _last_label_on_top: any;
        container: any;
        _last_value: any;
        _textbox: any;
        get addLabel(): any;
        set addLabel(v: any);
        /**
         * whether to put label on top or to the left of sliders
         *
         * If undefined value will be either this.getAtttribute("labelOnTop"),
         * if "labelOnTop" attribute exists, or it will be this.getDefault("labelOnTop")
         * (theme default)
         **/
        get labelOnTop(): boolean;
        set labelOnTop(v: boolean);
        _numslider: any;
        get editAsBaseUnit(): any;
        set editAsBaseUnit(v: any);
        get range(): any;
        set range(v: any);
        get step(): any;
        set step(v: any);
        get expRate(): any;
        set expRate(v: any);
        get decimalPlaces(): any;
        set decimalPlaces(v: any);
        get isInt(): any;
        set isInt(v: any);
        get slideSpeed(): any;
        set slideSpeed(v: any);
        get sliderDisplayExp(): any;
        set sliderDisplayExp(v: any);
        get radix(): any;
        set radix(v: any);
        get stepIsRelative(): any;
        set stepIsRelative(v: any);
        get displayUnit(): any;
        set displayUnit(val: any);
        get baseUnit(): any;
        set baseUnit(val: any);
        get realTimeTextBox(): boolean;
        set realTimeTextBox(val: boolean);
        get value(): any;
        set value(val: any);
        init(): void;
        rebuild(): void;
        l: any;
        updateTextBox(): void;
        linkTextBox(): void;
        setValue(val: any, fire_onchange?: boolean): void;
        updateName(): void;
        updateLabelOnTop(): void;
        updateDataPath(): void;
        setCSS(): void;
    };
    define(): {
        tagname: string;
        style: string;
    };
};
declare var domTransferAttrs: Set<string>;
declare var domEventAttrs: Set<string>;
declare function parseXML(xml: any): Document;
declare var customHandlers: {};
declare function initPage(ctx: any, xml: any, parentContainer: any, templateVars?: {}, templateScope?: {}): any;
declare function loadPage(ctx: any, url: any, parentContainer_or_args: any, loadSourceOnly: boolean, modifySourceCB: any, templateVars: any, templateScope: any): Promise<unknown>;
declare var RichEditor: {
    new (): {
        [x: string]: any;
        _internalDisabled: any;
        _value: any;
        textOnlyMode: any;
        styletag: any;
        controls: any;
        textarea: any;
        _focus: any;
        formatStart(): void;
        formatLine(line: any, text2: any): any;
        toggleStrikeThru(): void;
        formatEnd(): void;
        init(): void;
        get internalDisabled(): any;
        set internalDisabled(val: any);
        get value(): any;
        set value(val: any);
        setCSS(): void;
        updateDataPath(): void;
        update(): void;
    };
    define(): {
        tagname: string;
        style: string;
        modalKeyEvents: boolean;
    };
};
declare var RichViewer: {
    new (): {
        [x: string]: any;
        contents: any;
        _value: any;
        hideScrollBars(): void;
        showScrollBars(): void;
        textTransform(text2: any): any;
        get value(): any;
        set value(val: any);
        updateDataPath(): void;
        internalDisabled: boolean;
        update(): void;
    };
    [x: string]: any;
    define(): {
        tagname: string;
        style: string;
    };
};
declare var VectorPopupButton: {
    new (): {
        [x: string]: any;
        _value: any;
        get value(): any;
        set value(v: any);
        castValue(): any;
        _onpress: (e: any) => void;
        updateDataPath(): void;
        internalDisabled: boolean;
        update(): void;
    };
    [x: string]: any;
    define(): {
        tagname: string;
        style: string;
    };
};
declare var VectorPanel: {
    new (): {
        [x: string]: any;
        _value: any;
        axes: any;
        sliders: any;
        hasUniformSlider: any;
        __range: any;
        _range: any;
        uslider: any;
        castValue(): any;
        get value(): any;
        set value(v: any);
        range: number[];
        name: string;
        init(): void;
        background: any;
        _getNumParam(key: any): any;
        _setNumParam(key: any, val: any): void;
        rebuild(): void;
        get uniformValue(): number;
        set uniformValue(val: number);
        setValue(value: any): /*elided*/ any;
        updateDataPath(): void;
        internalDisabled: boolean;
        update(): void;
        "__#private@#dataPrefix": string;
        get dataPrefix(): string;
        set dataPrefix(_: string);
        "__#private@#massSetPrefix": string;
        get massSetPrefix(): string;
        set massSetPrefix(_: string);
        "__#private@#inherit_packflag": number;
        get inherit_packflag(): number;
        set inherit_packflag(_: number);
        styletag: any;
        reversed: boolean;
        storagePrefix: string;
        _prefixstack: any[];
        _mass_prefixstack: any[];
        noUndo(): /*elided*/ any;
        __background: any;
        get childWidgets(): any[];
        /** recursively change path prefix for all children*/
        changePathPrefix(newprefix: any): void;
        reverse(): /*elided*/ any;
        pushMassSetPrefix(val: any): /*elided*/ any;
        pushDataPrefix(val: any): /*elided*/ any;
        popDataPrefix(): /*elided*/ any;
        popMassSetPrefix(): /*elided*/ any;
        saveData(): {
            scrollTop: any;
            scrollLeft: any;
        } | {
            scrollTop?: undefined;
            scrollLeft?: undefined;
        };
        loadData(obj: any): /*elided*/ any;
        /** Returns previous icon flags */
        useIcons: (enabled_or_sheet?: boolean) => number;
        /**
         *
         * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
         * @returns {Container}
         */
        wrap(mode?: string): Container;
        noMarginsOrPadding(): /*elided*/ any;
        setCSS(): void;
        overrideDefault(key: any, val: any): /*elided*/ any;
        strip(themeClass_or_obj: string, margin1: any, margin2: number, horiz: any): any;
        setMargin(m: any): /*elided*/ any;
        setPadding(m: any): /*elided*/ any;
        setSize(width: any, height: any): /*elided*/ any;
        save(): void;
        load(): void;
        saveVisibility(): /*elided*/ any;
        loadVisibility(): boolean;
        toJSON(): any;
        _ondestroy(): void;
        loadJSON(obj: any): /*elided*/ any;
        redrawCurves(): void;
        listen(): void;
        appendChild(child: any): any;
        clear(trigger_on_destroy?: boolean): void;
        prepend(child: any): void;
        _prepend(child: any): any;
        add(child: any): any;
        insert(i: any, ch: any): void;
        _add(child: any, prepend?: boolean): any;
        dynamicMenu(title: any, list5: any, packflag?: number): any;
        /**example usage:
        
           .menu([
           "some_tool_path.tool()|CustomLabel",
           ui_widgets.Menu.SEP,
           "some_tool_path.another_tool()",
           "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
           ["Name", () => {console.log("do something")}]
           ])
        
           **/
        menu(title: any, list5: any, packflag?: number): any;
        toolPanel(path_or_cls: any, args?: {}): any;
        tool(path_or_cls: any, packflag_or_args: number, createCb: any, label: any): any;
        textbox(inpath: any, text2: any, cb: any, packflag?: number): any;
        pathlabel(inpath: any, label: any, packflag?: number): any;
        label(text2: any): any;
        /**
         *
         * makes a button for a help picker tool
         * to view tooltips on mobile devices
         * */
        helppicker(): any;
        iconbutton(icon: any, description: any, cb: any, thisvar: any, packflag?: number): any;
        button(label: any, cb: any, thisvar: any, id: any, packflag?: number): any;
        _joinPrefix(path: any, prefix?: string): any;
        colorbutton(inpath: any, packflag: any, mass_set_path: any): any;
        noteframe(packflag?: number): any;
        curve1d(inpath: any, packflag: number, mass_set_path: any): any;
        vecpopup(inpath: any, packflag: number, mass_set_path: any): any;
        _getMassPath(ctx: any, inpath: any, mass_set_path: any): any;
        prop(inpath: any, packflag: number, mass_set_path: any): any;
        ctx: any;
        iconcheck(inpath: any, icon: any, description: any, mass_set_path: any): any;
        check(inpath: any, name2: any, packflag: number, mass_set_path: any): any;
        checkenum(inpath: any, name2: any, packflag: any, enummap: any, defaultval: any, callback: any, iconmap: any, mass_set_path: any): any;
        checkenum_panel(inpath: any, name2: any, packflag: number, callback: any, mass_set_path: any, prop: any): any;
        listenum(inpath: any, name2: any, enumDef: any, defaultval: any, callback: any, iconmap: any, packflag?: number): any;
        getroot(): /*elided*/ any;
        simpleslider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, isInt: any, do_redraw: any, callback: any, packflag?: number): any;
        /**
         *
         * usage: .slider(inpath, {
         *  name : bleh,
         *  defaultval : number,
         *  etc...
         * });
         * */
        slider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, is_int: any, do_redraw: any, callback: any, packflag: number, decimalPlaces: any): any;
        _container_inherit(elem: any, packflag?: number): void;
        treeview(): any;
        panel(name2: any, id: any, packflag: number, tooltip: any): any;
        row(packflag?: number): any;
        listbox(packflag?: number): any;
        table(packflag?: number): any;
        twocol(parentDepth?: number, packflag?: number): any;
        col(packflag?: number): any;
        colorPicker(inpath: any, packflag_or_args: number, mass_set_path: any, themeOverride: any): any;
        textarea(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        /**
         * html5 viewer
         * */
        viewer(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        tabs(position?: string, packflag?: number): any;
        asDialogFooter(): /*elided*/ any;
        oneAxisMargin(m?: any, m2?: number): /*elided*/ any;
        oneAxisPadding(m?: any, m2?: number): /*elided*/ any;
    };
    define(): {
        tagname: string;
    };
};
declare var ToolTip: {
    new (): {
        [x: string]: any;
        div: any;
        _start_time: any;
        timeout: any;
        _popup: any;
        visibleToPick: boolean;
        end(): void;
        init(): void;
        get text(): any;
        set text(val: any);
        _estimateSize(): number[];
        update(): void;
        setCSS(): void;
        background: any;
    };
    [x: string]: any;
    show(message2: any, screen: any, x: any, y: any): any;
    define(): {
        tagname: string;
        style: string;
    };
};
declare var Curve1DWidget: {
    new (): {
        [x: string]: any;
        "__#private@#in_onchange": number;
        _value: any;
        drawTransform: any;
        _gen_type: any;
        _lastGen: any;
        _last_dpi: any;
        canvas: any;
        g: any;
        container: any;
        dropbox: any;
        _lastu: any;
        useDataPathUndo: boolean;
        /**
         * Checks if a curve1d instance exists at dom attribute "datapath"
         * and if it does adds curve1d event handlers to it.
         *
         * Note: it's impossible to know for sure that a widget is truly dead,
         * e.g. it could be hidden in a panel or something.  Curve1d's event
         * handling system takes a callback that checks if a callback should
         * be removed, which we provide by testing this.isConnected.
         *
         * Since this is not robust we have to check regularly if we need to add
         * Curve1D event handlers, which is why this function exists.
         */
        checkCurve1dEvents(): void;
        disabled: boolean;
        get value(): any;
        set value(val: any);
        _on_draw(_e: any): void;
        _on_change(): void;
        init(): void;
        setCSS(): void;
        updateSize(): void;
        _redraw(): void;
        rebuild(): void;
        updateDataPath(): void;
        updateGenUI(): void;
        update(): void;
        "__#private@#dataPrefix": string;
        get dataPrefix(): string;
        set dataPrefix(_: string);
        "__#private@#massSetPrefix": string;
        get massSetPrefix(): string;
        set massSetPrefix(_: string);
        "__#private@#inherit_packflag": number;
        get inherit_packflag(): number;
        set inherit_packflag(_: number);
        styletag: any;
        reversed: boolean;
        storagePrefix: string;
        _prefixstack: any[];
        _mass_prefixstack: any[];
        noUndo(): /*elided*/ any;
        set background(bg: any);
        __background: any;
        get childWidgets(): any[];
        /** recursively change path prefix for all children*/
        changePathPrefix(newprefix: any): void;
        reverse(): /*elided*/ any;
        pushMassSetPrefix(val: any): /*elided*/ any;
        pushDataPrefix(val: any): /*elided*/ any;
        popDataPrefix(): /*elided*/ any;
        popMassSetPrefix(): /*elided*/ any;
        saveData(): {
            scrollTop: any;
            scrollLeft: any;
        } | {
            scrollTop?: undefined;
            scrollLeft?: undefined;
        };
        loadData(obj: any): /*elided*/ any;
        /** Returns previous icon flags */
        useIcons: (enabled_or_sheet?: boolean) => number;
        /**
         *
         * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
         * @returns {Container}
         */
        wrap(mode?: string): Container;
        noMarginsOrPadding(): /*elided*/ any;
        overrideDefault(key: any, val: any): /*elided*/ any;
        strip(themeClass_or_obj: string, margin1: any, margin2: number, horiz: any): any;
        setMargin(m: any): /*elided*/ any;
        setPadding(m: any): /*elided*/ any;
        setSize(width: any, height: any): /*elided*/ any;
        save(): void;
        load(): void;
        saveVisibility(): /*elided*/ any;
        loadVisibility(): boolean;
        toJSON(): any;
        _ondestroy(): void;
        loadJSON(obj: any): /*elided*/ any;
        redrawCurves(): void;
        listen(): void;
        appendChild(child: any): any;
        clear(trigger_on_destroy?: boolean): void;
        prepend(child: any): void;
        _prepend(child: any): any;
        add(child: any): any;
        insert(i: any, ch: any): void;
        _add(child: any, prepend?: boolean): any;
        dynamicMenu(title: any, list5: any, packflag?: number): any;
        /**example usage:
        
           .menu([
           "some_tool_path.tool()|CustomLabel",
           ui_widgets.Menu.SEP,
           "some_tool_path.another_tool()",
           "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
           ["Name", () => {console.log("do something")}]
           ])
        
           **/
        menu(title: any, list5: any, packflag?: number): any;
        toolPanel(path_or_cls: any, args?: {}): any;
        tool(path_or_cls: any, packflag_or_args: number, createCb: any, label: any): any;
        textbox(inpath: any, text2: any, cb: any, packflag?: number): any;
        pathlabel(inpath: any, label: any, packflag?: number): any;
        label(text2: any): any;
        /**
         *
         * makes a button for a help picker tool
         * to view tooltips on mobile devices
         * */
        helppicker(): any;
        iconbutton(icon: any, description: any, cb: any, thisvar: any, packflag?: number): any;
        button(label: any, cb: any, thisvar: any, id: any, packflag?: number): any;
        _joinPrefix(path: any, prefix?: string): any;
        colorbutton(inpath: any, packflag: any, mass_set_path: any): any;
        noteframe(packflag?: number): any;
        curve1d(inpath: any, packflag: number, mass_set_path: any): any;
        vecpopup(inpath: any, packflag: number, mass_set_path: any): any;
        _getMassPath(ctx: any, inpath: any, mass_set_path: any): any;
        prop(inpath: any, packflag: number, mass_set_path: any): any;
        ctx: any;
        iconcheck(inpath: any, icon: any, description: any, mass_set_path: any): any;
        check(inpath: any, name2: any, packflag: number, mass_set_path: any): any;
        checkenum(inpath: any, name2: any, packflag: any, enummap: any, defaultval: any, callback: any, iconmap: any, mass_set_path: any): any;
        checkenum_panel(inpath: any, name2: any, packflag: number, callback: any, mass_set_path: any, prop: any): any;
        listenum(inpath: any, name2: any, enumDef: any, defaultval: any, callback: any, iconmap: any, packflag?: number): any;
        getroot(): /*elided*/ any;
        simpleslider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, isInt: any, do_redraw: any, callback: any, packflag?: number): any;
        /**
         *
         * usage: .slider(inpath, {
         *  name : bleh,
         *  defaultval : number,
         *  etc...
         * });
         * */
        slider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, is_int: any, do_redraw: any, callback: any, packflag: number, decimalPlaces: any): any;
        _container_inherit(elem: any, packflag?: number): void;
        treeview(): any;
        panel(name2: any, id: any, packflag: number, tooltip: any): any;
        row(packflag?: number): any;
        listbox(packflag?: number): any;
        table(packflag?: number): any;
        twocol(parentDepth?: number, packflag?: number): any;
        col(packflag?: number): any;
        colorPicker(inpath: any, packflag_or_args: number, mass_set_path: any, themeOverride: any): any;
        textarea(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        /**
         * html5 viewer
         * */
        viewer(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        tabs(position?: string, packflag?: number): any;
        asDialogFooter(): /*elided*/ any;
        oneAxisMargin(m?: any, m2?: number): /*elided*/ any;
        oneAxisPadding(m?: any, m2?: number): /*elided*/ any;
    };
    define(): {
        tagname: string;
        style: string;
    };
};
declare var PanelContents2: {
    new (): {
        [x: string]: any;
        get openClosedIcon(): any;
        get closed(): any;
        set closed(v: any);
        get parentPanel(): any;
        remove(): void;
        "__#private@#dataPrefix": string;
        get dataPrefix(): string;
        set dataPrefix(_: string);
        "__#private@#massSetPrefix": string;
        get massSetPrefix(): string;
        set massSetPrefix(_: string);
        "__#private@#inherit_packflag": number;
        get inherit_packflag(): number;
        set inherit_packflag(_: number);
        styletag: any;
        reversed: boolean;
        storagePrefix: string;
        _prefixstack: any[];
        _mass_prefixstack: any[];
        noUndo(): /*elided*/ any;
        set background(bg: any);
        __background: any;
        get childWidgets(): any[];
        /** recursively change path prefix for all children*/
        changePathPrefix(newprefix: any): void;
        reverse(): /*elided*/ any;
        pushMassSetPrefix(val: any): /*elided*/ any;
        pushDataPrefix(val: any): /*elided*/ any;
        popDataPrefix(): /*elided*/ any;
        popMassSetPrefix(): /*elided*/ any;
        saveData(): {
            scrollTop: any;
            scrollLeft: any;
        } | {
            scrollTop?: undefined;
            scrollLeft?: undefined;
        };
        loadData(obj: any): /*elided*/ any;
        /** Returns previous icon flags */
        useIcons: (enabled_or_sheet?: boolean) => number;
        /**
         *
         * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
         * @returns {Container}
         */
        wrap(mode?: string): Container;
        noMarginsOrPadding(): /*elided*/ any;
        setCSS(): void;
        overrideDefault(key: any, val: any): /*elided*/ any;
        strip(themeClass_or_obj: string, margin1: any, margin2: number, horiz: any): any;
        setMargin(m: any): /*elided*/ any;
        setPadding(m: any): /*elided*/ any;
        setSize(width: any, height: any): /*elided*/ any;
        save(): void;
        load(): void;
        saveVisibility(): /*elided*/ any;
        loadVisibility(): boolean;
        toJSON(): any;
        _ondestroy(): void;
        loadJSON(obj: any): /*elided*/ any;
        redrawCurves(): void;
        listen(): void;
        appendChild(child: any): any;
        clear(trigger_on_destroy?: boolean): void;
        prepend(child: any): void;
        _prepend(child: any): any;
        add(child: any): any;
        insert(i: any, ch: any): void;
        _add(child: any, prepend?: boolean): any;
        dynamicMenu(title: any, list5: any, packflag?: number): any;
        /**example usage:
        
           .menu([
           "some_tool_path.tool()|CustomLabel",
           ui_widgets.Menu.SEP,
           "some_tool_path.another_tool()",
           "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
           ["Name", () => {console.log("do something")}]
           ])
        
           **/
        menu(title: any, list5: any, packflag?: number): any;
        toolPanel(path_or_cls: any, args?: {}): any;
        tool(path_or_cls: any, packflag_or_args: number, createCb: any, label: any): any;
        textbox(inpath: any, text2: any, cb: any, packflag?: number): any;
        pathlabel(inpath: any, label: any, packflag?: number): any;
        label(text2: any): any;
        /**
         *
         * makes a button for a help picker tool
         * to view tooltips on mobile devices
         * */
        helppicker(): any;
        iconbutton(icon: any, description: any, cb: any, thisvar: any, packflag?: number): any;
        button(label: any, cb: any, thisvar: any, id: any, packflag?: number): any;
        _joinPrefix(path: any, prefix?: string): any;
        colorbutton(inpath: any, packflag: any, mass_set_path: any): any;
        noteframe(packflag?: number): any;
        curve1d(inpath: any, packflag: number, mass_set_path: any): any;
        vecpopup(inpath: any, packflag: number, mass_set_path: any): any;
        _getMassPath(ctx: any, inpath: any, mass_set_path: any): any;
        prop(inpath: any, packflag: number, mass_set_path: any): any;
        ctx: any;
        iconcheck(inpath: any, icon: any, description: any, mass_set_path: any): any;
        check(inpath: any, name2: any, packflag: number, mass_set_path: any): any;
        checkenum(inpath: any, name2: any, packflag: any, enummap: any, defaultval: any, callback: any, iconmap: any, mass_set_path: any): any;
        checkenum_panel(inpath: any, name2: any, packflag: number, callback: any, mass_set_path: any, prop: any): any;
        listenum(inpath: any, name2: any, enumDef: any, defaultval: any, callback: any, iconmap: any, packflag?: number): any;
        getroot(): /*elided*/ any;
        simpleslider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, isInt: any, do_redraw: any, callback: any, packflag?: number): any;
        /**
         *
         * usage: .slider(inpath, {
         *  name : bleh,
         *  defaultval : number,
         *  etc...
         * });
         * */
        slider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, is_int: any, do_redraw: any, callback: any, packflag: number, decimalPlaces: any): any;
        _container_inherit(elem: any, packflag?: number): void;
        treeview(): any;
        panel(name2: any, id: any, packflag: number, tooltip: any): any;
        row(packflag?: number): any;
        listbox(packflag?: number): any;
        table(packflag?: number): any;
        twocol(parentDepth?: number, packflag?: number): any;
        col(packflag?: number): any;
        colorPicker(inpath: any, packflag_or_args: number, mass_set_path: any, themeOverride: any): any;
        textarea(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        /**
         * html5 viewer
         * */
        viewer(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        tabs(position?: string, packflag?: number): any;
        asDialogFooter(): /*elided*/ any;
        init(): void;
        update(): void;
        oneAxisMargin(m?: any, m2?: number): /*elided*/ any;
        oneAxisPadding(m?: any, m2?: number): /*elided*/ any;
    };
    define(): {
        tagname: string;
    };
};
declare var PanelFrame: {
    new (): {
        [x: string]: any;
        titleframe: any;
        contents: any;
        _iconcheckWidget: any;
        __label: any;
        _closed: any;
        _state: any;
        _panel: any;
        get openCloseIcon(): any;
        createContents(): any;
        get inherit_packflag(): any;
        set inherit_packflag(val: any);
        get packflag(): any;
        set packflag(val: any);
        appendChild(child: any): any;
        get headerLabel(): any;
        set headerLabel(v: any);
        get dataPrefix(): any;
        set dataPrefix(v: any);
        get closed(): any;
        set closed(val: any);
        setHeaderToolTip(tooltip: any): void;
        saveData(): ({
            scrollTop: any;
            scrollLeft: any;
        } | {
            scrollTop?: undefined;
            scrollLeft?: undefined;
        }) & {
            closed: any;
        };
        loadData(obj: any): /*elided*/ any;
        clear(): /*elided*/ any;
        makeHeader(): void;
        init(): void;
        background: any;
        setCSS(): void;
        on_disabled(): void;
        on_enabled(): void;
        update(): void;
        _onchange(isClosed: any): void;
        setAttribute(key: any, value: any): void;
        get noUpdateClosedContents(): boolean;
        set noUpdateClosedContents(v: boolean);
        _setVisible(isClosed: any, changed: any): void;
        _updateClosed(changed: any): void;
        "__#private@#dataPrefix": string;
        "__#private@#massSetPrefix": string;
        get massSetPrefix(): string;
        set massSetPrefix(_: string);
        "__#private@#inherit_packflag": number;
        styletag: any;
        reversed: boolean;
        storagePrefix: string;
        _prefixstack: any[];
        _mass_prefixstack: any[];
        noUndo(): /*elided*/ any;
        __background: any;
        get childWidgets(): any[];
        /** recursively change path prefix for all children*/
        changePathPrefix(newprefix: any): void;
        reverse(): /*elided*/ any;
        pushMassSetPrefix(val: any): /*elided*/ any;
        pushDataPrefix(val: any): /*elided*/ any;
        popDataPrefix(): /*elided*/ any;
        popMassSetPrefix(): /*elided*/ any;
        /** Returns previous icon flags */
        useIcons: (enabled_or_sheet?: boolean) => number;
        /**
         *
         * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
         * @returns {Container}
         */
        wrap(mode?: string): Container;
        noMarginsOrPadding(): /*elided*/ any;
        overrideDefault(key: any, val: any): /*elided*/ any;
        strip(themeClass_or_obj: string, margin1: any, margin2: number, horiz: any): any;
        setMargin(m: any): /*elided*/ any;
        setPadding(m: any): /*elided*/ any;
        setSize(width: any, height: any): /*elided*/ any;
        save(): void;
        load(): void;
        saveVisibility(): /*elided*/ any;
        loadVisibility(): boolean;
        toJSON(): any;
        _ondestroy(): void;
        loadJSON(obj: any): /*elided*/ any;
        redrawCurves(): void;
        listen(): void;
        prepend(child: any): void;
        _prepend(child: any): any;
        add(child: any): any;
        insert(i: any, ch: any): void;
        _add(child: any, prepend?: boolean): any;
        dynamicMenu(title: any, list5: any, packflag?: number): any;
        /**example usage:
        
           .menu([
           "some_tool_path.tool()|CustomLabel",
           ui_widgets.Menu.SEP,
           "some_tool_path.another_tool()",
           "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
           ["Name", () => {console.log("do something")}]
           ])
        
           **/
        menu(title: any, list5: any, packflag?: number): any;
        toolPanel(path_or_cls: any, args?: {}): any;
        tool(path_or_cls: any, packflag_or_args: number, createCb: any, label: any): any;
        textbox(inpath: any, text2: any, cb: any, packflag?: number): any;
        pathlabel(inpath: any, label: any, packflag?: number): any;
        label(text2: any): any;
        /**
         *
         * makes a button for a help picker tool
         * to view tooltips on mobile devices
         * */
        helppicker(): any;
        iconbutton(icon: any, description: any, cb: any, thisvar: any, packflag?: number): any;
        button(label: any, cb: any, thisvar: any, id: any, packflag?: number): any;
        _joinPrefix(path: any, prefix?: string): any;
        colorbutton(inpath: any, packflag: any, mass_set_path: any): any;
        noteframe(packflag?: number): any;
        curve1d(inpath: any, packflag: number, mass_set_path: any): any;
        vecpopup(inpath: any, packflag: number, mass_set_path: any): any;
        _getMassPath(ctx: any, inpath: any, mass_set_path: any): any;
        prop(inpath: any, packflag: number, mass_set_path: any): any;
        ctx: any;
        iconcheck(inpath: any, icon: any, description: any, mass_set_path: any): any;
        check(inpath: any, name2: any, packflag: number, mass_set_path: any): any;
        checkenum(inpath: any, name2: any, packflag: any, enummap: any, defaultval: any, callback: any, iconmap: any, mass_set_path: any): any;
        checkenum_panel(inpath: any, name2: any, packflag: number, callback: any, mass_set_path: any, prop: any): any;
        listenum(inpath: any, name2: any, enumDef: any, defaultval: any, callback: any, iconmap: any, packflag?: number): any;
        getroot(): /*elided*/ any;
        simpleslider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, isInt: any, do_redraw: any, callback: any, packflag?: number): any;
        /**
         *
         * usage: .slider(inpath, {
         *  name : bleh,
         *  defaultval : number,
         *  etc...
         * });
         * */
        slider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, is_int: any, do_redraw: any, callback: any, packflag: number, decimalPlaces: any): any;
        _container_inherit(elem: any, packflag?: number): void;
        treeview(): any;
        panel(name2: any, id: any, packflag: number, tooltip: any): any;
        row(packflag?: number): any;
        listbox(packflag?: number): any;
        table(packflag?: number): any;
        twocol(parentDepth?: number, packflag?: number): any;
        col(packflag?: number): any;
        colorPicker(inpath: any, packflag_or_args: number, mass_set_path: any, themeOverride: any): any;
        textarea(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        /**
         * html5 viewer
         * */
        viewer(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        tabs(position?: string, packflag?: number): any;
        asDialogFooter(): /*elided*/ any;
        oneAxisMargin(m?: any, m2?: number): /*elided*/ any;
        oneAxisPadding(m?: any, m2?: number): /*elided*/ any;
    };
    define(): {
        tagname: string;
        style: string;
        subclassChecksTheme: boolean;
    };
};
declare function inv_sample(u: any, v: any): any;
declare function sample(u: any, v: any): any;
declare function getHueField(width: any, height: any, dpi: any): any;
declare function getFieldImage(fieldsize: any, width: any, height: any, hsva: any): any;
declare var SimpleBox: {
    new (pos?: number[], size?: number[]): {
        pos: any;
        size: any;
        r: any;
    };
};
declare var HueField: {
    new (): {
        [x: string]: any;
        canvas: any;
        g: any;
        hsva: any;
        _onchange: any;
        getRGBA(): any;
        setRGBA(rgba: any): void;
        clipboardCopy(): void;
        clipboardPaste(): void;
        _getPad(): number;
        _redraw(): void;
        on_disabled(): void;
        on_enabled(): void;
    };
    [x: string]: any;
    define(): {
        tagname: string;
        style: string;
        havePickClipboard: boolean;
    };
};
declare var SatValField: {
    new (): {
        [x: string]: any;
        canvas: any;
        g: any;
        hsva: any;
        _onchange: any;
        getRGBA(): any;
        setRGBA(rgba: any): void;
        clipboardCopy(): void;
        clipboardPaste(): void;
        _getField(): any;
        update(force_update?: boolean): void;
        _redraw(): void;
        on_disabled(): void;
        on_enabled(): void;
    };
    [x: string]: any;
    define(): {
        tagname: string;
        style: string;
        havePickClipboard: boolean;
    };
};
declare var ColorField: {
    new (): {
        [x: string]: any;
        hsva: any;
        rgba: any;
        satvalfield: any;
        huefield: any;
        _onchange: any;
        _lastThemeStyle: any;
        _last_dpi: any;
        setCMYK(c: any, m: any, y: any, k: any): void;
        getCMYK(): any;
        setHSVA(h: any, s: any, v: any, a2?: number, fire_onchange?: boolean): void;
        _recalcRGBA(): /*elided*/ any;
        updateDPI(force_update?: boolean, _in_update?: boolean): boolean;
        getRGBA(): any;
        setRGBA(r: any, g: any, b: any, a2?: number, fire_onchange?: boolean): void;
        updateThemeOverride(): boolean;
        update(force_update?: boolean): void;
        setCSS(): void;
        _redraw(): void;
        "__#private@#dataPrefix": string;
        get dataPrefix(): string;
        set dataPrefix(_: string);
        "__#private@#massSetPrefix": string;
        get massSetPrefix(): string;
        set massSetPrefix(_: string);
        "__#private@#inherit_packflag": number;
        get inherit_packflag(): number;
        set inherit_packflag(_: number);
        styletag: any;
        reversed: boolean;
        storagePrefix: string;
        _prefixstack: any[];
        _mass_prefixstack: any[];
        noUndo(): /*elided*/ any;
        set background(bg: any);
        __background: any;
        get childWidgets(): any[];
        /** recursively change path prefix for all children*/
        changePathPrefix(newprefix: any): void;
        reverse(): /*elided*/ any;
        pushMassSetPrefix(val: any): /*elided*/ any;
        pushDataPrefix(val: any): /*elided*/ any;
        popDataPrefix(): /*elided*/ any;
        popMassSetPrefix(): /*elided*/ any;
        saveData(): {
            scrollTop: any;
            scrollLeft: any;
        } | {
            scrollTop?: undefined;
            scrollLeft?: undefined;
        };
        loadData(obj: any): /*elided*/ any;
        /** Returns previous icon flags */
        useIcons: (enabled_or_sheet?: boolean) => number;
        /**
         *
         * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
         * @returns {Container}
         */
        wrap(mode?: string): Container;
        noMarginsOrPadding(): /*elided*/ any;
        overrideDefault(key: any, val: any): /*elided*/ any;
        strip(themeClass_or_obj: string, margin1: any, margin2: number, horiz: any): any;
        setMargin(m: any): /*elided*/ any;
        setPadding(m: any): /*elided*/ any;
        setSize(width: any, height: any): /*elided*/ any;
        save(): void;
        load(): void;
        saveVisibility(): /*elided*/ any;
        loadVisibility(): boolean;
        toJSON(): any;
        _ondestroy(): void;
        loadJSON(obj: any): /*elided*/ any;
        redrawCurves(): void;
        listen(): void;
        appendChild(child: any): any;
        clear(trigger_on_destroy?: boolean): void;
        prepend(child: any): void;
        _prepend(child: any): any;
        add(child: any): any;
        insert(i: any, ch: any): void;
        _add(child: any, prepend?: boolean): any;
        dynamicMenu(title: any, list5: any, packflag?: number): any;
        /**example usage:
        
           .menu([
           "some_tool_path.tool()|CustomLabel",
           ui_widgets.Menu.SEP,
           "some_tool_path.another_tool()",
           "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
           ["Name", () => {console.log("do something")}]
           ])
        
           **/
        menu(title: any, list5: any, packflag?: number): any;
        toolPanel(path_or_cls: any, args?: {}): any;
        tool(path_or_cls: any, packflag_or_args: number, createCb: any, label: any): any;
        textbox(inpath: any, text2: any, cb: any, packflag?: number): any;
        pathlabel(inpath: any, label: any, packflag?: number): any;
        label(text2: any): any;
        /**
         *
         * makes a button for a help picker tool
         * to view tooltips on mobile devices
         * */
        helppicker(): any;
        iconbutton(icon: any, description: any, cb: any, thisvar: any, packflag?: number): any;
        button(label: any, cb: any, thisvar: any, id: any, packflag?: number): any;
        _joinPrefix(path: any, prefix?: string): any;
        colorbutton(inpath: any, packflag: any, mass_set_path: any): any;
        noteframe(packflag?: number): any;
        curve1d(inpath: any, packflag: number, mass_set_path: any): any;
        vecpopup(inpath: any, packflag: number, mass_set_path: any): any;
        _getMassPath(ctx: any, inpath: any, mass_set_path: any): any;
        prop(inpath: any, packflag: number, mass_set_path: any): any;
        ctx: any;
        iconcheck(inpath: any, icon: any, description: any, mass_set_path: any): any;
        check(inpath: any, name2: any, packflag: number, mass_set_path: any): any;
        checkenum(inpath: any, name2: any, packflag: any, enummap: any, defaultval: any, callback: any, iconmap: any, mass_set_path: any): any;
        checkenum_panel(inpath: any, name2: any, packflag: number, callback: any, mass_set_path: any, prop: any): any;
        listenum(inpath: any, name2: any, enumDef: any, defaultval: any, callback: any, iconmap: any, packflag?: number): any;
        getroot(): /*elided*/ any;
        simpleslider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, isInt: any, do_redraw: any, callback: any, packflag?: number): any;
        /**
         *
         * usage: .slider(inpath, {
         *  name : bleh,
         *  defaultval : number,
         *  etc...
         * });
         * */
        slider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, is_int: any, do_redraw: any, callback: any, packflag: number, decimalPlaces: any): any;
        _container_inherit(elem: any, packflag?: number): void;
        treeview(): any;
        panel(name2: any, id: any, packflag: number, tooltip: any): any;
        row(packflag?: number): any;
        listbox(packflag?: number): any;
        table(packflag?: number): any;
        twocol(parentDepth?: number, packflag?: number): any;
        col(packflag?: number): any;
        colorPicker(inpath: any, packflag_or_args: number, mass_set_path: any, themeOverride: any): any;
        textarea(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        /**
         * html5 viewer
         * */
        viewer(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        tabs(position?: string, packflag?: number): any;
        asDialogFooter(): /*elided*/ any;
        init(): void;
        oneAxisMargin(m?: any, m2?: number): /*elided*/ any;
        oneAxisPadding(m?: any, m2?: number): /*elided*/ any;
    };
    define(): {
        tagname: string;
        style: string;
    };
};
declare var ColorPicker: {
    new (): {
        [x: string]: any;
        _lastThemeStyle: any;
        field: any;
        colorbox: any;
        _style: any;
        cssText: any;
        h: any;
        s: any;
        v: any;
        a: any;
        r: any;
        g: any;
        b: any;
        a2: any;
        cmyk: any;
        _no_update_textbox: any;
        _onchange: any;
        get hsva(): any;
        get rgba(): any;
        set description(_val: any);
        clipboardCopy(): void;
        clipboardPaste(): void;
        init(): void;
        updateColorBox(): void;
        _setSliders(): void;
        updateDataPath(): void;
        internalDisabled: boolean;
        updateThemeOverride(): boolean;
        update(): void;
        _setDataPath(): void;
        getCMYK(): any;
        setCMYK(c: any, m: any, y: any, k: any): void;
        setHSVA(h: any, s: any, v: any, a2: any): void;
        getRGBA(): any;
        setRGBA(r: any, g: any, b: any, a2: any): void;
        "__#private@#dataPrefix": string;
        get dataPrefix(): string;
        set dataPrefix(_: string);
        "__#private@#massSetPrefix": string;
        get massSetPrefix(): string;
        set massSetPrefix(_: string);
        "__#private@#inherit_packflag": number;
        get inherit_packflag(): number;
        set inherit_packflag(_: number);
        styletag: any;
        reversed: boolean;
        storagePrefix: string;
        _prefixstack: any[];
        _mass_prefixstack: any[];
        noUndo(): /*elided*/ any;
        set background(bg: any);
        __background: any;
        get childWidgets(): any[];
        /** recursively change path prefix for all children*/
        changePathPrefix(newprefix: any): void;
        reverse(): /*elided*/ any;
        pushMassSetPrefix(val: any): /*elided*/ any;
        pushDataPrefix(val: any): /*elided*/ any;
        popDataPrefix(): /*elided*/ any;
        popMassSetPrefix(): /*elided*/ any;
        saveData(): {
            scrollTop: any;
            scrollLeft: any;
        } | {
            scrollTop?: undefined;
            scrollLeft?: undefined;
        };
        loadData(obj: any): /*elided*/ any;
        /** Returns previous icon flags */
        useIcons: (enabled_or_sheet?: boolean) => number;
        /**
         *
         * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
         * @returns {Container}
         */
        wrap(mode?: string): Container;
        noMarginsOrPadding(): /*elided*/ any;
        setCSS(): void;
        overrideDefault(key: any, val: any): /*elided*/ any;
        strip(themeClass_or_obj: string, margin1: any, margin2: number, horiz: any): any;
        setMargin(m: any): /*elided*/ any;
        setPadding(m: any): /*elided*/ any;
        setSize(width: any, height: any): /*elided*/ any;
        save(): void;
        load(): void;
        saveVisibility(): /*elided*/ any;
        loadVisibility(): boolean;
        toJSON(): any;
        _ondestroy(): void;
        loadJSON(obj: any): /*elided*/ any;
        redrawCurves(): void;
        listen(): void;
        appendChild(child: any): any;
        clear(trigger_on_destroy?: boolean): void;
        prepend(child: any): void;
        _prepend(child: any): any;
        add(child: any): any;
        insert(i: any, ch: any): void;
        _add(child: any, prepend?: boolean): any;
        dynamicMenu(title: any, list5: any, packflag?: number): any;
        /**example usage:
        
           .menu([
           "some_tool_path.tool()|CustomLabel",
           ui_widgets.Menu.SEP,
           "some_tool_path.another_tool()",
           "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
           ["Name", () => {console.log("do something")}]
           ])
        
           **/
        menu(title: any, list5: any, packflag?: number): any;
        toolPanel(path_or_cls: any, args?: {}): any;
        tool(path_or_cls: any, packflag_or_args: number, createCb: any, label: any): any;
        textbox(inpath: any, text2: any, cb: any, packflag?: number): any;
        pathlabel(inpath: any, label: any, packflag?: number): any;
        label(text2: any): any;
        /**
         *
         * makes a button for a help picker tool
         * to view tooltips on mobile devices
         * */
        helppicker(): any;
        iconbutton(icon: any, description: any, cb: any, thisvar: any, packflag?: number): any;
        button(label: any, cb: any, thisvar: any, id: any, packflag?: number): any;
        _joinPrefix(path: any, prefix?: string): any;
        colorbutton(inpath: any, packflag: any, mass_set_path: any): any;
        noteframe(packflag?: number): any;
        curve1d(inpath: any, packflag: number, mass_set_path: any): any;
        vecpopup(inpath: any, packflag: number, mass_set_path: any): any;
        _getMassPath(ctx: any, inpath: any, mass_set_path: any): any;
        prop(inpath: any, packflag: number, mass_set_path: any): any;
        ctx: any;
        iconcheck(inpath: any, icon: any, description: any, mass_set_path: any): any;
        check(inpath: any, name2: any, packflag: number, mass_set_path: any): any;
        checkenum(inpath: any, name2: any, packflag: any, enummap: any, defaultval: any, callback: any, iconmap: any, mass_set_path: any): any;
        checkenum_panel(inpath: any, name2: any, packflag: number, callback: any, mass_set_path: any, prop: any): any;
        listenum(inpath: any, name2: any, enumDef: any, defaultval: any, callback: any, iconmap: any, packflag?: number): any;
        getroot(): /*elided*/ any;
        simpleslider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, isInt: any, do_redraw: any, callback: any, packflag?: number): any;
        /**
         *
         * usage: .slider(inpath, {
         *  name : bleh,
         *  defaultval : number,
         *  etc...
         * });
         * */
        slider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, is_int: any, do_redraw: any, callback: any, packflag: number, decimalPlaces: any): any;
        _container_inherit(elem: any, packflag?: number): void;
        treeview(): any;
        panel(name2: any, id: any, packflag: number, tooltip: any): any;
        row(packflag?: number): any;
        listbox(packflag?: number): any;
        table(packflag?: number): any;
        twocol(parentDepth?: number, packflag?: number): any;
        col(packflag?: number): any;
        colorPicker(inpath: any, packflag_or_args: number, mass_set_path: any, themeOverride: any): any;
        textarea(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        /**
         * html5 viewer
         * */
        viewer(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        tabs(position?: string, packflag?: number): any;
        asDialogFooter(): /*elided*/ any;
        oneAxisMargin(m?: any, m2?: number): /*elided*/ any;
        oneAxisPadding(m?: any, m2?: number): /*elided*/ any;
    };
    setDefault(node: any): void;
    define(): {
        tagname: string;
        style: string;
        havePickClipboard: boolean;
        copyForAllChildren: boolean;
        pasteForAllChildren: boolean;
    };
};
declare var ColorPickerButton: {
    new (): {
        [x: string]: any;
        _highlight: any;
        _depress: any;
        _label: any;
        customLabel: any;
        rgba: any;
        labelDom: any;
        dom: any;
        g: any;
        _font: string;
        _last_key: string;
        get label(): any;
        set label(val: any);
        get font(): string;
        set font(val: string);
        get noLabel(): boolean;
        set noLabel(v: boolean);
        init(): void;
        clipboardCopy(): void;
        clipboardPaste(): void;
        getRGBA(): any;
        _onClickButton(e: any): void;
        setRGBA(val: any): /*elided*/ any;
        on_disabled(): void;
        _redraw(): void;
        setCSS(): void;
        updateDataPath(): void;
        internalDisabled: boolean;
        update(): void;
        redraw(): void;
    };
    [x: string]: any;
    define(): {
        tagname: string;
        style: string;
        havePickClipboard: boolean;
    };
};
declare var tab_idgen: number;
declare var TabItemContainer2: {
    new (): {
        [x: string]: any;
        getAttribute(name2: any): any;
        setAttribute(name2: any, value: any): void;
        noSwitch(): /*elided*/ any;
        get ontabclick(): any;
        set ontabclick(v: any);
        get ontabdragmove(): any;
        set ontabdragmove(v: any);
        get ontabdragstart(): any;
        set ontabdragstart(v: any);
        get ontabdragend(): any;
        set ontabdragend(v: any);
        "__#private@#dataPrefix": string;
        get dataPrefix(): string;
        set dataPrefix(_: string);
        "__#private@#massSetPrefix": string;
        get massSetPrefix(): string;
        set massSetPrefix(_: string);
        "__#private@#inherit_packflag": number;
        get inherit_packflag(): number;
        set inherit_packflag(_: number);
        styletag: any;
        reversed: boolean;
        storagePrefix: string;
        _prefixstack: any[];
        _mass_prefixstack: any[];
        noUndo(): /*elided*/ any;
        set background(bg: any);
        __background: any;
        get childWidgets(): any[];
        /** recursively change path prefix for all children*/
        changePathPrefix(newprefix: any): void;
        reverse(): /*elided*/ any;
        pushMassSetPrefix(val: any): /*elided*/ any;
        pushDataPrefix(val: any): /*elided*/ any;
        popDataPrefix(): /*elided*/ any;
        popMassSetPrefix(): /*elided*/ any;
        saveData(): {
            scrollTop: any;
            scrollLeft: any;
        } | {
            scrollTop?: undefined;
            scrollLeft?: undefined;
        };
        loadData(obj: any): /*elided*/ any;
        /** Returns previous icon flags */
        useIcons: (enabled_or_sheet?: boolean) => number;
        /**
         *
         * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
         * @returns {Container}
         */
        wrap(mode?: string): Container;
        noMarginsOrPadding(): /*elided*/ any;
        setCSS(): void;
        overrideDefault(key: any, val: any): /*elided*/ any;
        strip(themeClass_or_obj: string, margin1: any, margin2: number, horiz: any): any;
        setMargin(m: any): /*elided*/ any;
        setPadding(m: any): /*elided*/ any;
        setSize(width: any, height: any): /*elided*/ any;
        save(): void;
        load(): void;
        saveVisibility(): /*elided*/ any;
        loadVisibility(): boolean;
        toJSON(): any;
        _ondestroy(): void;
        loadJSON(obj: any): /*elided*/ any;
        redrawCurves(): void;
        listen(): void;
        appendChild(child: any): any;
        clear(trigger_on_destroy?: boolean): void;
        prepend(child: any): void;
        _prepend(child: any): any;
        add(child: any): any;
        insert(i: any, ch: any): void;
        _add(child: any, prepend?: boolean): any;
        dynamicMenu(title: any, list5: any, packflag?: number): any;
        /**example usage:
        
           .menu([
           "some_tool_path.tool()|CustomLabel",
           ui_widgets.Menu.SEP,
           "some_tool_path.another_tool()",
           "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
           ["Name", () => {console.log("do something")}]
           ])
        
           **/
        menu(title: any, list5: any, packflag?: number): any;
        toolPanel(path_or_cls: any, args?: {}): any;
        tool(path_or_cls: any, packflag_or_args: number, createCb: any, label: any): any;
        textbox(inpath: any, text2: any, cb: any, packflag?: number): any;
        pathlabel(inpath: any, label: any, packflag?: number): any;
        label(text2: any): any;
        /**
         *
         * makes a button for a help picker tool
         * to view tooltips on mobile devices
         * */
        helppicker(): any;
        iconbutton(icon: any, description: any, cb: any, thisvar: any, packflag?: number): any;
        button(label: any, cb: any, thisvar: any, id: any, packflag?: number): any;
        _joinPrefix(path: any, prefix?: string): any;
        colorbutton(inpath: any, packflag: any, mass_set_path: any): any;
        noteframe(packflag?: number): any;
        curve1d(inpath: any, packflag: number, mass_set_path: any): any;
        vecpopup(inpath: any, packflag: number, mass_set_path: any): any;
        _getMassPath(ctx: any, inpath: any, mass_set_path: any): any;
        prop(inpath: any, packflag: number, mass_set_path: any): any;
        ctx: any;
        iconcheck(inpath: any, icon: any, description: any, mass_set_path: any): any;
        check(inpath: any, name2: any, packflag: number, mass_set_path: any): any;
        checkenum(inpath: any, name2: any, packflag: any, enummap: any, defaultval: any, callback: any, iconmap: any, mass_set_path: any): any;
        checkenum_panel(inpath: any, name2: any, packflag: number, callback: any, mass_set_path: any, prop: any): any;
        listenum(inpath: any, name2: any, enumDef: any, defaultval: any, callback: any, iconmap: any, packflag?: number): any;
        getroot(): /*elided*/ any;
        simpleslider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, isInt: any, do_redraw: any, callback: any, packflag?: number): any;
        /**
         *
         * usage: .slider(inpath, {
         *  name : bleh,
         *  defaultval : number,
         *  etc...
         * });
         * */
        slider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, is_int: any, do_redraw: any, callback: any, packflag: number, decimalPlaces: any): any;
        _container_inherit(elem: any, packflag?: number): void;
        treeview(): any;
        panel(name2: any, id: any, packflag: number, tooltip: any): any;
        row(packflag?: number): any;
        listbox(packflag?: number): any;
        table(packflag?: number): any;
        twocol(parentDepth?: number, packflag?: number): any;
        col(packflag?: number): any;
        colorPicker(inpath: any, packflag_or_args: number, mass_set_path: any, themeOverride: any): any;
        textarea(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        /**
         * html5 viewer
         * */
        viewer(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        tabs(position?: string, packflag?: number): any;
        asDialogFooter(): /*elided*/ any;
        init(): void;
        update(): void;
        oneAxisMargin(m?: any, m2?: number): /*elided*/ any;
        oneAxisPadding(m?: any, m2?: number): /*elided*/ any;
    };
    define(): {
        tagname: string;
    };
};
declare var TabItem: {
    new (): {
        [x: string]: any;
        name: any;
        icon: any;
        tooltip: any;
        movable: any;
        tbar: any;
        noSwitch: any;
        ontabclick: any;
        ontabdragstart: any;
        ontabdragmove: any;
        ontabdragend: any;
        dom: any;
        extra: any;
        extraSize: any;
        size: any;
        pos: any;
        abssize: any;
        abspos: any;
        watcher: any;
        get parentTabBar(): any;
        addEventListener(type: any, cb: any, options: any): void;
        init(): void;
        tabIndex: number;
        sendEvent(type: any, forwardEvent: any): any;
        getClientRects(): {
            x: any;
            y: any;
            width: any;
            height: any;
            left: any;
            top: any;
            right: any;
            bottom: any;
        }[];
        setCSS(): void;
    };
    [x: string]: any;
    define(): {
        tagname: string;
    };
};
declare var ModalTabMove: {
    new (tab2: any, tbar: any, dom: any): {
        [x: string]: any;
        dom: any;
        tab: any;
        tbar: any;
        first: any;
        droptarget: any;
        start_mpos: any;
        mpos: any;
        dragtab: any;
        dragstate: any;
        finished: any;
        dragevent: any;
        dragimg: any;
        dragcanvas: any;
        drag_g: any;
        finish(): void;
        popModal(): any;
        on_pointerenter(e: any): void;
        on_pointerleave(e: any): void;
        on_pointerstart(e: any): void;
        on_pointerend(e: any): void;
        on_pointerdown(e: any): void;
        on_pointercancel(e: any): void;
        on_pointerup(e: any): void;
        on_pointermove(e: any): void;
        _dragstate(e: any, x: any, y: any): void;
        _on_move(e: any, x: any, y: any): void;
        on_keydown(e: any): void;
    };
    [x: string]: any;
};
declare var TabBar: {
    new (): {
        [x: string]: any;
        iconsheet: any;
        movableTabs: any;
        tabFontScale: any;
        tabs: any;
        _last_style_key: any;
        r: any;
        canvas: any;
        g: any;
        _last_dpi: any;
        _last_pos: any;
        horiz: any;
        onchange: any;
        onselect: any;
        _tool: any;
        _last_p_key: any;
        _size_cb: any;
        _doelement(e: any, mx: any, my: any): void;
        _domouse(e: any): void;
        _doclick(e: any): void;
        on_pointerdown(e: any): void;
        on_pointermove(e: any): void;
        on_pointerup(e: any): void;
        _ensureNoModal(): void;
        get tool(): any;
        set tool(v: any);
        _startMove(tab2: any, event: any, pointerId?: any, pointerElem?: any): void;
        _fireOnSelect(): {
            tab: any;
            defaultPrevented: boolean;
            preventDefault(): void;
        };
        _makeOnSelectEvt(): {
            tab: any;
            defaultPrevented: boolean;
            preventDefault(): void;
        };
        getTab(name_or_id: any): any;
        clear(): void;
        saveData(): {
            taborder: any[];
            active: any;
        };
        loadData(obj: any): /*elided*/ any;
        swapTabs(a2: any, b: any): void;
        addIconTab(icon: any, id: any, tooltip: any, movable?: boolean): any;
        addTab(name2: any, id: any, tooltip?: string, movable?: boolean): any;
        updatePos(force_update?: boolean): void;
        updateDPI(force_update?: boolean): void;
        updateCanvas(force_update?: boolean): void;
        _getFont(tsize: any): any;
        _layout(): void;
        /** tab is a TabItem instance */
        setActive(tab2: any, event: any): void;
        _redraw(): void;
        removeTab(tab2: any): void;
        setCSS(): void;
        updateStyle(): void;
        update(force_update?: boolean): void;
    };
    [x: string]: any;
    setDefault(element: any): any;
    define(): {
        tagname: string;
        style: string;
    };
};
declare var TabContainer3: {
    new (): {
        [x: string]: any;
        _style: any;
        tbar: any;
        tabs: any;
        tabFontScale: any;
        dataPrefix: any;
        inherit_packflag: number;
        _last_style_key: any;
        _last_horiz: any;
        _last_bar_pos: any;
        _tab: any;
        onchange: any;
        onselect: any;
        horiz: boolean;
        packflag: number;
        get movableTabs(): boolean;
        set movableTabs(val: boolean);
        get hideScrollBars(): boolean;
        set hideScrollBars(val: boolean);
        _startMove(tab2: any, event: any): any;
        _ensureNoModal(): any;
        saveData(): any;
        loadData(json: any): /*elided*/ any;
        enableDrag(): void;
        draggable: boolean;
        clear(): void;
        init(): void;
        background: any;
        setCSS(): void;
        _remakeStyle(): void;
        icontab(icon: any, id: any, tooltip: any): any;
        removeTab(tab2: any): void;
        tab(name2: any, id: any, tooltip: any, movable?: boolean): any;
        setActive(tab2: any): void;
        getTabCount(): any;
        moveTab(tab2: any, i: any): void;
        getTab(name_or_id: any): any;
        updateBarPos(): void;
        updateHoriz(): void;
        updateStyle(): void;
        getActive(): any;
        update(): void;
    };
    [x: string]: any;
    setDefault(e: any): any;
    define(): {
        tagname: string;
        style: string;
    };
};
declare var ListItem: {
    new (): {
        [x: string]: any;
        highlight: boolean;
        is_active: boolean;
        init(): void;
        setBackground(): void;
        background: any;
        setCSS(): void;
        "__#private@#dataPrefix": string;
        get dataPrefix(): string;
        set dataPrefix(_: string);
        "__#private@#massSetPrefix": string;
        get massSetPrefix(): string;
        set massSetPrefix(_: string);
        "__#private@#inherit_packflag": number;
        get inherit_packflag(): number;
        set inherit_packflag(_: number);
        styletag: any;
        reversed: boolean;
        storagePrefix: string;
        _prefixstack: any[];
        _mass_prefixstack: any[];
        noUndo(): /*elided*/ any;
        __background: any;
        get childWidgets(): any[];
        /** recursively change path prefix for all children*/
        changePathPrefix(newprefix: any): void;
        reverse(): /*elided*/ any;
        pushMassSetPrefix(val: any): /*elided*/ any;
        pushDataPrefix(val: any): /*elided*/ any;
        popDataPrefix(): /*elided*/ any;
        popMassSetPrefix(): /*elided*/ any;
        saveData(): {
            scrollTop: any;
            scrollLeft: any;
        } | {
            scrollTop?: undefined;
            scrollLeft?: undefined;
        };
        loadData(obj: any): /*elided*/ any;
        /** Returns previous icon flags */
        useIcons: (enabled_or_sheet?: boolean) => number;
        /**
         *
         * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
         * @returns {Container}
         */
        wrap(mode?: string): Container;
        noMarginsOrPadding(): /*elided*/ any;
        overrideDefault(key: any, val: any): /*elided*/ any;
        strip(themeClass_or_obj: string, margin1: any, margin2: number, horiz: any): any;
        setMargin(m: any): /*elided*/ any;
        setPadding(m: any): /*elided*/ any;
        setSize(width: any, height: any): /*elided*/ any;
        save(): void;
        load(): void;
        saveVisibility(): /*elided*/ any;
        loadVisibility(): boolean;
        toJSON(): any;
        _ondestroy(): void;
        loadJSON(obj: any): /*elided*/ any;
        redrawCurves(): void;
        listen(): void;
        appendChild(child: any): any;
        clear(trigger_on_destroy?: boolean): void;
        prepend(child: any): void;
        _prepend(child: any): any;
        add(child: any): any;
        insert(i: any, ch: any): void;
        _add(child: any, prepend?: boolean): any;
        dynamicMenu(title: any, list5: any, packflag?: number): any;
        /**example usage:
        
           .menu([
           "some_tool_path.tool()|CustomLabel",
           ui_widgets.Menu.SEP,
           "some_tool_path.another_tool()",
           "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
           ["Name", () => {console.log("do something")}]
           ])
        
           **/
        menu(title: any, list5: any, packflag?: number): any;
        toolPanel(path_or_cls: any, args?: {}): any;
        tool(path_or_cls: any, packflag_or_args: number, createCb: any, label: any): any;
        textbox(inpath: any, text2: any, cb: any, packflag?: number): any;
        pathlabel(inpath: any, label: any, packflag?: number): any;
        label(text2: any): any;
        /**
         *
         * makes a button for a help picker tool
         * to view tooltips on mobile devices
         * */
        helppicker(): any;
        iconbutton(icon: any, description: any, cb: any, thisvar: any, packflag?: number): any;
        button(label: any, cb: any, thisvar: any, id: any, packflag?: number): any;
        _joinPrefix(path: any, prefix?: string): any;
        colorbutton(inpath: any, packflag: any, mass_set_path: any): any;
        noteframe(packflag?: number): any;
        curve1d(inpath: any, packflag: number, mass_set_path: any): any;
        vecpopup(inpath: any, packflag: number, mass_set_path: any): any;
        _getMassPath(ctx: any, inpath: any, mass_set_path: any): any;
        prop(inpath: any, packflag: number, mass_set_path: any): any;
        ctx: any;
        iconcheck(inpath: any, icon: any, description: any, mass_set_path: any): any;
        check(inpath: any, name2: any, packflag: number, mass_set_path: any): any;
        checkenum(inpath: any, name2: any, packflag: any, enummap: any, defaultval: any, callback: any, iconmap: any, mass_set_path: any): any;
        checkenum_panel(inpath: any, name2: any, packflag: number, callback: any, mass_set_path: any, prop: any): any;
        listenum(inpath: any, name2: any, enumDef: any, defaultval: any, callback: any, iconmap: any, packflag?: number): any;
        getroot(): /*elided*/ any;
        simpleslider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, isInt: any, do_redraw: any, callback: any, packflag?: number): any;
        /**
         *
         * usage: .slider(inpath, {
         *  name : bleh,
         *  defaultval : number,
         *  etc...
         * });
         * */
        slider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, is_int: any, do_redraw: any, callback: any, packflag: number, decimalPlaces: any): any;
        _container_inherit(elem: any, packflag?: number): void;
        treeview(): any;
        panel(name2: any, id: any, packflag: number, tooltip: any): any;
        row(packflag?: number): any;
        listbox(packflag?: number): any;
        table(packflag?: number): any;
        twocol(parentDepth?: number, packflag?: number): any;
        col(packflag?: number): any;
        colorPicker(inpath: any, packflag_or_args: number, mass_set_path: any, themeOverride: any): any;
        textarea(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        /**
         * html5 viewer
         * */
        viewer(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        tabs(position?: string, packflag?: number): any;
        asDialogFooter(): /*elided*/ any;
        connectedCallback(): void;
        oneAxisMargin(m?: any, m2?: number): /*elided*/ any;
        oneAxisPadding(m?: any, m2?: number): /*elided*/ any;
        update(): void;
    };
    define(): {
        tagname: string;
        style: string;
    };
};
declare var ListBox2: {
    new (): {
        [x: string]: any;
        items: any;
        idmap: any;
        highlight: any;
        is_active: any;
        on_change: any;
        onkeydown: (e: any) => void;
        setCSS(): void;
        init(): void;
        addItem(name2: any, id: any): any;
        tabIndex: number;
        removeItem(item: any): void;
        setActive(item: any): void;
        clear(): void;
        "__#private@#dataPrefix": string;
        get dataPrefix(): string;
        set dataPrefix(_: string);
        "__#private@#massSetPrefix": string;
        get massSetPrefix(): string;
        set massSetPrefix(_: string);
        "__#private@#inherit_packflag": number;
        get inherit_packflag(): number;
        set inherit_packflag(_: number);
        styletag: any;
        reversed: boolean;
        storagePrefix: string;
        _prefixstack: any[];
        _mass_prefixstack: any[];
        noUndo(): /*elided*/ any;
        set background(bg: any);
        __background: any;
        get childWidgets(): any[];
        /** recursively change path prefix for all children*/
        changePathPrefix(newprefix: any): void;
        reverse(): /*elided*/ any;
        pushMassSetPrefix(val: any): /*elided*/ any;
        pushDataPrefix(val: any): /*elided*/ any;
        popDataPrefix(): /*elided*/ any;
        popMassSetPrefix(): /*elided*/ any;
        saveData(): {
            scrollTop: any;
            scrollLeft: any;
        } | {
            scrollTop?: undefined;
            scrollLeft?: undefined;
        };
        loadData(obj: any): /*elided*/ any;
        /** Returns previous icon flags */
        useIcons: (enabled_or_sheet?: boolean) => number;
        /**
         *
         * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
         * @returns {Container}
         */
        wrap(mode?: string): Container;
        noMarginsOrPadding(): /*elided*/ any;
        overrideDefault(key: any, val: any): /*elided*/ any;
        strip(themeClass_or_obj: string, margin1: any, margin2: number, horiz: any): any;
        /**
         * tries to set margin along one axis only in smart manner
         * */
        oneAxisMargin(m?: any, m2?: number): /*elided*/ any;
        /**
         * tries to set padding along one axis only in smart manner
         * */
        oneAxisPadding(axisPadding?: any, otherPadding?: number): /*elided*/ any;
        setMargin(m: any): /*elided*/ any;
        setPadding(m: any): /*elided*/ any;
        setSize(width: any, height: any): /*elided*/ any;
        save(): void;
        load(): void;
        saveVisibility(): /*elided*/ any;
        loadVisibility(): boolean;
        toJSON(): any;
        _ondestroy(): void;
        loadJSON(obj: any): /*elided*/ any;
        redrawCurves(): void;
        listen(): void;
        update(): void;
        appendChild(child: any): any;
        prepend(child: any): void;
        _prepend(child: any): any;
        add(child: any): any;
        insert(i: any, ch: any): void;
        _add(child: any, prepend?: boolean): any;
        dynamicMenu(title: any, list5: any, packflag?: number): any;
        /**example usage:
        
           .menu([
           "some_tool_path.tool()|CustomLabel",
           ui_widgets.Menu.SEP,
           "some_tool_path.another_tool()",
           "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
           ["Name", () => {console.log("do something")}]
           ])
        
           **/
        menu(title: any, list5: any, packflag?: number): any;
        toolPanel(path_or_cls: any, args?: {}): any;
        tool(path_or_cls: any, packflag_or_args: number, createCb: any, label: any): any;
        textbox(inpath: any, text2: any, cb: any, packflag?: number): any;
        pathlabel(inpath: any, label: any, packflag?: number): any;
        label(text2: any): any;
        /**
         *
         * makes a button for a help picker tool
         * to view tooltips on mobile devices
         * */
        helppicker(): any;
        iconbutton(icon: any, description: any, cb: any, thisvar: any, packflag?: number): any;
        button(label: any, cb: any, thisvar: any, id: any, packflag?: number): any;
        _joinPrefix(path: any, prefix?: string): any;
        colorbutton(inpath: any, packflag: any, mass_set_path: any): any;
        noteframe(packflag?: number): any;
        curve1d(inpath: any, packflag: number, mass_set_path: any): any;
        vecpopup(inpath: any, packflag: number, mass_set_path: any): any;
        _getMassPath(ctx: any, inpath: any, mass_set_path: any): any;
        prop(inpath: any, packflag: number, mass_set_path: any): any;
        ctx: any;
        iconcheck(inpath: any, icon: any, description: any, mass_set_path: any): any;
        check(inpath: any, name2: any, packflag: number, mass_set_path: any): any;
        checkenum(inpath: any, name2: any, packflag: any, enummap: any, defaultval: any, callback: any, iconmap: any, mass_set_path: any): any;
        checkenum_panel(inpath: any, name2: any, packflag: number, callback: any, mass_set_path: any, prop: any): any;
        listenum(inpath: any, name2: any, enumDef: any, defaultval: any, callback: any, iconmap: any, packflag?: number): any;
        getroot(): /*elided*/ any;
        simpleslider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, isInt: any, do_redraw: any, callback: any, packflag?: number): any;
        /**
         *
         * usage: .slider(inpath, {
         *  name : bleh,
         *  defaultval : number,
         *  etc...
         * });
         * */
        slider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, is_int: any, do_redraw: any, callback: any, packflag: number, decimalPlaces: any): any;
        _container_inherit(elem: any, packflag?: number): void;
        treeview(): any;
        panel(name2: any, id: any, packflag: number, tooltip: any): any;
        row(packflag?: number): any;
        listbox(packflag?: number): any;
        table(packflag?: number): any;
        twocol(parentDepth?: number, packflag?: number): any;
        col(packflag?: number): any;
        colorPicker(inpath: any, packflag_or_args: number, mass_set_path: any, themeOverride: any): any;
        textarea(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        /**
         * html5 viewer
         * */
        viewer(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        tabs(position?: string, packflag?: number): any;
        asDialogFooter(): /*elided*/ any;
    };
    define(): {
        tagname: string;
        style: string;
    };
};
declare var ProgressCircle: {
    new (): {
        [x: string]: any;
        canvas: any;
        g: any;
        animreq: any;
        _value: any;
        startTime: any;
        timer: any;
        _oncancel: any;
        size: number;
        init(): void;
        tabIndex: number;
        flagRedraw(): void;
        draw(): void;
        get value(): any;
        set value(percent: any);
        startTimer(): void;
        endTimer(): void;
        update(): void;
        setCSS(): void;
    };
    [x: string]: any;
    define(): {
        tagname: string;
    };
};
declare var TableRow: {
    new (): {
        [x: string]: any;
        dom: HTMLTableRowElement;
        _add(child: any): any;
        "__#private@#dataPrefix": string;
        get dataPrefix(): string;
        set dataPrefix(_: string);
        "__#private@#massSetPrefix": string;
        get massSetPrefix(): string;
        set massSetPrefix(_: string);
        "__#private@#inherit_packflag": number;
        get inherit_packflag(): number;
        set inherit_packflag(_: number);
        styletag: any;
        reversed: boolean;
        storagePrefix: string;
        _prefixstack: any[];
        _mass_prefixstack: any[];
        noUndo(): /*elided*/ any;
        set background(bg: any);
        __background: any;
        get childWidgets(): any[];
        /** recursively change path prefix for all children*/
        changePathPrefix(newprefix: any): void;
        reverse(): /*elided*/ any;
        pushMassSetPrefix(val: any): /*elided*/ any;
        pushDataPrefix(val: any): /*elided*/ any;
        popDataPrefix(): /*elided*/ any;
        popMassSetPrefix(): /*elided*/ any;
        saveData(): {
            scrollTop: any;
            scrollLeft: any;
        } | {
            scrollTop?: undefined;
            scrollLeft?: undefined;
        };
        loadData(obj: any): /*elided*/ any;
        init(): void;
        /** Returns previous icon flags */
        useIcons: (enabled_or_sheet?: boolean) => number;
        /**
         *
         * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
         * @returns {Container}
         */
        wrap(mode?: string): Container;
        noMarginsOrPadding(): /*elided*/ any;
        setCSS(): void;
        overrideDefault(key: any, val: any): /*elided*/ any;
        strip(themeClass_or_obj: string, margin1: any, margin2: number, horiz: any): any;
        /**
         * tries to set margin along one axis only in smart manner
         * */
        oneAxisMargin(m?: any, m2?: number): /*elided*/ any;
        /**
         * tries to set padding along one axis only in smart manner
         * */
        oneAxisPadding(axisPadding?: any, otherPadding?: number): /*elided*/ any;
        setMargin(m: any): /*elided*/ any;
        setPadding(m: any): /*elided*/ any;
        setSize(width: any, height: any): /*elided*/ any;
        save(): void;
        load(): void;
        saveVisibility(): /*elided*/ any;
        loadVisibility(): boolean;
        toJSON(): any;
        _ondestroy(): void;
        loadJSON(obj: any): /*elided*/ any;
        redrawCurves(): void;
        listen(): void;
        update(): void;
        appendChild(child: any): any;
        clear(trigger_on_destroy?: boolean): void;
        prepend(child: any): void;
        _prepend(child: any): any;
        add(child: any): any;
        insert(i: any, ch: any): void;
        dynamicMenu(title: any, list5: any, packflag?: number): any;
        /**example usage:
        
           .menu([
           "some_tool_path.tool()|CustomLabel",
           ui_widgets.Menu.SEP,
           "some_tool_path.another_tool()",
           "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
           ["Name", () => {console.log("do something")}]
           ])
        
           **/
        menu(title: any, list5: any, packflag?: number): any;
        toolPanel(path_or_cls: any, args?: {}): any;
        tool(path_or_cls: any, packflag_or_args: number, createCb: any, label: any): any;
        textbox(inpath: any, text2: any, cb: any, packflag?: number): any;
        pathlabel(inpath: any, label: any, packflag?: number): any;
        label(text2: any): any;
        /**
         *
         * makes a button for a help picker tool
         * to view tooltips on mobile devices
         * */
        helppicker(): any;
        iconbutton(icon: any, description: any, cb: any, thisvar: any, packflag?: number): any;
        button(label: any, cb: any, thisvar: any, id: any, packflag?: number): any;
        _joinPrefix(path: any, prefix?: string): any;
        colorbutton(inpath: any, packflag: any, mass_set_path: any): any;
        noteframe(packflag?: number): any;
        curve1d(inpath: any, packflag: number, mass_set_path: any): any;
        vecpopup(inpath: any, packflag: number, mass_set_path: any): any;
        _getMassPath(ctx: any, inpath: any, mass_set_path: any): any;
        prop(inpath: any, packflag: number, mass_set_path: any): any;
        ctx: any;
        iconcheck(inpath: any, icon: any, description: any, mass_set_path: any): any;
        check(inpath: any, name2: any, packflag: number, mass_set_path: any): any;
        checkenum(inpath: any, name2: any, packflag: any, enummap: any, defaultval: any, callback: any, iconmap: any, mass_set_path: any): any;
        checkenum_panel(inpath: any, name2: any, packflag: number, callback: any, mass_set_path: any, prop: any): any;
        listenum(inpath: any, name2: any, enumDef: any, defaultval: any, callback: any, iconmap: any, packflag?: number): any;
        getroot(): /*elided*/ any;
        simpleslider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, isInt: any, do_redraw: any, callback: any, packflag?: number): any;
        /**
         *
         * usage: .slider(inpath, {
         *  name : bleh,
         *  defaultval : number,
         *  etc...
         * });
         * */
        slider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, is_int: any, do_redraw: any, callback: any, packflag: number, decimalPlaces: any): any;
        _container_inherit(elem: any, packflag?: number): void;
        treeview(): any;
        panel(name2: any, id: any, packflag: number, tooltip: any): any;
        row(packflag?: number): any;
        listbox(packflag?: number): any;
        table(packflag?: number): any;
        twocol(parentDepth?: number, packflag?: number): any;
        col(packflag?: number): any;
        colorPicker(inpath: any, packflag_or_args: number, mass_set_path: any, themeOverride: any): any;
        textarea(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        /**
         * html5 viewer
         * */
        viewer(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        tabs(position?: string, packflag?: number): any;
        asDialogFooter(): /*elided*/ any;
    };
    define(): {
        tagname: string;
    };
};
declare var Note: {
    new (): {
        [x: string]: any;
        _noteid: any;
        height: any;
        showExclMark: any;
        dom: any;
        color: any;
        mark: any;
        ntext: any;
        setLabel(s: any): void;
        init(): void;
        setCSS(): void;
    };
    [x: string]: any;
    define(): {
        tagname: string;
        style: string;
    };
};
declare var ProgBarNote: {
    new (): {
        [x: string]: any;
        _percent: any;
        barWidth: any;
        bar: any;
        bar2: any;
        get percent(): any;
        set percent(val: any);
        setCSS(): void;
        init(): void;
        _noteid: any;
        height: any;
        showExclMark: any;
        dom: any;
        color: any;
        mark: any;
        ntext: any;
        setLabel(s: any): void;
    };
    define(): {
        tagname: string;
        style: string;
    };
};
declare var NoteFrame: {
    new (): {
        [x: string]: any;
        _h: any;
        init(): void;
        background: any;
        setCSS(): void;
        _ondestroy(): void;
        progbarNote(msg: any, percent: any, color?: string, timeout?: number, id?: any): any;
        addNote(msg: any, color?: string, timeout?: number, tagname?: string, showExclMark?: boolean): any;
        "__#private@#dataPrefix": string;
        get dataPrefix(): string;
        set dataPrefix(_: string);
        "__#private@#massSetPrefix": string;
        get massSetPrefix(): string;
        set massSetPrefix(_: string);
        "__#private@#inherit_packflag": number;
        get inherit_packflag(): number;
        set inherit_packflag(_: number);
        styletag: any;
        reversed: boolean;
        storagePrefix: string;
        _prefixstack: any[];
        _mass_prefixstack: any[];
        noUndo(): /*elided*/ any;
        __background: any;
        get childWidgets(): any[];
        /** recursively change path prefix for all children*/
        changePathPrefix(newprefix: any): void;
        reverse(): /*elided*/ any;
        pushMassSetPrefix(val: any): /*elided*/ any;
        pushDataPrefix(val: any): /*elided*/ any;
        popDataPrefix(): /*elided*/ any;
        popMassSetPrefix(): /*elided*/ any;
        saveData(): {
            scrollTop: any;
            scrollLeft: any;
        } | {
            scrollTop?: undefined;
            scrollLeft?: undefined;
        };
        loadData(obj: any): /*elided*/ any;
        /** Returns previous icon flags */
        useIcons: (enabled_or_sheet?: boolean) => number;
        /**
         *
         * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
         * @returns {Container}
         */
        wrap(mode?: string): Container;
        noMarginsOrPadding(): /*elided*/ any;
        overrideDefault(key: any, val: any): /*elided*/ any;
        strip(themeClass_or_obj: string, margin1: any, margin2: number, horiz: any): any;
        setMargin(m: any): /*elided*/ any;
        setPadding(m: any): /*elided*/ any;
        setSize(width: any, height: any): /*elided*/ any;
        save(): void;
        load(): void;
        saveVisibility(): /*elided*/ any;
        loadVisibility(): boolean;
        toJSON(): any;
        loadJSON(obj: any): /*elided*/ any;
        redrawCurves(): void;
        listen(): void;
        appendChild(child: any): any;
        clear(trigger_on_destroy?: boolean): void;
        prepend(child: any): void;
        _prepend(child: any): any;
        add(child: any): any;
        insert(i: any, ch: any): void;
        _add(child: any, prepend?: boolean): any;
        dynamicMenu(title: any, list5: any, packflag?: number): any;
        /**example usage:
        
           .menu([
           "some_tool_path.tool()|CustomLabel",
           ui_widgets.Menu.SEP,
           "some_tool_path.another_tool()",
           "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
           ["Name", () => {console.log("do something")}]
           ])
        
           **/
        menu(title: any, list5: any, packflag?: number): any;
        toolPanel(path_or_cls: any, args?: {}): any;
        tool(path_or_cls: any, packflag_or_args: number, createCb: any, label: any): any;
        textbox(inpath: any, text2: any, cb: any, packflag?: number): any;
        pathlabel(inpath: any, label: any, packflag?: number): any;
        label(text2: any): any;
        /**
         *
         * makes a button for a help picker tool
         * to view tooltips on mobile devices
         * */
        helppicker(): any;
        iconbutton(icon: any, description: any, cb: any, thisvar: any, packflag?: number): any;
        button(label: any, cb: any, thisvar: any, id: any, packflag?: number): any;
        _joinPrefix(path: any, prefix?: string): any;
        colorbutton(inpath: any, packflag: any, mass_set_path: any): any;
        noteframe(packflag?: number): any;
        curve1d(inpath: any, packflag: number, mass_set_path: any): any;
        vecpopup(inpath: any, packflag: number, mass_set_path: any): any;
        _getMassPath(ctx: any, inpath: any, mass_set_path: any): any;
        prop(inpath: any, packflag: number, mass_set_path: any): any;
        ctx: any;
        iconcheck(inpath: any, icon: any, description: any, mass_set_path: any): any;
        check(inpath: any, name2: any, packflag: number, mass_set_path: any): any;
        checkenum(inpath: any, name2: any, packflag: any, enummap: any, defaultval: any, callback: any, iconmap: any, mass_set_path: any): any;
        checkenum_panel(inpath: any, name2: any, packflag: number, callback: any, mass_set_path: any, prop: any): any;
        listenum(inpath: any, name2: any, enumDef: any, defaultval: any, callback: any, iconmap: any, packflag?: number): any;
        getroot(): /*elided*/ any;
        simpleslider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, isInt: any, do_redraw: any, callback: any, packflag?: number): any;
        /**
         *
         * usage: .slider(inpath, {
         *  name : bleh,
         *  defaultval : number,
         *  etc...
         * });
         * */
        slider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, is_int: any, do_redraw: any, callback: any, packflag: number, decimalPlaces: any): any;
        _container_inherit(elem: any, packflag?: number): void;
        treeview(): any;
        panel(name2: any, id: any, packflag: number, tooltip: any): any;
        row(packflag?: number): any;
        listbox(packflag?: number): any;
        table(packflag?: number): any;
        twocol(parentDepth?: number, packflag?: number): any;
        col(packflag?: number): any;
        colorPicker(inpath: any, packflag_or_args: number, mass_set_path: any, themeOverride: any): any;
        textarea(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        /**
         * html5 viewer
         * */
        viewer(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        tabs(position?: string, packflag?: number): any;
        asDialogFooter(): /*elided*/ any;
        connectedCallback(): void;
        oneAxisMargin(m?: any, m2?: number): /*elided*/ any;
        oneAxisPadding(m?: any, m2?: number): /*elided*/ any;
        update(): void;
    };
    define(): {
        tagname: string;
        style: string;
    };
};
declare function getNoteFrames(screen: any): any[];
declare var noteframes: any[];
declare function sendNote(screen: any, msg: any, color: any, timeout?: number, showExclMark?: boolean): void;
declare function error(screen: any, msg: any, timeout: any): void;
declare function warning(screen: any, msg: any, timeout: any): void;
declare function message(screen: any, msg: any, timeout: any): void;
declare function progbarNote(screen: any, msg: any, percent: any, color: any, timeout: any): void;
declare function getLastToolStruct(ctx: any): any;
declare var LastToolPanel: {
    new (): {
        [x: string]: any;
        ignoreOnChange: any;
        on_change: any;
        _tool_id: any;
        needsRebuild: any;
        last_tool: any;
        useDataPathUndo: boolean;
        init(): void;
        /** client code can subclass and override this method */
        getToolStackHead(ctx: any): any;
        rebuild(): void;
        unlinkEvents(): void;
        /** client code can subclass and override this method */
        buildTool(ctx: any, tool: any, panel: any): void;
        update(): void;
        "__#private@#dataPrefix": string;
        get dataPrefix(): string;
        set dataPrefix(_: string);
        "__#private@#massSetPrefix": string;
        get massSetPrefix(): string;
        set massSetPrefix(_: string);
        "__#private@#inherit_packflag": number;
        get inherit_packflag(): number;
        set inherit_packflag(_: number);
        styletag: any;
        reversed: boolean;
        storagePrefix: string;
        _prefixstack: any[];
        _mass_prefixstack: any[];
        noUndo(): /*elided*/ any;
        set background(bg: any);
        __background: any;
        get childWidgets(): any[];
        /** recursively change path prefix for all children*/
        changePathPrefix(newprefix: any): void;
        reverse(): /*elided*/ any;
        pushMassSetPrefix(val: any): /*elided*/ any;
        pushDataPrefix(val: any): /*elided*/ any;
        popDataPrefix(): /*elided*/ any;
        popMassSetPrefix(): /*elided*/ any;
        saveData(): {
            scrollTop: any;
            scrollLeft: any;
        } | {
            scrollTop?: undefined;
            scrollLeft?: undefined;
        };
        loadData(obj: any): /*elided*/ any;
        /** Returns previous icon flags */
        useIcons: (enabled_or_sheet?: boolean) => number;
        /**
         *
         * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
         * @returns {Container}
         */
        wrap(mode?: string): Container;
        noMarginsOrPadding(): /*elided*/ any;
        setCSS(): void;
        overrideDefault(key: any, val: any): /*elided*/ any;
        strip(themeClass_or_obj: string, margin1: any, margin2: number, horiz: any): any;
        setMargin(m: any): /*elided*/ any;
        setPadding(m: any): /*elided*/ any;
        setSize(width: any, height: any): /*elided*/ any;
        save(): void;
        load(): void;
        saveVisibility(): /*elided*/ any;
        loadVisibility(): boolean;
        toJSON(): any;
        _ondestroy(): void;
        loadJSON(obj: any): /*elided*/ any;
        redrawCurves(): void;
        listen(): void;
        appendChild(child: any): any;
        clear(trigger_on_destroy?: boolean): void;
        prepend(child: any): void;
        _prepend(child: any): any;
        add(child: any): any;
        insert(i: any, ch: any): void;
        _add(child: any, prepend?: boolean): any;
        dynamicMenu(title: any, list5: any, packflag?: number): any;
        /**example usage:
        
           .menu([
           "some_tool_path.tool()|CustomLabel",
           ui_widgets.Menu.SEP,
           "some_tool_path.another_tool()",
           "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
           ["Name", () => {console.log("do something")}]
           ])
        
           **/
        menu(title: any, list5: any, packflag?: number): any;
        toolPanel(path_or_cls: any, args?: {}): any;
        tool(path_or_cls: any, packflag_or_args: number, createCb: any, label: any): any;
        textbox(inpath: any, text2: any, cb: any, packflag?: number): any;
        pathlabel(inpath: any, label: any, packflag?: number): any;
        label(text2: any): any;
        /**
         *
         * makes a button for a help picker tool
         * to view tooltips on mobile devices
         * */
        helppicker(): any;
        iconbutton(icon: any, description: any, cb: any, thisvar: any, packflag?: number): any;
        button(label: any, cb: any, thisvar: any, id: any, packflag?: number): any;
        _joinPrefix(path: any, prefix?: string): any;
        colorbutton(inpath: any, packflag: any, mass_set_path: any): any;
        noteframe(packflag?: number): any;
        curve1d(inpath: any, packflag: number, mass_set_path: any): any;
        vecpopup(inpath: any, packflag: number, mass_set_path: any): any;
        _getMassPath(ctx: any, inpath: any, mass_set_path: any): any;
        prop(inpath: any, packflag: number, mass_set_path: any): any;
        ctx: any;
        iconcheck(inpath: any, icon: any, description: any, mass_set_path: any): any;
        check(inpath: any, name2: any, packflag: number, mass_set_path: any): any;
        checkenum(inpath: any, name2: any, packflag: any, enummap: any, defaultval: any, callback: any, iconmap: any, mass_set_path: any): any;
        checkenum_panel(inpath: any, name2: any, packflag: number, callback: any, mass_set_path: any, prop: any): any;
        listenum(inpath: any, name2: any, enumDef: any, defaultval: any, callback: any, iconmap: any, packflag?: number): any;
        getroot(): /*elided*/ any;
        simpleslider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, isInt: any, do_redraw: any, callback: any, packflag?: number): any;
        /**
         *
         * usage: .slider(inpath, {
         *  name : bleh,
         *  defaultval : number,
         *  etc...
         * });
         * */
        slider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, is_int: any, do_redraw: any, callback: any, packflag: number, decimalPlaces: any): any;
        _container_inherit(elem: any, packflag?: number): void;
        treeview(): any;
        panel(name2: any, id: any, packflag: number, tooltip: any): any;
        row(packflag?: number): any;
        listbox(packflag?: number): any;
        table(packflag?: number): any;
        twocol(parentDepth?: number, packflag?: number): any;
        col(packflag?: number): any;
        colorPicker(inpath: any, packflag_or_args: number, mass_set_path: any, themeOverride: any): any;
        textarea(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        /**
         * html5 viewer
         * */
        viewer(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        tabs(position?: string, packflag?: number): any;
        asDialogFooter(): /*elided*/ any;
        oneAxisMargin(m?: any, m2?: number): /*elided*/ any;
        oneAxisPadding(m?: any, m2?: number): /*elided*/ any;
    };
    define(): {
        tagname: string;
    };
};
declare var solver_exports: {};
declare var Constraint: {
    new (name2: any, func: any, klst: any, params: any, k?: number): {
        glst: any;
        klst: any;
        wlst: any;
        k: any;
        params: any;
        name: any;
        df: any;
        threshold: any;
        func: any;
        funcDv: any;
        postSolve(): void;
        evaluate(no_dvs?: boolean): any;
    };
};
declare var Solver: {
    new (): {
        constraints: any;
        gk: any;
        simple: any;
        randCons: any;
        threshold: any;
        remove(con: any): void;
        add(con: any): void;
        solveStep(gk?: any): number;
        solveStepSimple(gk?: any): number;
        solve(steps: any, gk?: any, printError?: boolean): number;
    };
};
declare var PackNodeVertex: {
    new (node: any, co: any): {
        [x: number]: () => string;
        [x: string]: any;
        node: any;
        _id: any;
        edges: any;
        _absPos: any;
        get absPos(): any;
    };
    [x: string]: any;
};
declare var PackNode: {
    new (): {
        [x: number]: () => string;
        pos: any;
        vel: any;
        oldpos: any;
        _id: any;
        size: any;
        startpos: any;
        verts: any;
    };
};
declare function graphGetIslands(nodes: any): any[];
declare function graphPack(nodes: any, margin_or_args: number, steps: number, updateCb: any): {
    stop: () => void;
};
declare var controller_exports: {};
declare function toLockedImpl(): {};
declare var platform_exports: {};
declare var ThemeEditor: {
    new (): {
        [x: string]: any;
        categoryMap: any;
        init(): void;
        doFolder(catkey: any, obj: any, container?: /*elided*/ any, panel?: any, path?: any): void;
        build(): void;
        "__#private@#dataPrefix": string;
        get dataPrefix(): string;
        set dataPrefix(_: string);
        "__#private@#massSetPrefix": string;
        get massSetPrefix(): string;
        set massSetPrefix(_: string);
        "__#private@#inherit_packflag": number;
        get inherit_packflag(): number;
        set inherit_packflag(_: number);
        styletag: any;
        reversed: boolean;
        storagePrefix: string;
        _prefixstack: any[];
        _mass_prefixstack: any[];
        noUndo(): /*elided*/ any;
        set background(bg: any);
        __background: any;
        get childWidgets(): any[];
        /** recursively change path prefix for all children*/
        changePathPrefix(newprefix: any): void;
        reverse(): /*elided*/ any;
        pushMassSetPrefix(val: any): /*elided*/ any;
        pushDataPrefix(val: any): /*elided*/ any;
        popDataPrefix(): /*elided*/ any;
        popMassSetPrefix(): /*elided*/ any;
        saveData(): {
            scrollTop: any;
            scrollLeft: any;
        } | {
            scrollTop?: undefined;
            scrollLeft?: undefined;
        };
        loadData(obj: any): /*elided*/ any;
        /** Returns previous icon flags */
        useIcons: (enabled_or_sheet?: boolean) => number;
        /**
         *
         * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
         * @returns {Container}
         */
        wrap(mode?: string): Container;
        noMarginsOrPadding(): /*elided*/ any;
        setCSS(): void;
        overrideDefault(key: any, val: any): /*elided*/ any;
        strip(themeClass_or_obj: string, margin1: any, margin2: number, horiz: any): any;
        /**
         * tries to set margin along one axis only in smart manner
         * */
        oneAxisMargin(m?: any, m2?: number): /*elided*/ any;
        /**
         * tries to set padding along one axis only in smart manner
         * */
        oneAxisPadding(axisPadding?: any, otherPadding?: number): /*elided*/ any;
        setMargin(m: any): /*elided*/ any;
        setPadding(m: any): /*elided*/ any;
        setSize(width: any, height: any): /*elided*/ any;
        save(): void;
        load(): void;
        saveVisibility(): /*elided*/ any;
        loadVisibility(): boolean;
        toJSON(): any;
        _ondestroy(): void;
        loadJSON(obj: any): /*elided*/ any;
        redrawCurves(): void;
        listen(): void;
        update(): void;
        appendChild(child: any): any;
        clear(trigger_on_destroy?: boolean): void;
        prepend(child: any): void;
        _prepend(child: any): any;
        add(child: any): any;
        insert(i: any, ch: any): void;
        _add(child: any, prepend?: boolean): any;
        dynamicMenu(title: any, list5: any, packflag?: number): any;
        /**example usage:
        
           .menu([
           "some_tool_path.tool()|CustomLabel",
           ui_widgets.Menu.SEP,
           "some_tool_path.another_tool()",
           "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
           ["Name", () => {console.log("do something")}]
           ])
        
           **/
        menu(title: any, list5: any, packflag?: number): any;
        toolPanel(path_or_cls: any, args?: {}): any;
        tool(path_or_cls: any, packflag_or_args: number, createCb: any, label: any): any;
        textbox(inpath: any, text2: any, cb: any, packflag?: number): any;
        pathlabel(inpath: any, label: any, packflag?: number): any;
        label(text2: any): any;
        /**
         *
         * makes a button for a help picker tool
         * to view tooltips on mobile devices
         * */
        helppicker(): any;
        iconbutton(icon: any, description: any, cb: any, thisvar: any, packflag?: number): any;
        button(label: any, cb: any, thisvar: any, id: any, packflag?: number): any;
        _joinPrefix(path: any, prefix?: string): any;
        colorbutton(inpath: any, packflag: any, mass_set_path: any): any;
        noteframe(packflag?: number): any;
        curve1d(inpath: any, packflag: number, mass_set_path: any): any;
        vecpopup(inpath: any, packflag: number, mass_set_path: any): any;
        _getMassPath(ctx: any, inpath: any, mass_set_path: any): any;
        prop(inpath: any, packflag: number, mass_set_path: any): any;
        ctx: any;
        iconcheck(inpath: any, icon: any, description: any, mass_set_path: any): any;
        check(inpath: any, name2: any, packflag: number, mass_set_path: any): any;
        checkenum(inpath: any, name2: any, packflag: any, enummap: any, defaultval: any, callback: any, iconmap: any, mass_set_path: any): any;
        checkenum_panel(inpath: any, name2: any, packflag: number, callback: any, mass_set_path: any, prop: any): any;
        listenum(inpath: any, name2: any, enumDef: any, defaultval: any, callback: any, iconmap: any, packflag?: number): any;
        getroot(): /*elided*/ any;
        simpleslider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, isInt: any, do_redraw: any, callback: any, packflag?: number): any;
        /**
         *
         * usage: .slider(inpath, {
         *  name : bleh,
         *  defaultval : number,
         *  etc...
         * });
         * */
        slider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, is_int: any, do_redraw: any, callback: any, packflag: number, decimalPlaces: any): any;
        _container_inherit(elem: any, packflag?: number): void;
        treeview(): any;
        panel(name2: any, id: any, packflag: number, tooltip: any): any;
        row(packflag?: number): any;
        listbox(packflag?: number): any;
        table(packflag?: number): any;
        twocol(parentDepth?: number, packflag?: number): any;
        col(packflag?: number): any;
        colorPicker(inpath: any, packflag_or_args: number, mass_set_path: any, themeOverride: any): any;
        textarea(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        /**
         * html5 viewer
         * */
        viewer(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        tabs(position?: string, packflag?: number): any;
        asDialogFooter(): /*elided*/ any;
    };
    define(): {
        tagname: string;
        style: string;
    };
};
declare var SVG_URL: string;
declare var CanvasOverdraw: {
    new (): {
        [x: string]: any;
        canvas: any;
        g: any;
        screen: any;
        shapes: any;
        otherChildren: any;
        font: any;
        svg: any;
        startNode(node: any, screen: any): void;
        ctx: any;
        start(screen: any): void;
    };
    [x: string]: any;
    define(): {
        tagname: string;
    };
};
declare var Overdraw: {
    new (): {
        [x: string]: any;
        visibleToPick: any;
        screen: any;
        shapes: any;
        otherChildren: any;
        font: any;
        zindex_base: any;
        svg: any;
        startNode(node: any, screen: any, cssPosition?: string): void;
        ctx: any;
        start(screen: any): void;
        clear(): void;
        drawTextBubbles(texts: any, cos2: any, colors: any): any[];
        text(text2: any, x: any, y: any, args?: {}): HTMLDivElement;
        circle(p: any, r: any, stroke?: string, fill?: string): Element;
        line(v1: any, v2: any, color?: string): Element;
        rect(p: any, size: any, color?: string): Element;
        end(): void;
    };
    [x: string]: any;
    define(): {
        tagname: string;
        style: string;
    };
};
declare var TreeItem: {
    new (): {
        [x: string]: any;
        treeParent: any;
        treeChildren: any;
        treeView: any;
        treeDepth: any;
        header: any;
        _icon1: any;
        _icon2: any;
        opened: any;
        _label: any;
        _labelText: any;
        get icon(): any;
        set icon(id: any);
        open(): void;
        close(): void;
        get text(): any;
        set text(b: any);
        item(name2: any, args?: {}): any;
        init(): void;
        "__#private@#dataPrefix": string;
        get dataPrefix(): string;
        set dataPrefix(_: string);
        "__#private@#massSetPrefix": string;
        get massSetPrefix(): string;
        set massSetPrefix(_: string);
        "__#private@#inherit_packflag": number;
        get inherit_packflag(): number;
        set inherit_packflag(_: number);
        styletag: any;
        reversed: boolean;
        storagePrefix: string;
        _prefixstack: any[];
        _mass_prefixstack: any[];
        noUndo(): /*elided*/ any;
        set background(bg: any);
        __background: any;
        get childWidgets(): any[];
        /** recursively change path prefix for all children*/
        changePathPrefix(newprefix: any): void;
        reverse(): /*elided*/ any;
        pushMassSetPrefix(val: any): /*elided*/ any;
        pushDataPrefix(val: any): /*elided*/ any;
        popDataPrefix(): /*elided*/ any;
        popMassSetPrefix(): /*elided*/ any;
        saveData(): {
            scrollTop: any;
            scrollLeft: any;
        } | {
            scrollTop?: undefined;
            scrollLeft?: undefined;
        };
        loadData(obj: any): /*elided*/ any;
        /** Returns previous icon flags */
        useIcons: (enabled_or_sheet?: boolean) => number;
        /**
         *
         * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
         * @returns {Container}
         */
        wrap(mode?: string): Container;
        noMarginsOrPadding(): /*elided*/ any;
        setCSS(): void;
        overrideDefault(key: any, val: any): /*elided*/ any;
        strip(themeClass_or_obj: string, margin1: any, margin2: number, horiz: any): any;
        /**
         * tries to set margin along one axis only in smart manner
         * */
        oneAxisMargin(m?: any, m2?: number): /*elided*/ any;
        /**
         * tries to set padding along one axis only in smart manner
         * */
        oneAxisPadding(axisPadding?: any, otherPadding?: number): /*elided*/ any;
        setMargin(m: any): /*elided*/ any;
        setPadding(m: any): /*elided*/ any;
        setSize(width: any, height: any): /*elided*/ any;
        save(): void;
        load(): void;
        saveVisibility(): /*elided*/ any;
        loadVisibility(): boolean;
        toJSON(): any;
        _ondestroy(): void;
        loadJSON(obj: any): /*elided*/ any;
        redrawCurves(): void;
        listen(): void;
        update(): void;
        appendChild(child: any): any;
        clear(trigger_on_destroy?: boolean): void;
        prepend(child: any): void;
        _prepend(child: any): any;
        add(child: any): any;
        insert(i: any, ch: any): void;
        _add(child: any, prepend?: boolean): any;
        dynamicMenu(title: any, list5: any, packflag?: number): any;
        /**example usage:
        
           .menu([
           "some_tool_path.tool()|CustomLabel",
           ui_widgets.Menu.SEP,
           "some_tool_path.another_tool()",
           "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
           ["Name", () => {console.log("do something")}]
           ])
        
           **/
        menu(title: any, list5: any, packflag?: number): any;
        toolPanel(path_or_cls: any, args?: {}): any;
        tool(path_or_cls: any, packflag_or_args: number, createCb: any, label: any): any;
        textbox(inpath: any, text2: any, cb: any, packflag?: number): any;
        pathlabel(inpath: any, label: any, packflag?: number): any;
        label(text2: any): any;
        /**
         *
         * makes a button for a help picker tool
         * to view tooltips on mobile devices
         * */
        helppicker(): any;
        iconbutton(icon: any, description: any, cb: any, thisvar: any, packflag?: number): any;
        button(label: any, cb: any, thisvar: any, id: any, packflag?: number): any;
        _joinPrefix(path: any, prefix?: string): any;
        colorbutton(inpath: any, packflag: any, mass_set_path: any): any;
        noteframe(packflag?: number): any;
        curve1d(inpath: any, packflag: number, mass_set_path: any): any;
        vecpopup(inpath: any, packflag: number, mass_set_path: any): any;
        _getMassPath(ctx: any, inpath: any, mass_set_path: any): any;
        prop(inpath: any, packflag: number, mass_set_path: any): any;
        ctx: any;
        iconcheck(inpath: any, icon: any, description: any, mass_set_path: any): any;
        check(inpath: any, name2: any, packflag: number, mass_set_path: any): any;
        checkenum(inpath: any, name2: any, packflag: any, enummap: any, defaultval: any, callback: any, iconmap: any, mass_set_path: any): any;
        checkenum_panel(inpath: any, name2: any, packflag: number, callback: any, mass_set_path: any, prop: any): any;
        listenum(inpath: any, name2: any, enumDef: any, defaultval: any, callback: any, iconmap: any, packflag?: number): any;
        getroot(): /*elided*/ any;
        simpleslider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, isInt: any, do_redraw: any, callback: any, packflag?: number): any;
        /**
         *
         * usage: .slider(inpath, {
         *  name : bleh,
         *  defaultval : number,
         *  etc...
         * });
         * */
        slider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, is_int: any, do_redraw: any, callback: any, packflag: number, decimalPlaces: any): any;
        _container_inherit(elem: any, packflag?: number): void;
        treeview(): any;
        panel(name2: any, id: any, packflag: number, tooltip: any): any;
        row(packflag?: number): any;
        listbox(packflag?: number): any;
        table(packflag?: number): any;
        twocol(parentDepth?: number, packflag?: number): any;
        col(packflag?: number): any;
        colorPicker(inpath: any, packflag_or_args: number, mass_set_path: any, themeOverride: any): any;
        textarea(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        /**
         * html5 viewer
         * */
        viewer(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        tabs(position?: string, packflag?: number): any;
        asDialogFooter(): /*elided*/ any;
    };
    define(): {
        tagname: string;
        style: string;
    };
};
declare var TreeView: {
    new (): {
        [x: string]: any;
        items: any;
        strokes: any;
        overdraw: any;
        init(): void;
        _forAllChildren(item: any, cb: any): void;
        _open(item: any): void;
        _close(item: any): void;
        _makeStrokes(): void;
        updateOverdraw(): void;
        update(): void;
        item(name2: any, args?: {}): any;
        "__#private@#dataPrefix": string;
        get dataPrefix(): string;
        set dataPrefix(_: string);
        "__#private@#massSetPrefix": string;
        get massSetPrefix(): string;
        set massSetPrefix(_: string);
        "__#private@#inherit_packflag": number;
        get inherit_packflag(): number;
        set inherit_packflag(_: number);
        styletag: any;
        reversed: boolean;
        storagePrefix: string;
        _prefixstack: any[];
        _mass_prefixstack: any[];
        noUndo(): /*elided*/ any;
        set background(bg: any);
        __background: any;
        get childWidgets(): any[];
        /** recursively change path prefix for all children*/
        changePathPrefix(newprefix: any): void;
        reverse(): /*elided*/ any;
        pushMassSetPrefix(val: any): /*elided*/ any;
        pushDataPrefix(val: any): /*elided*/ any;
        popDataPrefix(): /*elided*/ any;
        popMassSetPrefix(): /*elided*/ any;
        saveData(): {
            scrollTop: any;
            scrollLeft: any;
        } | {
            scrollTop?: undefined;
            scrollLeft?: undefined;
        };
        loadData(obj: any): /*elided*/ any;
        /** Returns previous icon flags */
        useIcons: (enabled_or_sheet?: boolean) => number;
        /**
         *
         * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
         * @returns {Container}
         */
        wrap(mode?: string): Container;
        noMarginsOrPadding(): /*elided*/ any;
        setCSS(): void;
        overrideDefault(key: any, val: any): /*elided*/ any;
        strip(themeClass_or_obj: string, margin1: any, margin2: number, horiz: any): any;
        /**
         * tries to set margin along one axis only in smart manner
         * */
        oneAxisMargin(m?: any, m2?: number): /*elided*/ any;
        /**
         * tries to set padding along one axis only in smart manner
         * */
        oneAxisPadding(axisPadding?: any, otherPadding?: number): /*elided*/ any;
        setMargin(m: any): /*elided*/ any;
        setPadding(m: any): /*elided*/ any;
        setSize(width: any, height: any): /*elided*/ any;
        save(): void;
        load(): void;
        saveVisibility(): /*elided*/ any;
        loadVisibility(): boolean;
        toJSON(): any;
        _ondestroy(): void;
        loadJSON(obj: any): /*elided*/ any;
        redrawCurves(): void;
        listen(): void;
        appendChild(child: any): any;
        clear(trigger_on_destroy?: boolean): void;
        prepend(child: any): void;
        _prepend(child: any): any;
        add(child: any): any;
        insert(i: any, ch: any): void;
        _add(child: any, prepend?: boolean): any;
        dynamicMenu(title: any, list5: any, packflag?: number): any;
        /**example usage:
        
           .menu([
           "some_tool_path.tool()|CustomLabel",
           ui_widgets.Menu.SEP,
           "some_tool_path.another_tool()",
           "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
           ["Name", () => {console.log("do something")}]
           ])
        
           **/
        menu(title: any, list5: any, packflag?: number): any;
        toolPanel(path_or_cls: any, args?: {}): any;
        tool(path_or_cls: any, packflag_or_args: number, createCb: any, label: any): any;
        textbox(inpath: any, text2: any, cb: any, packflag?: number): any;
        pathlabel(inpath: any, label: any, packflag?: number): any;
        label(text2: any): any;
        /**
         *
         * makes a button for a help picker tool
         * to view tooltips on mobile devices
         * */
        helppicker(): any;
        iconbutton(icon: any, description: any, cb: any, thisvar: any, packflag?: number): any;
        button(label: any, cb: any, thisvar: any, id: any, packflag?: number): any;
        _joinPrefix(path: any, prefix?: string): any;
        colorbutton(inpath: any, packflag: any, mass_set_path: any): any;
        noteframe(packflag?: number): any;
        curve1d(inpath: any, packflag: number, mass_set_path: any): any;
        vecpopup(inpath: any, packflag: number, mass_set_path: any): any;
        _getMassPath(ctx: any, inpath: any, mass_set_path: any): any;
        prop(inpath: any, packflag: number, mass_set_path: any): any;
        ctx: any;
        iconcheck(inpath: any, icon: any, description: any, mass_set_path: any): any;
        check(inpath: any, name2: any, packflag: number, mass_set_path: any): any;
        checkenum(inpath: any, name2: any, packflag: any, enummap: any, defaultval: any, callback: any, iconmap: any, mass_set_path: any): any;
        checkenum_panel(inpath: any, name2: any, packflag: number, callback: any, mass_set_path: any, prop: any): any;
        listenum(inpath: any, name2: any, enumDef: any, defaultval: any, callback: any, iconmap: any, packflag?: number): any;
        getroot(): /*elided*/ any;
        simpleslider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, isInt: any, do_redraw: any, callback: any, packflag?: number): any;
        /**
         *
         * usage: .slider(inpath, {
         *  name : bleh,
         *  defaultval : number,
         *  etc...
         * });
         * */
        slider(datapath: any, name2: any, defaultval: any, min: any, max: any, step: any, is_int: any, do_redraw: any, callback: any, packflag: number, decimalPlaces: any): any;
        _container_inherit(elem: any, packflag?: number): void;
        treeview(): any;
        panel(name2: any, id: any, packflag: number, tooltip: any): any;
        row(packflag?: number): any;
        listbox(packflag?: number): any;
        table(packflag?: number): any;
        twocol(parentDepth?: number, packflag?: number): any;
        col(packflag?: number): any;
        colorPicker(inpath: any, packflag_or_args: number, mass_set_path: any, themeOverride: any): any;
        textarea(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        /**
         * html5 viewer
         * */
        viewer(datapath: any, value: string, packflag: number, mass_set_path: any): any;
        tabs(position?: string, packflag?: number): any;
        asDialogFooter(): /*elided*/ any;
    };
    define(): {
        tagname: string;
        style: string;
    };
};
declare var AreaFlags: {
    HIDDEN: number;
    FLOATING: number;
    INDEPENDENT: number;
    NO_SWITCHER: number;
    NO_HEADER_CONTEXT_MENU: number;
    NO_COLLAPSE: number;
};
declare var ScreenVert: {
    new (pos: any, id: any, added_id: any): {
        [x: number]: () => string;
        [x: string]: any;
        added_id: any;
        sareas: any;
        borders: any;
        _id: any;
        valueOf(): string;
        loadSTRUCT(reader: any): void;
    };
    [x: string]: any;
    hash(pos: any, added_id: any, limit: any): string;
    STRUCT: any;
};
declare var ScreenHalfEdge: {
    new (border: any, sarea: any): {
        [x: number]: () => string;
        sarea: any;
        border: any;
        side: any;
        get v1(): any;
        get v2(): any;
    };
};
declare var ScreenBorder: {
    new (): {
        [x: number]: () => string;
        [x: string]: any;
        screen: any;
        v1: any;
        v2: any;
        _id: any;
        _hash: any;
        outer: any;
        halfedges: any;
        sareas: any;
        _innerstyle: any;
        _style: any;
        inner: any;
        movable: any;
        visibleToPick: boolean;
        getOtherSarea(sarea: any): any;
        get locked(): boolean;
        get dead(): boolean;
        get side(): void;
        set side(_val: void);
        get valence(): number;
        get horiz(): boolean;
        otherVertex(v: any): any;
        setCSS(): void;
        valueOf(): string;
    };
    [x: string]: any;
    bindBorderMenu(elem: any, usePickElement?: boolean): (e: any) => void;
    hash(v1: any, v2: any): string;
    define(): {
        tagname: string;
        style: string;
    };
};
declare var BorderMask: {
    LEFT: number;
    BOTTOM: number;
    RIGHT: number;
    TOP: number;
    ALL: number;
};
declare var BorderSides: {
    LEFT: number;
    BOTTOM: number;
    RIGHT: number;
    TOP: number;
};
declare var Area: {
    new (): {
        [x: number]: boolean;
        [x: string]: any;
        borderLock: any;
        flag: any;
        pos: any;
        size: any;
        inactive: any;
        areaDragToolEnabled: any;
        owning_sarea: any;
        _area_id: any;
        minSize: any;
        maxSize: any;
        keymap: any;
        header: any;
        /** Notifications area. */
        noteArea: any;
        switcher: any;
        helppicker: any;
        saved_uidata: any;
        areaName: any;
        dead: boolean;
        get floating(): number;
        set floating(val: number);
        init(): void;
        _get_v_suffix(): any;
        /**
         * Return a list of keymaps used by this editor
         */
        getKeyMaps(): any[];
        on_fileload(isActiveEditor: any): void;
        buildDataPath(): string;
        saveData(): {
            _area_id: any;
            areaName: any;
        };
        loadData(obj: any): /*elided*/ any;
        draw(): void;
        copy(): any;
        on_resize(size: any): void;
        on_area_focus(): void;
        on_area_blur(): void;
        /** called when editors are swapped with another editor type*/
        on_area_active(): void;
        /** called when editors are swapped with another editor type*/
        on_area_inactive(): void;
        push_ctx_active(dontSetLastRef?: boolean): void;
        /**
         * see push_ctx_active
         * */
        pop_ctx_active(dontSetLastRef?: boolean): void;
        getScreen(): void;
        toJSON(): any;
        loadJSON(obj: any): /*elided*/ any;
        getBarHeight(): any;
        makeAreaSwitcher(container: any): any;
        makeHeader(container: any, addNoteArea?: boolean, makeDraggable?: boolean): any;
        setCSS(): void;
        update(): void;
        loadSTRUCT(reader: any): void;
        _isDead(): boolean;
        afterSTRUCT(): void;
        _getSavedUIData(): string;
    };
    [x: string]: any;
    STRUCT: any;
    /**
     * Get active area as defined by push_ctx_active and pop_ctx_active.
     *
     * Type should be an Area subclass, if undefined the last accessed area
     * will be returned.
     * */
    getActiveArea(type: any): any;
    unregister(cls: any): void;
    register(_cls: any, isInternal?: boolean): void;
    makeAreasEnum(): any;
    getAreaName(area: any): any;
    define(): {
        tagname: string;
        areaname: string;
        flag: number;
        uiname: undefined;
        icon: undefined;
        borderLock: undefined;
    };
    newSTRUCT(): any;
};
declare var ScreenArea2: {
    new (): {
        [x: string]: any;
        keymap: any;
        screen: any;
        _flag: any;
        _borders: any;
        _verts: any;
        dead: any;
        _sarea_id: any;
        _pos: any;
        _size: any;
        area: any;
        editors: any;
        editormap: any;
        switcherData: any;
        on_keyup: any;
        on_keypress: any;
        get floating(): boolean;
        set floating(val: boolean);
        get flag(): number;
        set flag(v: number);
        get borderLock(): any;
        get minSize(): any;
        get maxSize(): any;
        get pos(): any;
        set pos(val: any);
        get size(): any;
        set size(val: any);
        _get_v_suffix(): any;
        bringToFront(): void;
        _side(border: any): any;
        init(): void;
        draw(): void;
        _isDead(): boolean;
        toJSON(): any;
        on_keydown(e: any): void;
        loadJSON(obj: any): void;
        _ondestroy(): void;
        getScreen(): any;
        copy(screen: any): any;
        snapToScreenSize(): void;
        /**
         *
         * Sets screen verts from pos/size
         * */
        loadFromPosSize(): /*elided*/ any;
        /**
         *
         * Sets pos/size from screen verts
         * */
        loadFromVerts(): /*elided*/ any;
        on_resize(size: any): void;
        makeBorders(screen: any): /*elided*/ any;
        setCSS(): void;
        appendChild(child: any): any;
        switch_editor(cls: any): void;
        switchEditor(cls: any): void;
        _checkWrangler(): void;
        update(): void;
        removeChild(ch: any): any;
        afterSTRUCT(): void;
        loadSTRUCT(reader: any): void;
    };
    [x: string]: any;
    STRUCT: any;
    newSTRUCT(): any;
    define(): {
        tagname: string;
    };
};
declare function registerToolStackGetter2(func: any): void;
declare function purgeUpdateStack(): void;
declare var Screen2: {
    new (): {
        [x: symbol]: boolean;
        [x: string]: any;
        snapLimit: any;
        fullScreen: any;
        globalCSS: any;
        _do_updateSize: any;
        _resize_callbacks: any;
        allBordersMovable: any;
        needsBorderRegen: any;
        _popup_safe: any;
        testAllKeyMaps: any;
        needsTabRecalc: any;
        _screen_id: any;
        _popups: any;
        keymap: any;
        size: any;
        pos: any;
        oldpos: any;
        idgen: any;
        sareas: any;
        mpos: any;
        screenborders: any;
        screenverts: any;
        _vertmap: any;
        _edgemap: any;
        _idmap: any;
        _aabb: any;
        listen_timer: any;
        _last_ckey1: any;
        _update_gen: any;
        _last_scrollstyle_key: any;
        _debug_overlay: any;
        uidata: any;
        _ctx: any;
        get borders(): Generator<any, void, unknown>;
        get listening(): boolean;
        get ctx(): any;
        set ctx(val: any);
        setPosSize(x: any, y: any, w: any, h: any): void;
        setSize(w: any, h: any): void;
        setPos(x: any, y: any): void;
        init(): void;
        /**
         *
         * @param {*} style May be a string, a CSSStyleSheet instance, or a style tag
         * @returns Promise fulfilled when style has been merged
         */
        mergeGlobalCSS(style: any): Promise<unknown>;
        newScreenArea(): any;
        copy(): any;
        findScreenArea(x: any, y: any): any;
        pickElement(x: any, y: any, args: {}, marginy: number, nodeclass: any, excluded_classes: any): any;
        _enterPopupSafe(): void;
        _allAreas(): Generator<any[], void, unknown>;
        _exitPopupSafe(): void;
        popupMenu(menu: any, x: any, y: any): any;
        /**
         *
         * @param popupDelay : if non-zero, wait for popup to layout for popupDelay miliseconds,
         *                     then move the popup so it's fully inside the window (if it's outsize).
         *
         * */
        popup(owning_node: any, elem_or_x: any, y: any, closeOnMouseOut?: boolean, popupDelay?: number): any;
        draggablePopup(x: any, y: any): any;
        /** makes a popup at x,y and returns a new container-x for it */
        _popup(owning_node: any, elem_or_x: any, y: any, closeOnMouseOut?: boolean): any;
        _recalcAABB(save?: boolean): any[];
        load(): void;
        save(): void;
        popupArea(area_class: any): any;
        remove(trigger_destroy?: boolean): any;
        unlisten(): void;
        checkCSSSize(): void;
        getBoolAttribute(attr: any, defaultval?: boolean): boolean;
        updateSize(): void;
        listen(args?: {
            updateSize: boolean;
        }): void;
        _calcSizeKey(w: any, h: any, x: any, y: any, dpi: any, scale: any): string;
        _ondestroy(): void;
        destroy(): void;
        clear(): void;
        _test_save(): void;
        loadJSON(obj: any, schedule_resize?: boolean): void;
        toJSON(): any;
        getHotKey(toolpath: any): any;
        addEventListener(type: any, cb: any, options: any): any;
        removeEventListener(type: any, cb: any, options: any): any;
        execKeyMap(e: any): boolean;
        calcTabOrder(): void;
        drawUpdate(): void;
        update(): void;
        purgeUpdateStack(): void;
        completeSetCSS(): void;
        completeUpdate(): void;
        updateScrollStyling(): void;
        update_intern(): Generator<any, void, unknown>;
        loadFromVerts(): void;
        /** merges sarea into the screen area opposite to sarea*/
        collapseArea(sarea: any, border: any): /*elided*/ any;
        splitArea(sarea: any, t?: number, horiz?: boolean): any;
        setCSS(): void;
        regenScreenMesh(snapLimit?: number): void;
        regenBorders_stage2(): void;
        hasBorder(b: any): boolean;
        killScreenVertex(v: any): /*elided*/ any;
        freeBorder(b: any, sarea: any): void;
        killBorder(b: any): /*elided*/ any;
        regenBorders(): void;
        _get_debug_overlay(): any;
        updateDebugBoxes(): void;
        checkAreaConstraint(sarea: any, checkOnly?: boolean): number | false;
        walkBorderLine(b: any): any[];
        moveBorderWithoutVerts(halfedge: any, df: any): void;
        moveBorder(b: any, df: any, strict?: boolean): boolean;
        moveBorderSimple(b: any, df: any, strict?: boolean): boolean;
        moveBorderUnused(b: any, df: any, strict?: boolean): boolean;
        solveAreaConstraints(snapArgument?: boolean): void;
        snapScreenVerts(fitToSize?: boolean): void;
        on_resize(oldsize: any, newsize?: any, _set_key?: boolean): void;
        _fireResizeCB(oldsize?: any): void;
        getScreenVert(pos: any, added_id?: string, floating?: boolean): any;
        isBorderOuter(border: any): boolean;
        isBorderMovable(b: any, limit?: number): boolean;
        getScreenBorder(sarea: any, co1: any, co2: any, side: any): any;
        minmaxArea(sarea: any, mm: any): any;
        areasBorder(sarea1: any, sarea2: any): boolean;
        replaceArea(dst: any, src: any): void;
        _internalRegenAll(): void;
        _updateAll(): void;
        removeArea(sarea: any): void;
        appendChild(child: any): any;
        add(child: any): any;
        hintPickerTool(): void;
        removeAreaTool(border: any): void;
        moveAttachTool(sarea: any, mpos: any, elem: any, pointerId: any): void;
        splitTool(): void;
        areaDragTool(sarea?: any): void;
        makeBorders(): void;
        cleanupBorders(): void;
        mergeBlankAreas(): void;
        floatArea(area: any): any;
        on_keydown(e: any): any;
        on_keyup(e: any): any;
        on_keypress(e: any): any;
        draw(): void;
        afterSTRUCT(): void;
        loadSTRUCT(reader: any): /*elided*/ any;
        saveUIData(): string;
        loadUIData(str: any): void;
    };
    [x: string]: any;
    STRUCT: any;
    fromJSON(obj: any, schedule_resize?: boolean): any;
    define(): {
        tagname: string;
    };
    newSTRUCT(): any;
};
declare function startEvents(getScreenFunc: any): void;
declare function stopEvents(): any;
declare function setKeyboardDom(dom: any): void;
declare function setKeyboardOpts(opts: any): void;
declare function _onEventsStart(cb: any): void;
declare function _onEventsStop(cb: any): void;
declare var simple_exports: {};
declare var DocsAPI: {
    new (): {
        start(): void;
        updateDoc(_relpath: any, _data: any): any;
        newDoc(_relpath: any, _data: any): any;
        hasDoc(_relpath: any): any;
        uploadImage(_relpath: any, _blobInfo: any, _success: any, _onError: any): any;
    };
};
declare var ElectronAPI: {
    new (): {
        first: boolean;
        ready: boolean;
        config: any;
        _doinit(): boolean;
        start(): void;
        checkInit(): boolean;
        uploadImage(relpath: any, blobInfo: any, success: any, onError: any): Promise<unknown>;
        hasDoc(relpath: any): Promise<unknown>;
        updateDoc(relpath: any, data: any): Promise<unknown>;
        newDoc(relpath: any, data: any): Promise<unknown>;
    };
};
declare var ServerAPI: {
    new (): {
        start(): void;
        hasDoc(relpath: any): Promise<unknown>;
        updateDoc(relpath: any, data: any): Promise<unknown>;
        newDoc(relpath: any, data: any): Promise<unknown>;
        uploadImage(relpath: any, blobInfo: any, success: any, onError: any): Promise<unknown>;
        callAPI(...callArgs: any[]): Promise<unknown>;
    };
};
declare var DocHistoryItem: {
    new (url: any, title: any): {
        url: any;
        title: any;
        loadSTRUCT(reader: any): void;
    };
    STRUCT: string;
};
declare var DocHistory: {
    new (): {
        [n: number]: any;
        cur: number;
        push(url: any, title?: any): number;
        length: number;
        go(dir: any): any;
        loadSTRUCT(reader: any): void;
        toString(): string;
        toLocaleString(): string;
        toLocaleString(locales: string | string[], options?: Intl.NumberFormatOptions & Intl.DateTimeFormatOptions): string;
        pop(): any;
        concat(...items: ConcatArray<any>[]): any[];
        concat(...items: any[]): any[];
        join(separator?: string): string;
        reverse(): any[];
        shift(): any;
        slice(start?: number, end?: number): any[];
        sort(compareFn?: (a: any, b: any) => number): /*elided*/ any;
        splice(start: number, deleteCount?: number): any[];
        splice(start: number, deleteCount: number, ...items: any[]): any[];
        unshift(...items: any[]): number;
        indexOf(searchElement: any, fromIndex?: number): number;
        lastIndexOf(searchElement: any, fromIndex?: number): number;
        every<S extends any>(predicate: (value: any, index: number, array: any[]) => value is S, thisArg?: any): this is S[];
        every(predicate: (value: any, index: number, array: any[]) => unknown, thisArg?: any): boolean;
        some(predicate: (value: any, index: number, array: any[]) => unknown, thisArg?: any): boolean;
        forEach(callbackfn: (value: any, index: number, array: any[]) => void, thisArg?: any): void;
        map<U>(callbackfn: (value: any, index: number, array: any[]) => U, thisArg?: any): U[];
        filter<S extends any>(predicate: (value: any, index: number, array: any[]) => value is S, thisArg?: any): S[];
        filter(predicate: (value: any, index: number, array: any[]) => unknown, thisArg?: any): any[];
        reduce(callbackfn: (previousValue: any, currentValue: any, currentIndex: number, array: any[]) => any): any;
        reduce(callbackfn: (previousValue: any, currentValue: any, currentIndex: number, array: any[]) => any, initialValue: any): any;
        reduce<U>(callbackfn: (previousValue: U, currentValue: any, currentIndex: number, array: any[]) => U, initialValue: U): U;
        reduceRight(callbackfn: (previousValue: any, currentValue: any, currentIndex: number, array: any[]) => any): any;
        reduceRight(callbackfn: (previousValue: any, currentValue: any, currentIndex: number, array: any[]) => any, initialValue: any): any;
        reduceRight<U>(callbackfn: (previousValue: U, currentValue: any, currentIndex: number, array: any[]) => U, initialValue: U): U;
        find<S extends any>(predicate: (value: any, index: number, obj: any[]) => value is S, thisArg?: any): S;
        find(predicate: (value: any, index: number, obj: any[]) => unknown, thisArg?: any): any;
        findIndex(predicate: (value: any, index: number, obj: any[]) => unknown, thisArg?: any): number;
        fill(value: any, start?: number, end?: number): /*elided*/ any;
        copyWithin(target: number, start: number, end?: number): /*elided*/ any;
        [Symbol.iterator](): ArrayIterator<any>;
        entries(): ArrayIterator<[number, any]>;
        keys(): ArrayIterator<number>;
        values(): ArrayIterator<any>;
        readonly [Symbol.unscopables]: {
            [x: number]: boolean;
            length?: boolean;
            toString?: boolean;
            toLocaleString?: boolean;
            pop?: boolean;
            push?: boolean;
            concat?: boolean;
            join?: boolean;
            reverse?: boolean;
            shift?: boolean;
            slice?: boolean;
            sort?: boolean;
            splice?: boolean;
            unshift?: boolean;
            indexOf?: boolean;
            lastIndexOf?: boolean;
            every?: boolean;
            some?: boolean;
            forEach?: boolean;
            map?: boolean;
            filter?: boolean;
            reduce?: boolean;
            reduceRight?: boolean;
            find?: boolean;
            findIndex?: boolean;
            fill?: boolean;
            copyWithin?: boolean;
            [Symbol.iterator]?: boolean;
            entries?: boolean;
            keys?: boolean;
            values?: boolean;
            readonly [Symbol.unscopables]?: boolean;
            includes?: boolean;
            flatMap?: boolean;
            flat?: boolean;
            at?: boolean;
            findLast?: boolean;
            findLastIndex?: boolean;
            toReversed?: boolean;
            toSorted?: boolean;
            toSpliced?: boolean;
            with?: boolean;
        };
        includes(searchElement: any, fromIndex?: number): boolean;
        flatMap<U, This = undefined>(callback: (this: This, value: any, index: number, array: any[]) => U | readonly U[], thisArg?: This): U[];
        flat<A, D extends number = 1>(this: A, depth?: D): FlatArray<A, D>[];
        at(index: number): any;
        findLast<S extends any>(predicate: (value: any, index: number, array: any[]) => value is S, thisArg?: any): S;
        findLast(predicate: (value: any, index: number, array: any[]) => unknown, thisArg?: any): any;
        findLastIndex(predicate: (value: any, index: number, array: any[]) => unknown, thisArg?: any): number;
        toReversed(): any[];
        toSorted(compareFn?: (a: any, b: any) => number): any[];
        toSpliced(start: number, deleteCount: number, ...items: any[]): any[];
        toSpliced(start: number, deleteCount?: number): any[];
        with(index: number, value: any): any[];
    };
    STRUCT: string;
    isArray(arg: any): arg is any[];
    from<T>(arrayLike: ArrayLike<T>): T[];
    from<T, U>(arrayLike: ArrayLike<T>, mapfn: (v: T, k: number) => U, thisArg?: any): U[];
    from<T>(iterable: Iterable<T> | ArrayLike<T>): T[];
    from<T, U>(iterable: Iterable<T> | ArrayLike<T>, mapfn: (v: T, k: number) => U, thisArg?: any): U[];
    of<T>(...items: T[]): T[];
    readonly [Symbol.species]: ArrayConstructor;
    fromAsync<T>(iterableOrArrayLike: AsyncIterable<T> | Iterable<T | PromiseLike<T>> | ArrayLike<T | PromiseLike<T>>): Promise<T[]>;
    fromAsync<T, U>(iterableOrArrayLike: AsyncIterable<T> | Iterable<T> | ArrayLike<T>, mapFn: (value: Awaited<T>, index: number) => U, thisArg?: any): Promise<Awaited<U>[]>;
};
declare var DocsBrowser: {
    new (): {
        [x: string]: any;
        _sourceData: any;
        saveCallback: any;
        handlesDocURL: boolean;
        pathuxBaseURL: any;
        editMode: boolean;
        history: any;
        _prefix: any;
        saveReq: number;
        saveReqStart: any;
        _last_save: any;
        header: any;
        root: any;
        serverapi: any;
        currentPath: string;
        _doDocInit: boolean;
        contentDiv: any;
        tinymce: any;
        oneditstart: any;
        oneditend: any;
        setEditMode(state: any): void;
        go(dir: any): void;
        makeHeader(): void;
        makeHeader_intern(): void;
        init(): void;
        execCommand(...args: any[]): void;
        loadSource(data: any): void;
        load(url: any): void;
        initDoc(): void;
        queueSave(): void;
        undoPre(_label: any): void;
        undoPost(_label: any): void;
        enableLinks(): void;
        disableLinks(): void;
        patchImageTags(): void;
        patchImage(img: any): void;
        toMarkdown(): string;
        getDocPath(): string;
        save(): void;
        updateCurrentPath(): void;
        report(message2: any, color: any, timeout: any): void;
        update(): void;
        setCSS(): void;
        loadSTRUCT(reader: any): void;
    };
    [x: string]: any;
    STRUCT: string;
    newSTRUCT(): any;
    define(): {
        tagname: string;
        style: string;
    };
};
export { AbstractCurve, Area, AreaFlags, AreaTypes, AreaWrangler, BSplineCurve, BSplineTransformOp, BoolProperty, BorderMask, BorderSides, BounceCurve, Button, ButtonEventBase, COLINEAR, COLINEAR_ISECT, CSSFont, CURVE_VERSION, CanvasOverdraw, Check, Check1, ClassIdSymbol, ClosestCurveRets, ClosestModes, ColorField, ColorPicker, ColorPickerButton, ColorSchemeTypes, ColumnFrame, Constraint, Container3 as Container, Context, ContextFlags, ContextOverlay, Curve1D, Curve1DPoint, Curve1DProperty, Curve1DWidget, Curve1dBSplineAddOp, Curve1dBSplineDeleteOp, Curve1dBSplineLoadTemplOp, Curve1dBSplineOpBase, Curve1dBSplineResetOp, Curve1dBSplineSelectOp, CurveConstructors, CurveFlags, CurveTypeData, CustomIcon, DataAPI2 as DataAPI, DataFlags, DataList, DataPath, DataPathError, DataPathSetOp, DataStruct2 as DataStruct, DataTypes, DegreeUnit, DocHistory, DocHistoryItem, DocsAPI, DocsBrowser, DoubleClickHandler, DropBox, EaseCurve, ElasticCurve, ElectronAPI, ElementClasses, EnumKeyPair, EnumProperty, EnumPropertyBase, EquationCurve, ErrorColors, EulerOrders, FEPS, FEPS_DATA, FLOAT_MAX, FLOAT_MIN, FileDialogArgs, FilePath, FlagProperty, FloatArrayProperty, FloatConstrinats, FloatProperty, FootUnit, GuassianCurve, HotKey, HueField, IconButton, IconCheck, IconLabel, IconManager, IconSheets, Icons, InchUnit, IndexRange, InheritFlag2 as InheritFlag, IntProperty, IntegerConstraints, IsMobile, KeyMap, LINECROSS, Label, LastToolPanel, ListBox2 as ListBox, ListItem, ListProperty, LockedContext, MacroClasses, MacroLink, MakeUINameWordMap, Mat4Property, Mat4Stack, Matrix4, Matrix4UI, Menu, MenuWrangler, MeterUnit, MileUnit, MinMax, MinMax1, ModalTabMove, ModelInterface, Note, NoteFrame, NumProperty, NumSlider, NumSliderSimple, NumSliderSimpleBase, NumSliderWithTextBox, NumberConstraints, NumberConstraintsBase, OldButton, Overdraw, OverlayClasses, PackFlags, PackNode, PackNodeVertex, PanelContents2 as PanelContents, PanelFrame, ParamKey, Parser, PercentUnit, PixelUnit, PlaneOps, PlatformAPI, ProgBarNote, ProgressCircle, PropClasses, PropFlags, PropSubTypes2 as PropSubTypes, PropTypes, Quat, QuatProperty, RadianUnit, RandCurve, ReportProperty, RichEditor, RichViewer, RowFrame, SEP, SQRT2, SVG_URL, SatValField, SavedToolDefaults, Screen2 as Screen, ScreenArea2 as ScreenArea, ScreenBorder, ScreenHalfEdge, ScreenVert, ServerAPI, SimpleBox, SimpleCurveBase, SliderDefaults, SliderWithTextbox, Solver, SplineTemplateIcons, SplineTemplates, SquareFootUnit, StringProperty, StringPropertyBase, StringSetProperty, StructFlags, TabBar, TabContainer3 as TabContainer, TabItem, TabItemContainer2 as TabItemContainer, TableFrame, TableRow, TangentModes, TextBox2 as TextBox, TextBoxBase, ThemeEditor, ThemeScrollBars, ToolClasses, ToolFlags, ToolMacro, ToolOp, ToolOpIface, ToolPaths, ToolProperty, ToolPropertyCache, ToolStack, ToolTip, TreeItem, TreeView, TwoColumnFrame, UIBase2 as UIBase, UIFlags, UndoFlags, Unit, Units, ValueButtonBase, Vec2Property, Vec3Property, Vec4Property, VecPropertyBase, Vector2, Vector3, Vector4, VectorPanel, VectorPopupButton, _NumberPropertyBase, _ensureFont, _getFont, _getFont_new, _old_isect_ray_plane, _onEventsStart, _onEventsStop, _setModalAreaClass, _setScreenClass, _setTextboxClass, _testSetScrollbars, _themeUpdateKey, aabb_intersect_2d, aabb_intersect_3d, aabb_isect_2d, aabb_isect_3d, aabb_isect_cylinder_3d, aabb_isect_line_2d, aabb_isect_line_3d, aabb_overlap_area, aabb_sphere_dist, aabb_sphere_isect, aabb_sphere_isect_2d, aabb_union, aabb_union_2d, angle_between_vecs, barycentric_v2, binomial, buildParser, buildString, buildToolOpAPI, buildToolSysAPI, calcThemeKey, calc_projection_axes, const_default as cconst, checkForTextBox, circ_from_line_tan, circ_from_line_tan_2d, clip_line_w, closestPoint, closest_point_on_line, closest_point_on_quad, closest_point_on_tri, cmyk_to_rgb, colinear, colinear2d, color2css3 as color2css, color2web, compatMap, config_exports as config, contextWrangler, controller_exports as controller, convert, copyEvent, copyTheme, corner_normal, createMenu, css2color2 as css2color, customHandlers, customPropertyTypes, defaultDecimalPlaces, defaultRadix, dihedral_v3_sqr, dist_to_line, dist_to_line_2d, dist_to_line_sqr, dist_to_tri_v3, dist_to_tri_v3_old, dist_to_tri_v3_sqr, domEventAttrs, domTransferAttrs, dpistack, drawRoundBox, drawRoundBox2, drawText, electron_api_exports as electron_api, error, evalHermiteTable, eventWasMouseDown, eventWasTouch, eventdag_exports as eventgraph, excludedKeys, expand_line, expand_rect2d, exportTheme, feps, flagThemeUpdate, genHermiteTable, gen_circle, getAreaIntName, getCurve, getDataPathToolOp, getDefault, getFieldImage, getFont, getHueField, getIconManager, getLastToolStruct, getMime, getNoteFrames, getTagPrefix, getTempProp, getVecClass, getWranglerScreen, get_boundary_winding, get_rect_lines, get_rect_points, get_tri_circ, graphGetIslands, graphPack, haveModal, hsv_to_rgb, html5_fileapi_exports as html5_fileapi, iconSheetFromPackFlag, iconmanager, initPage, initSimpleController, initSplineTemplates, initToolPaths, inrect_2d, internalSetTimeout, inv_sample, invertTheme, isLeftClick, isMimeText, isMouseDown, isNum, isNumber, isect_ray_plane, keymap, keymap_latin_1, line_isect, line_line_cross, line_line_isect, loadFile, loadPage, loadUIData, lz_string_default as lzstring, makeCircleMesh, makeDerivedOverlay, makeIconDiv, marginPaddingCSSKeys, math_exports as math, measureText, measureTextBlock, menuWrangler, message, mimeMap, minmax_verts, modalstack, mySafeJSONParse, mySafeJSONStringify, normal_poly, normal_quad, normal_quad_old, normal_tri, noteframes, struct_default as nstructjs, parseToolPath, parseValue, parseValueIntern, parseXML, parsepx2 as parsepx, parseutil_exports as parseutil, pathDebugEvent, pathParser, platform_exports as platform, point_in_aabb, point_in_aabb_2d, point_in_hex, point_in_tri, popModalLight, popReportName, progbarNote, project, purgeUpdateStack, pushModalLight, pushPointerModal, pushReportName, quadIsConvex, quad_bilinear, quad_uv_2d, registerTool, registerToolStackGetter2 as registerToolStackGetter, report2 as report, reverse_keymap, rgb_to_cmyk, rgb_to_hsv, rot2d, sample, saveFile, saveUIData, sendNote, setAreaTypes, setBaseUnit, setColorSchemeType, setContextClass, setDataPathToolOp, setDefaultUndoHandlers, setIconManager, setIconMap, setImplementationClass, setKeyboardDom, setKeyboardOpts, setMetric, setNotifier, setPropTypes, setTagPrefix, setTheme, setWranglerScreen, simple_exports as simple, simple_tri_aabb_isect, singleMouseEvent, sliderDomAttributes, solver_exports as solver, startEvents, startMenu, startMenuEventWrangling, stopEvents, styleScrollBars, tab_idgen, test, testToolParser, tet_volume, textMimes, theme, toLockedImpl, toolprop_abstract_exports as toolprop_abstract, tri_angles, tri_area, trilinear_co, trilinear_co2, trilinear_v3, unproject, util_exports as util, validateCSSColor, validateWebColor, vectormath_exports as vectormath, warning, web2color, winding, winding_axis };
/*!mobile-detect v1.4.4 2019-09-21*/
/*!@license Copyright 2013, Heinrich Goebl, License: MIT, see https://github.com/hgoebl/mobile-detect.js*/
