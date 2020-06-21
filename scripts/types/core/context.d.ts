export as namespace context;

import {ModalInterface} from "./ui_base";

interface Context {
    state     : any;
    toolstack : any;
    api       : ModalInterface;

    //report(message : string, delayMs : number);

}