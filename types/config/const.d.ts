interface ClipboardEntry {
    name: string;
    mime: string;
    data: string | undefined;
}
export interface DebugFlags {
    paranoidEvents: boolean;
    screenborders: boolean;
    areaContextPushes: boolean;
    allBordersMovable: boolean;
    doOnce: boolean;
    modalEvents: boolean;
    areaConstraintSolver: boolean;
    datapaths: boolean;
    lastToolPanel: boolean;
    domEvents: boolean;
    domEventAddRemove: boolean;
    debugUIUpdatePerf: boolean;
    screenAreaPosSizeAccesses: boolean;
    buttonEvents: boolean;
    [key: string]: boolean;
}
export interface PathUXConstants {
    getClipboardData(desiredMimes?: string | string[]): ClipboardEntry | undefined;
    setClipboardData(name: string, mime: string, data: string): void;
    colorSchemeType: string;
    docManualPath: string;
    docEditorPath: string;
    useNumSliderTextboxes: boolean;
    numSliderArrowLimit: number;
    simpleNumSliders: boolean;
    menusCanPopupAbove: boolean;
    menu_close_time: number;
    doubleClickTime: number;
    doubleClickHoldTime: number;
    DEBUG: DebugFlags;
    autoLoadSplineTemplates: boolean;
    addHelpPickers: boolean;
    useAreaTabSwitcher: boolean;
    autoSizeUpdate: boolean;
    showPathsInToolTips: boolean;
    enableThemeAutoUpdate: boolean;
    useNativeToolTips: boolean;
    noElectronMenus: boolean;
    loadConstants(args: Partial<PathUXConstants>): void;
    [key: string]: unknown;
}
declare const cconst: PathUXConstants;
export default cconst;
//# sourceMappingURL=const.d.ts.map