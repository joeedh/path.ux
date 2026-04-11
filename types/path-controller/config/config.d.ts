export interface PathControllerConfig {
    doubleClickTime: number;
    autoLoadSplineTemplates: boolean;
    doubleClickHoldTime: number;
    DEBUG: Record<string, boolean>;
}
export declare const config: PathControllerConfig;
export declare function setConfig(obj: Partial<PathControllerConfig>): void;
export default config;
//# sourceMappingURL=config.d.ts.map