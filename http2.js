const PORT = 5002;
const INDEX = "index.html";
const SERVER_ROOT = ".";

const http2 = require('http2');
const fs = require('fs');
const pathmod = require('path');

const rpc = require('./rpc.js');

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


function walkDir(path, cb) {
  while (path.endsWith("/")) {
    path = path.slice(0, path.length-1).trim();
  }
  let dir = fs.opendirSync(path);

  let files = [];
  let dirs = [];

  for (let entry=dir.readSync(); entry; entry=dir.readSync()) {
    if (entry.isDirectory()) {
      dirs.push(entry.name);
    } else {
      files.push(entry.name);
    }
  }

  cb(path, dirs, files);
  for (let dir of dirs) {
    let path2 = path + "/" + dir;
    walkDir(path2, cb);
  }

  dir.closeSync();
}

let scriptFilesCache = "scriptpaths.cache";
function saveScriptFiles() {
  let list = [];
  for (let item of scriptfiles) {
    list.push(item);
  }

  list = JSON.stringify(list, undefined, 2);
  fs.writeFileSync(scriptFilesCache, list, "utf8");
}

let scriptfiles = new Set();

if (fs.existsSync(scriptFilesCache)) {
  let buf = fs.readFileSync(scriptFilesCache, "utf8");
  let json = JSON.parse(buf);
  scriptfiles = new Set(json);
}

const server = http2.createSecureServer({
  key: fs.readFileSync('localhost-privkey.pem'),
  cert: fs.readFileSync('localhost-cert.pem')
});
server.on('error', (err) => console.error(err));

let mimemap = {
  ".js" : "application/javascript",
  ".json" : "application/json",
  ".html" : "text/html",
  ".svg" : "image/svg",
  ".png" : "image/png",
  ".jpg" : "image/jpeg",
  ".jpeg" : "image/jpeg",
  ".txt" : "text/plain",
  ".css" : "text/css",
  ".glsl" : "text/glsl",
  ".xml"  : "text/xml"
};

let textmap = new Set([
  "application/javascript",
  "application/json",
  "text/html",
  "text/plain",
  "text/css",
  "text/glsl",
  "text/xml"
]);

for (let k in mimemap) {
  let re = k.replace(/\./g, "\\.");
  re = `.+${re}$`;

  mimemap[k] = {
    re   : new RegExp(re),
    type : mimemap[k]
  };
}

function getMime(path) {
  path = path.toLowerCase();

  for (let k in mimemap) {
    let m = mimemap[k];
    if (m.re.exec(path)) {
      return m.type;
    }
  }

  return "application/x-octet-stream";
}

server.on('stream', (stream, headers) => {
  function sendError(code, msg) {
    stream.respond({
      'content-type': 'text/html',
      ':status': code
    });
    stream.end(`<h1>Error ${code}</h1>${msg}`);
  }

  //console.log(stream);
  //console.log("headers", headers);
  let path = headers[":path"].trim();

  if (path === "/" || path === "") {
    path = INDEX;
  }

  let isIndex = path === INDEX;

  if (!isIndex && (path.endsWith(".js"))) {//} || path.endsWith(".bin"))) {
    let path2 = path;
    while (path2.startsWith("/")) {
      path2 = path2.slice(1, path2.length).trim();
      //console.log("yay");
    }

    let save = scriptfiles.has(path2);
    scriptfiles.add(path2);

    if (!save) {
      saveScriptFiles();
    }
  }

  console.log(termColor(headers[":method"], "green") + " " + path);

  while (path.startsWith("/")) {
    path = path.slice(1, path.length).trim();
  }

  if (path.startsWith("api/")) {
    path = path.slice(4, path.length);

    let api_finish = (method, data) => {
      let json;

      console.log(termColor("API", "blue"), method, data);

      try {
        json = JSON.parse(unescape(data));
      } catch (error) {
        sendError(404, escape(data));
        return;
      }

      if (!Array.isArray(json)) {
        json = [json];
      }

      //console.log(json);
      rpc.handle(method, json).then((result) => {
        stream.respond({
          'content-type': 'application/json',
          ':status': 200
        });
        stream.end(result);
      }).catch((error) => {
        console.log(error);
        sendError(501, "" + error);
      })
    }


    if (headers[":method"].toLowerCase() === "get") {
      path = path.split("?");
      api_finish(path[0], path[1]);
    } else {
      stream.setEncoding("utf8")
      let data = "";
      stream.on('data', (chunk) => {
        data += chunk;
        //console.log("got data", chunk);
      });

      stream.on('end', () => {
        console.log("end");
        api_finish(path, data.trim());
      });
    }

    return;
  }

  path = pathmod.resolve(SERVER_ROOT + "/" + path);
  let root = pathmod.resolve(SERVER_ROOT);

  if (!path.startsWith(root) || !fs.existsSync(path)) {
    sendError(404, "Bad path");
    return;
  }

  let mime = getMime(path);
  let encoding = textmap.has(mime) ? "utf8" : undefined;
  let buf = fs.readFileSync(path, encoding);

  stream.on('error', (e) => {
    console.log(e);
  });

  if (path.endsWith(".html") && stream.pushAllowed) {
    console.log("push stream!");

    let max = 16;
    let i = 0;
    let visit = new Set();

    scriptfiles.forEach((f) => {
      if (visit.has(f)) {
        return;
      }

      if (i++ > max) {
        return;
      }

      visit.add(f);
      /*
      let pushcb = (err, pushStream, headers) => {
        pushStream.on("error", (e) => {
          pushStream.end();
          console.log(e)
        });

        pushStream.respond({'content-type': getMime(f)});
        let encoding = textmap.has(f) ? "utf8" : undefined;
        pushStream.end(fs.readFileSync(f, encoding));
      };//*/

      let pushcb = (err, pushStream, headers) => {
        pushStream.on("error", (e) => {
          pushStream.end();
          /*
          try {
            stream.pushStream({':path': "/" + f}, pushcb);
          } catch (error) {
            console.log("push disabled");
          }//*/
          //console.log(e)
        });

        let encoding = textmap.has(getMime(f)) ? "utf8" : undefined;
        if (!fs.existsSync(f)) {
          console.log("EVIL!", f);

          pushStream.respond({'content-type': "text/html"});
          pushStream.end("<html><head><title>404</title></head><body>404"+f+"<body></html>");
          return;
        }

        pushStream.respond({'content-type': getMime(f)});
        pushStream.end(fs.readFileSync(f, encoding));

        //setTimeout(() => {
          f = undefined;

          for (let f2 of scriptfiles) {
            if (!visit.has(f2)) {
              visit.add(f2);
              f = f2;
              break;
            }
          }

          if (!f) {
            return;
          }

          //console.log("::", f)
          try {
            stream.pushStream({':path': "/" + f}, pushcb);
          } catch (error) {
            console.log("push stream failed", f);
          }
        //}, 0.01);

        //console.log(headers);
      };

      stream.pushStream({':path': "/" + f}, pushcb);
    });
  }

  // stream is a Duplex
  stream.respond({
    'content-type': mime,
    ':status': 200
  });
  stream.end(buf);
});

console.log("Listening on port " + PORT);
server.listen(PORT);

