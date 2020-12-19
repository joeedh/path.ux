export as namespace context;

import {DataAPI} from '../path-controller/controller_base';

interface Context {
    state     : any;
    toolstack : any;
    api       : DataAPI;

    //report(message : string, delayMs : number);

}