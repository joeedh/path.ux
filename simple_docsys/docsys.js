let marked = require('marked');
let fs = require('fs');
let pathmod = require('path');

function walkDir(path, cb) {
  while (path.endsWith("/")) {
    path = path.slice(0, path.length-1).trim();
  }
  let dir = fs.readdirSync(path);

  let files = [];
  let dirs = [];


  for (let entry of dir) {
    if (fs.statSync(path + "/" + entry).isDirectory()) {
      dirs.push(entry);
    } else {
      files.push(entry);
    }
  }

  cb(path, dirs, files);
  for (let dir of dirs) {
    let path2 = path + "/" + dir;
    walkDir(path2, cb);
  }
}

String.prototype.count = function (s) {
  let count = 0;
  let buf = this;

  while (buf.length > 0) {
    let i = buf.search(s);
    if (i < 0) {
      break;
    }

    buf = buf.slice(i+1, buf.length);
    count++;
  }

  return count;
}

function relative(a1, b1) {
  return pathmod.relative(pathmod.dirname(a1), b1).replace(/\\/g, "/");
  let a = a1, b = b1;

  let i = 1;
  while (i <= a.length && b.startsWith(a.slice(0, i+1))) {
    i++;
  }

  let pref = "";

  a = a.slice(i, a.length);
  b = b.slice(i, b.length);

  let s = "";

  for (let i=0; i<a.count("/"); i++) {
    s += "../";
  }

  s = pref + s + b

  return pref + s + b;
}

class DocsConfig {
  constructor(args) {
    this.basePath = args.basePath || ""
    this.outPath = args.outPath || "./doc_build"
    this.cssPath = args.cssPath || "./style.css"
    this.docs = [];
  }

  loadCSS() {
    this.style = fs.readFileSync(this.cssPath, "utf8");
  }

  run() {
    let gen = new DocGenerator(this);

    gen.read();
    gen.transform();
    gen.write();
  }
}

class Document {
  constructor(name, path) {
    this.name = name;
    this.path = path;
    this.relpath = "";
    this.kind = "doc";
  }
}

class DocGenerator {
  constructor(config) {
    this.config = config;
  }

  read() {
    for (let doc of this.config.docs) {
      let first = true;

      let renderer = {
        heading : (text, level) => {
          let id = text.trim().replace(/[ \t_]/g, "-")

          if (first) {
            first = false;

            doc.title = text;
            doc.id = id;
          }
          return `<h${level} id="${id}">${text}</h${level}>`
        }
      }

      marked.use({ renderer });

      let buf = fs.readFileSync(doc.path, "utf8");
      let mark = marked(buf, {
        pedantic: false,
        gfm: true,
        breaks: false,
        sanitize: false,
        smartLists: true,
        smartypants: false,
        xhtml: false,
        headerIds : true,
        footer : ""
      });

      doc.html = mark;
    }
  }

  transform() {
    this.config.docs.sort((a, b) => {
      return (a.path < b.path)*2.0 - 1.0;
    });

    for (let doc of this.config.docs) {
      this.transformDoc(doc);
    }
  }

  calcStructure(doc) {
    let path = doc.path;

    let base = pathmod.dirname(path);
    let siblings = [];
    let children = {};

    for (let doc2 of this.config.docs) {
      if (doc === doc2) {
        continue;
      }
      let base2 = pathmod.dirname(pathmod.dirname(doc2.path));

      if (doc2 !== doc && pathmod.dirname(doc2.path) === base) {
        siblings.push(doc2);
      } else if (base2 == base) {
        let key = pathmod.dirname(doc2.path);
        if (!(key in children) || doc2.path.toLowerCase().endsWith("index.md")) {
          children[key] = doc2;
        }
      }
    }

    return {
      siblings, children
    };
  }

  getHref(doc1, doc2) {
    let f = relative(doc1.relpath, doc2.relpath).trim();

    if (f.toLowerCase().endsWith(".md")) {
      f = f.slice(0, f.length - 3) + ".html";
    }
    return f;
  }

  calcNav(doc) {
    let {siblings, children} = this.calcStructure(doc);

    siblings = [doc].concat(siblings);
    siblings.sort((a, b) => {
      return (a.relpath > b.relpath)*2.0 - 1.0;
    })
    //children = [doc].concat(children)
    let s = ``;

    for (let ch of siblings) {
      let url = this.getHref(doc, ch);
      console.log(doc.path, url, ch.path)
      s += `<a href="${url}" class="nav-item">${ch.title}</a>\n`;
    }

    for (let k in children) {
      let ch = children[k];
      let url = this.getHref(doc, ch);
      console.log(doc.path, url, ch.path)
      s += `<div class="nav-folder"><a href="${url}" class="nav-item">${ch.title}</a></div>\n`;
    }
    return s;
  }

  transformDoc(doc) {
    let nav = this.calcNav(doc);
    let cssurl = relative(doc.path, this.config.cssPath);

    let s = `<!doctype html>
<html>
<head>
<title>${doc.title}</title>
<link rel="stylesheet" href="${cssurl}">
<style>

</style>
</head>
<body>
<div class="page">
<div class="navbar">
${nav}
</div>
<div class="contents">
${doc.html}
</div>
</div>
</body>
</html>
`;
    doc.html = s;
  }


  write() {
    for (let doc of this.config.docs) {
      console.log(doc.html)
      let path = this.config.outPath + doc.relpath;
      path = path.trim();

      if (path.toLowerCase().endsWith(".md")) {
        path = path.slice(0, path.length-3) + ".html";
      }

      let dir = pathmod.dirname(path);
      fs.mkdirSync(dir, {
        recursive : true
      });
      fs.writeFileSync(path, doc.html);
    }

    if (!this.config.style) {
      this.config.readCSS()
    }


    fs.writeFileSync(this.config.outPath + "/style.css", this.config.style);
  }
}

let normpath = (p) => {
  return pathmod.resolve(p).replace(/\\/g, "/").trim();
}

let readConfig = exports.readConfig = function(path) {
  let buf = fs.readFileSync(path, "utf8");
  var config = undefined;

  buf = "config = " + buf;

  eval(buf);

  config = new DocsConfig(config);

  config.basePath = normpath(config.basePath);
  config.outPath = normpath(config.outPath);

  config.loadCSS();

  path = pathmod.resolve(config.basePath + "/../")
  console.log(path);
  //console.log(pathmod, pathmod.relative(config.basePath, path))
  console.log(config.basePath)

  walkDir(config.basePath, (root, dir, files) => {
    root = config.basePath + "/" + root
    for (let f of  files) {
      if (f.endsWith(".md")) {
        f = normpath(root + "/" + f);
        f = pathmod.relative(config.basePath, f).replace(/\\/g, "/").trim();

        d = new Document();
        d.path = normpath(f);
        d.relpath = d.path.slice(config.basePath.length, d.path.length);
        console.log(d.relpath)
        config.docs.push(d);
      }
    }
  });

  return config;
}

let config = readConfig("docs.config.js");
config.run();
