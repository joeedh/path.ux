interface ClipboardEntry {
    name: string;
    mime: string;
    data: string | undefined;
}
export interface DebugFlags {
    paranoidEvents?: boolean;
    screenborders?: boolean;
    areaContextPushes?: boolean;
    allBordersMovable?: boolean;
    doOnce?: boolean;
    modalEvents?: boolean;
    areaConstraintSolver?: boolean;
    datapaths?: boolean;
    lastToolPanel?: boolean;
    domEvents?: boolean;
    domEventAddRemove?: boolean;
    debugUIUpdatePerf?: boolean;
    screenAreaPosSizeAccesses?: boolean;
    buttonEvents?: boolean;
    [key: string]: boolean | undefined;
}
export interface IPathUXConstants {
    colorSchemeType?: "light" | "dark";
    useNumSliderTextboxes?: boolean;
    numSliderArrowLimit?: number;
    simpleNumSliders?: boolean;
    /** Can menus pop above dropboxes */
    menusCanPopupAbove?: boolean;
    menu_close_time?: number;
    doubleClickTime?: number;
    doubleClickHoldTime?: number;
    autoLoadSplineTemplates?: boolean;
    /** Add tooltip picker tools to screen area headers for mobile devices. */
    addHelpPickers?: boolean;
    /** Use tab based area docker instead of the default dropboxe-based area switcher */
    useAreaTabSwitcher?: boolean;
    autoSizeUpdate?: boolean;
    showPathsInToolTips?: boolean;
    enableThemeAutoUpdate?: boolean;
    useNativeToolTips?: boolean;
    noElectronMenus?: boolean;
    DEBUG?: DebugFlags;
    docManualPath?: string;
    docEditorPath?: string;
}
interface PathUXConfigProvider extends Required<IPathUXConstants> {
    getClipboardData(desiredMimes?: string | string[]): ClipboardEntry | undefined;
    setClipboardData(name: string, mime: string, data: string): void;
    loadConstants(args: IPathUXConstants): void;
    [key: string]: unknown;
}
declare const cconst: PathUXConfigProvider;
export default cconst;
//# sourceMappingURL=const.d.ts.map