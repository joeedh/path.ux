import * as defaults from "jest-config";

export default {
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
  globals  : { INSIDE_JEST_TEST: true },

  verbose               : true,
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  roots                 : ["<rootDir>/tests"],
};
