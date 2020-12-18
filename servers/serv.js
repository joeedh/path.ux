const PORT = 5002;
const HOST = "localhost"

import * as rpc from './rpc.js';

const debug_prevent_default = false;
const debug_disable_all_listeners = false;
const debug_listeners = false; //parse code with babel and activates functionaltiy in scripts/util/polyfill.js

import fs from 'fs';
import http from 'http';
import path from 'path';

const INDEX = "servers/index.html";
const BASEDIR = path.resolve(process.cwd() + "/../");

let mimemap = {
  ".js" : "application/javascript",
  ".json" : "text/json",
  ".html" : "text/html",
  ".png" : "image/png",
  ".jpg" : "image/jpeg",
  ".css" : "text/css"
};

let textmap = new Set([
  "application/javascript",
  "text/json",
  "text/html",
  "text/plain",
  "text/css",
  "text/glsl",
  "text/xml"
]);

let getMime = (p) => {
  p = p.toLowerCase().trim();
  
  for (let k in mimemap) {
    if (p.endsWith(k)) {
      return mimemap[k];
    }
  }
  
  return "text/plain";
}

let colormap = {
  black   : 30,
  red     : 31,
  green   : 32,
  yellow  : 33,
  blue    : 34,
  magenta : 35,
  cyan    : 36,
  white   : 37,
  reset   : 0
};

function termColor(s, color = colormap.reset) {
  if (typeof color === "string") {
    color = colormap[color] || colormap.reset;
  }

  return `\u001b[${color}m${s}\u001b[0m`;
}

function disablePreventDefault(buf) {
  let lines = buf.split("\n");
  let out = "";

  for (let i=0; i<lines.length; i++) {
    let l = lines[i];

    if (l.search("preventDefault") >= 0 && l.search("{") < 0) {
      l = "//" + l;
    }
    if (l.search("stopPropagation") >= 0 && l.search("{") < 0) {
      l = "//" + l;
    }

    lines[i] = l;
    out += l + "\n";
  }

  return out;
}

export class ServerResponse extends http.ServerResponse {
  _addHeaders() {
    this.setHeader("X-Content-Type-Options", "nosniff");
    this.setHeader("Access-Control-Allow-Origin", "*");
  }

  sendError(code, message) {
    let buf = `<!doctype html>
<html>
<head><title>404</title></head>
<body><div>${message}<div><body>
</html>
`;

    this.statusCode = code;
    this.setHeader('Host', HOST);
    this.setHeader('Content-Type', 'text/html');
    this.setHeader('Content-Length', buf.length);
    this._addHeaders();
    
    this.writeHead(code)
    this.end(buf);
  }
}

const serv = http.createServer({
  ServerResponse
}, (req, res) => {
  let p = req.url.trim();
  
  if (!p.startsWith("/")) {
    p = "/" + p
  }

  if (p.startsWith("/api/")) {
    let path = p.slice(5, p.length);
    path = path.split("?");

    let method = path[0];
    let json;

    console.log(termColor("API", "blue"), path);

    try {
      json = JSON.parse(unescape(path[1]));
    } catch (error) {
      sendError(404, escape(path[1]));
      return;
    }

    if (!Array.isArray(json)) {
      json = [json];
    }

    console.log(json);
    rpc.handle(method, json).then((result) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', "application/json");
        res.setHeader('Content-Length', result.length);
        res._addHeaders();
        res.end(result);
    }).catch((error) => {
      console.log(error);
      res.sendError(501, ""+error);
    })

    return;
  }

  console.log(termColor(req.method, "green"), p);
  
  if (p === "/") {
    p += INDEX
  }
  
  let relpath = p;
  
  p = path.normalize(BASEDIR + p);
  if (p.search(/\.\./) >= 0 || !p.startsWith(BASEDIR)) {
    //normalize failed
    return res.sendError(500, "malformed path");
  }
  
  let stt;
  try {
    stt = fs.statSync(p);
  } catch(error) {
    return res.sendError(404, "bad path");
  }
  
  if (stt === undefined || stt.isDirectory() || !stt.isFile()) {
    console.log("access error for", p);
    return res.sendError(404, "bad path");
  }
  
  
  let mime = getMime(p);
  
  let encoding = textmap.has(mime) ? "utf8" : undefined;

  let buf = fs.readFileSync(p, encoding);

  if (mime === "application/javascript") {
    if (debug_prevent_default) {
      buf = disablePreventDefault(buf);
    }

    if (debug_disable_all_listeners) {
      buf = "window._disable_all_listeners = true;\n" + buf;
    }

    if (debug_listeners) {
      buf = "window._debug_event_listeners = true;\n" + buf;
      let et = require("./eventtrace.js");
      buf = et.parse(buf, relpath, HOST, PORT);
    }  
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', mime);
  res._addHeaders();
  res.end(buf);
});

serv.listen(PORT, HOST, () => {
  console.log("Server listening on", HOST + ":" + PORT); 
});










