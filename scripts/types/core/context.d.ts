import {Screen} from "../screen/FrameManager";

export as namespace context;

import {DataAPI} from '../path-controller/controller_base';

interface Context {
    state     : any;
    toolstack : any;
    api       : DataAPI;
    screen    : Screen

    //report(message : string, delayMs : number);

}