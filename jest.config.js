import * as defaults from "jest-config";

export default {
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
  verbose               : true,
  extensionsToTreatAsEsm: [".ts", ".tsx"],
};
