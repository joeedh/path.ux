/**
 * @module TweenJS
 */
/**
 * The Ease class provides a collection of easing functions for use with TweenJS. It does not use the standard 4 param
 * easing signature. Instead it uses a single param which indicates the current linear ratio (0 to 1) of the tween.
 *
 * Most methods on Ease can be passed directly as easing functions:
 *
 *      createjs.Tween.get(target).to({x:100}, 500, createjs.Ease.linear);
 *
 * However, methods beginning with "get" will return an easing function based on parameter values:
 *
 *      createjs.Tween.get(target).to({y:200}, 500, createjs.Ease.getPowIn(2.2));
 *
 * Please see the <a href="http://www.createjs.com/Demos/TweenJS/Tween_SparkTable">spark table demo</a> for an
 * overview of the different ease types on <a href="http://tweenjs.com">TweenJS.com</a>.
 *
 * <em>Equations derived from work by Robert Penner.</em>
 * @class Ease
 * @static
 **/
type EasingFunction = (t: number) => number;
declare class Ease {
    private constructor();
    /**
     * @method linear
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static linear: EasingFunction;
    /**
     * Identical to linear.
     * @method none
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static none: EasingFunction;
    /**
     * Mimics the simple -100 to 100 easing in Adobe Flash/Animate.
     * @method get
     * @param {Number} amount A value from -1 (ease in) to 1 (ease out) indicating the strength and direction of the ease.
     * @static
     * @return {Function}
     **/
    static get(amount: number): EasingFunction;
    /**
     * Configurable exponential ease.
     * @method getPowIn
     * @param {Number} pow The exponent to use (ex. 3 would return a cubic ease).
     * @static
     * @return {Function}
     **/
    static getPowIn(pow: number): EasingFunction;
    /**
     * Configurable exponential ease.
     * @method getPowOut
     * @param {Number} pow The exponent to use (ex. 3 would return a cubic ease).
     * @static
     * @return {Function}
     **/
    static getPowOut(pow: number): EasingFunction;
    /**
     * Configurable exponential ease.
     * @method getPowInOut
     * @param {Number} pow The exponent to use (ex. 3 would return a cubic ease).
     * @static
     * @return {Function}
     **/
    static getPowInOut(pow: number): EasingFunction;
    /**
     * @method quadIn
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static quadIn: EasingFunction;
    /**
     * @method quadOut
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static quadOut: EasingFunction;
    /**
     * @method quadInOut
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static quadInOut: EasingFunction;
    /**
     * @method cubicIn
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static cubicIn: EasingFunction;
    /**
     * @method cubicOut
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static cubicOut: EasingFunction;
    /**
     * @method cubicInOut
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static cubicInOut: EasingFunction;
    /**
     * @method quartIn
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static quartIn: EasingFunction;
    /**
     * @method quartOut
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static quartOut: EasingFunction;
    /**
     * @method quartInOut
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static quartInOut: EasingFunction;
    /**
     * @method quintIn
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static quintIn: EasingFunction;
    /**
     * @method quintOut
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static quintOut: EasingFunction;
    /**
     * @method quintInOut
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static quintInOut: EasingFunction;
    /**
     * @method sineIn
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static sineIn: EasingFunction;
    /**
     * @method sineOut
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static sineOut: EasingFunction;
    /**
     * @method sineInOut
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static sineInOut: EasingFunction;
    /**
     * Configurable "back in" ease.
     * @method getBackIn
     * @param {Number} amount The strength of the ease.
     * @static
     * @return {Function}
     **/
    static getBackIn(amount: number): EasingFunction;
    /**
     * @method backIn
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static backIn: EasingFunction;
    /**
     * Configurable "back out" ease.
     * @method getBackOut
     * @param {Number} amount The strength of the ease.
     * @static
     * @return {Function}
     **/
    static getBackOut(amount: number): EasingFunction;
    /**
     * @method backOut
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static backOut: EasingFunction;
    /**
     * Configurable "back in out" ease.
     * @method getBackInOut
     * @param {Number} amount The strength of the ease.
     * @static
     * @return {Function}
     **/
    static getBackInOut(amount: number): EasingFunction;
    /**
     * @method backInOut
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static backInOut: EasingFunction;
    /**
     * @method circIn
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static circIn: EasingFunction;
    /**
     * @method circOut
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static circOut: EasingFunction;
    /**
     * @method circInOut
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static circInOut: EasingFunction;
    /**
     * @method bounceIn
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static bounceIn: EasingFunction;
    /**
     * @method bounceOut
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static bounceOut: EasingFunction;
    /**
     * @method bounceInOut
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static bounceInOut: EasingFunction;
    /**
     * Configurable elastic ease.
     * @method getElasticIn
     * @param {Number} amplitude
     * @param {Number} period
     * @static
     * @return {Function}
     **/
    static getElasticIn(amplitude: number, period: number): EasingFunction;
    /**
     * @method elasticIn
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static elasticIn: EasingFunction;
    /**
     * Configurable elastic ease.
     * @method getElasticOut
     * @param {Number} amplitude
     * @param {Number} period
     * @static
     * @return {Function}
     **/
    static getElasticOut(amplitude: number, period: number): EasingFunction;
    /**
     * @method elasticOut
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static elasticOut: EasingFunction;
    /**
     * Configurable elastic ease.
     * @method getElasticInOut
     * @param {Number} amplitude
     * @param {Number} period
     * @static
     * @return {Function}
     **/
    static getElasticInOut(amplitude: number, period: number): EasingFunction;
    /**
     * @method elasticInOut
     * @param {Number} t
     * @static
     * @return {Number}
     **/
    static elasticInOut: EasingFunction;
}
export default Ease;
//# sourceMappingURL=ease.d.ts.map