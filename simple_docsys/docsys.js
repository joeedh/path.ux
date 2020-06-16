let marked = require('marked');
let fs = require('fs');
let pathmod = require('path');
let jsdiff = require('diff');
let parse5 = require("parse5");

Array.prototype.remove = function(item) {
  let i = this.indexOf(item);

  if (i < 0) {
    item = typeof item === "symbol" ? item.toString() : "" + item;
    throw new Error("item " + item + " is not in array");
  }

  while (i < this.length) {
    this[i] = this[i+1];
    i++;
  }

  this.length--;
  return this;
}

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

class DocVersion {
  constructor() {
    this.mtime = 0;
    this.relpath = "";
    this.data = "";
    this.isDiff = false;
  }

  copy() {
    let ret = new DocVersion();
    ret.loadJSON(this);
    return ret;
  }

  loadJSON(obj) {
    this.mtime = obj.mtime;
    this.relpath = obj.relpath;
    this.data = obj.data;
    this.isDiff = obj.isDiff;

    return this;
  }
}

function compressPatch(diff, origbuf) {
  diff = JSON.parse(JSON.stringify(diff));

  let data = origbuf;

  let linemap = [0];

  let last = 0;
  for (let i=0; i<data.length; i++) {
    if (data[i] === "\n") {
      let i2 = i+1;
      linemap.push(i2);
      last = i2;
    }
  }

  let start = 0;
  let buf = data;

  for (let h of diff.hunks) {
    let ls = h.lines;
    let i2 = h.oldStart;

    //break;
    for (let i=0; i<ls.length; i++) {
      if (ls[i].startsWith("-")) {
        ls[i] = ls[i].slice(1, ls[i].length)

        let j;
        try {
          j = buf.search(ls[i]);
        } catch (error) {
          //stupid regexpr errors;
          i2++;
          continue;
        }

        if (j >= 0) {
          buf = buf.slice(j, buf.length);
          ls[i] = "^" + (start + j) + ":" + ls[i].length;
          start += j
        }

        i2++;
      } else if (ls[i][0] === " ") {
        let l = ls[i];
        l = l.slice(1, l.length);
        let j = linemap[i2-1];

        ls[i] = `$${j}:${l.length}`;
        i2++;
      }
      //console.log(ls[i])
    }
  }

  return diff;
}

function uncompressPatch(diff, origbuf) {
  diff = JSON.parse(JSON.stringify(diff));
  let data = origbuf;

  for (let h of diff.hunks) {
    let buf = data;
    let ls = h.lines;
    for (let i=0; i<ls.length; i++) {
      let l = ls[i];

      if (l[0] === "^") {
        l = l.slice(1, l.length).split(":")

        let j = parseInt(l[0])
        ls[i] = "-" + buf.slice(j, j+parseInt(l[1]))
        //ls[i] = headVersion.data
      } else if (l[0] === "-") {
      } else if (l[0] === "$") {
        l = l.slice(1, l.length).split(":")
        let j = parseInt(l[0]);
        ls[i] = " " + buf.slice(j, j+parseInt(l[1]))
      }
    }
  }

  return diff;
}

class DocMeta {
  constructor() {
    this.metaVersion = 1;
    this.versions = []
    this.headVersion = new DocVersion();
    this.relpath = "";
  }

  addVersion(doc) {
    let mtime = fs.statSync(doc.path).mtimeMs;
    let version = new DocVersion();

    version.mtime = mtime;
    this.relpath = doc.relpath;

    if (this.versions.length === 0) {
      this.headVersion.data = doc.data;
      this.headVersion.mtime = mtime;
      this.headVersion.relpath = doc.relpath;
      this.headVersion.isDiff = false;

      version = this.headVersion.copy();
      this.versions.push(version);
    } else {
      let buf = this.headVersion.data;
      let start = 0;

      //let diff = jsdiff.diffLines(doc.data, this.headVersion.data);
      //console.log(this);
      let diff = jsdiff.structuredPatch(doc.relpath, doc.relpath, this.headVersion.data, doc.data)

      if (diff.hunks.length == 0) {
        console.warn("File hasn't changed");
        return;
      }

      let cdiff = compressPatch(diff, this.headVersion.data);

      let orig = JSON.stringify(diff, undefined, 2);
      let newd = JSON.stringify(uncompressPatch(cdiff, this.headVersion.data), undefined, 2);

      console.log("DIFF", newd.length, orig.length, newd === orig, "diff");

      if (newd === orig) {
        diff = JSON.stringify(cdiff);
      } else {
        diff = JSON.stringify(diff);
      }

      version.isDiff = true;
      version.data = diff;
      version.relpath = doc.relpath;

      this.headVersion.data = doc.data;
      this.headVersion.relpath = doc.relpath;
      this.headVersion.mtime = mtime;

      this.versions.push(version);
    }

    console.log("mtime", mtime);
  }

  loadJSON(obj) {
    this.metaVersion = obj.metaVersion;
    this.versions = obj.versions;

    for (let i=0; i<this.versions.length; i++) {
      this.versions[i] = new DocVersion().loadJSON(this.versions[i]);
    }

    this.headVersion = new DocVersion().loadJSON(this.headVersion);

    return this;
  }

  toJSON() {
    return {
      metaVersion : this.metaVersion,
      versions : this.versions,
      relpath  : this.relpath,
      headVersion : this.headVersion
    }
  }
}

class DocsConfig {
  constructor(args) {
    this.basePath = args.basePath || "./"
    this.outPath = args.outPath || "./doc_build"
    this.cssPath = args.cssPath || this.basePath + "/style.css"
    this.docs = [];
  }

  loadCSS() {
    this.style = fs.readFileSync(this.cssPath, "utf8");
  }

  initCache() {
    this.cachePath = this.basePath + "/.cache";
    fs.mkdirSync(this.cachePath, {recursive : true});
  }

  getDocMetaPath(doc) {
    let key = doc.relpath;
    key = key.replace(/[ \t\/\\\.]/g, "$") + ".json"
    key = this.cachePath + "/" + key

    console.log("key", key);
    return key;
  }

  extractPastedImages(data, doc) {
    let parse5 = require("parse5");

    let buf = "<!doctype html>" + data;

    let node = parse5.parse(buf);
    let found = 0;
    let visit = (n) => {
      if (n.nodeName === "img") {
        for (let attr of n.attrs) {
          if (attr["name"] == "src") {
            let val = "" + attr["value"];

            if (val.startsWith("data:")) {
              let ext = val.slice("data:image/".length, val.length);
              ext = ext.slice(0, ext.search(";"));
              ext = "." + ext.trim();

              let i = val.search(";");
              val = val.slice(i+1, val.length);
              if (val.startsWith("base64")) {
                console.log("Found base64 data url", ext);
                val = val.slice("base64,".length, val.length);
                let buf = Buffer.from(val, 'base64');
                let path = this.getNewAssetPath(doc, ext);


                let relpath = "./" + pathmod.relative(this.basePath, path).replace(/\\/g, "/");

                try {
                  fs.writeFileSync(path, buf);
                } catch (error) {
                  console.warn("failed to write image data");
                  continue;
                }

                console.log("Found an image");
                attr["value"] = relpath;
                found = 1;
              }
            }
          }
        }
      }

      if (!n.childNodes) {
        return;
      }
      for (let c of n.childNodes) {
        visit(c);
      }
    }

    visit(node);

    let body = undefined;

    let find_body = (n) => {
      if (n.nodeName === "body") {
        body = n;
      }

      if (!n.childNodes) return;

      for (let c of n.childNodes) {
        find_body(c);
      }
    }
    find_body(node);
    node = body;

    if (found) {
      data = parse5.serialize(node);
    }

    return {
      found, data
    };
  }

  getNewAssetPath(doc, extension, _build_path_out) {
    if (doc === undefined || extension === undefined) {
      throw new Error("arguments cannot be undefined");
    }

    let path = pathmod.dirname(doc.path) + "/assets/";
    let base = pathmod.basename(doc.relpath);

    if (base.toLowerCase().endsWith(".html")) base = base.slice(0, base.length-5);
    if (base.toLowerCase().endsWith(".md")) base = base.slice(0, base.length-3);

    base += "_image_";
    let i = 0;
    let retpath;

    while (i < 100000) {
      let path2 = path + base + i + extension;
      console.log(path2);

      if (!fs.existsSync(path2)) {
        retpath = path2;
        break;
      }

      i++;
    }

    if (retpath === undefined) {
      throw new Error("could not find path; permissions problem?");
    }

    let dir = pathmod.dirname(pathmod.resolve(retpath));
    fs.mkdirSync(dir, {recursive : true});

    if (_build_path_out) {
      let f = pathmod.basename(retpath);
      let f2 = normpath(this.outPath + "/" + pathmod.dirname(doc.relpath) + "/assets/" + f);
      console.log("outpath", f2);
      _build_path_out[0] = f2;
    }

    return retpath;
  }

  uploadImage(doc_relpath, filename, imagebuf) {
    let doc = this.getDoc(doc_relpath);
    if (!doc) {
      throw new Error("invalid document at path " + doc_relpath);
    }

    let outpath = [undefined]
    let path = this.getNewAssetPath(doc, filename, outpath);

    let buf = Buffer.from(imagebuf);
    fs.writeFileSync(path, buf);

    if (outpath[0]) {
      fs.writeFileSync(outpath[0], buf);
    }

    path = "./" + pathmod.relative(this.basePath, path).replace(/\\/g, "/");
    return path;
  }
  /**
   * if document was changed during updating (e.g. dataurl images were extracted)
   * the new document is returned as a string
   * */
  updateDoc(relpath, data) {
    let found = 0;

    if (!data || typeof data !== "string") {
      throw new Error("document data was corrupted");
    }

    relpath = relpath.trim();
    if (!relpath.startsWith("/")) {
      relpath = "/" + relpath;
    }

    let old = data;

    for (let doc of this.docs) {
      if (doc.relpath === relpath) {
        found = 1;

        data = this.extractPastedImages(data, doc).data;

        if (!doc.meta) {
          this.getDocMeta(doc);
        }

        doc.data = data;
        doc.meta.addVersion(doc);
        this.saveDocMeta(doc);

        fs.writeFileSync(doc.path, doc.data);

        this.gen.readDocument(doc);
        this.gen.transformDoc(doc);
        this.gen.writeDoc(doc);

        break;
      }
    }

    if (!found) {
      throw new Error("can't find document '" + relpath + "'");
    }

    if (old !== data) {
      return data;
    }
  }

  hasDoc(relpath) {
    for (let doc of this.docs) {
      if (normpath(doc.relpath) === normpath(relpath)) {
        return true;
      }
    }

    return false;
  }

  getDoc(relpath) {
    for (let doc of this.docs) {
      if (normpath(doc.relpath) === normpath(relpath)) {
        return doc;
      }
    }
  }

  newDoc(relpath, data) {
    let dir = fs.mkdirSync(pathmod.dirname(relpath));

    let doc = new Document()
    doc.path = normpath(this.basePath + "/" + relpath);
    this.docs.push(doc);

    fs.writeFileSync(this.basePath + "/" + relpath, data);
    this.gen.readDocument(doc);

    return doc;
  }

  getDocMeta(doc) {
    let path = this.getDocMetaPath(doc);
    let ret;

    if (!fs.existsSync(path)) {
      if (!doc.data) {
        console.warn("Had to load document data for ", path);
        doc.data = fs.readFileSync(doc.path, "utf8");
        if (doc.data === undefined || doc.data === null) {
          throw new Error("couldn't load document " + doc.relpath);
        }
      }
      ret = new DocMeta();
      ret.relpath = doc.relpath;
      ret.addVersion(doc);

      doc.meta = ret;

      //fs.writeFileSync(path, JSON.stringify(doc.meta, undefined, 2))
      return ret;
    } else {
      let buf = fs.readFileSync(path, "utf8");
      doc.meta = new DocMeta().loadJSON(JSON.parse(buf));
      return doc.meta;
    }
  }

  saveDocMeta(doc) {
    if (!doc.meta) {
      throw new Error("You haven't loaded the document metadata yet");
    }

    if (doc instanceof DocMeta) {
      throw new Error("Must pass a Document instance to saveDocMeta, not it's .meta property");
    }

    let path = this.getDocMetaPath(doc);
    fs.writeFileSync(path, JSON.stringify(doc.meta, undefined, 2))
    doc.meta = undefined;
  }

  run() {
    this.initCache();
    let gen = this.gen;
    gen.read();

    for (let doc of this.docs) {
      let meta = this.getDocMeta(doc);
      this.saveDocMeta(doc);
    }

    gen.transform();
    gen.write();
  }
}

class Document {
  constructor(name, path) {
    this.name = name;
    this.path = path;
    this.meta = undefined;
    this.relpath = "";
    this.kind = "doc";
    this.html = undefined;
    this.data = undefined;
    this.meta = undefined;
  }
}

class DocGenerator {
  constructor(config) {
    this.config = config;
  }

  readDocument(doc) {
    let first = true;
    let buf = fs.readFileSync(doc.path, "utf8");

    let ret = this.config.extractPastedImages(buf, doc);
    if (ret.found) {
      buf = ret.data;

      console.log("found base64 image tags; extracting. . .");
      doc.data = buf;

      this.config.getDocMeta(doc);
      doc.meta.addVersion(doc);
      this.config.saveDocMeta(doc);
    }

    doc.data = buf;

    if (doc.path.toLowerCase().endsWith(".md")) {
      let renderer = {
        heading: (text, level) => {
          let id = text.trim().replace(/[ \t_]/g, "-")

          if (first) {
            first = false;

            doc.title = text;
            doc.id = id;
          }
          return `<h${level} id="${id}">${text}</h${level}>`
        }
      }

      marked.use({renderer});

      let mark = marked(buf, {
        pedantic: false,
        gfm: true,
        breaks: false,
        sanitize: false,
        smartLists: true,
        smartypants: false,
        xhtml: false,
        headerIds: true,
        footer: ""
      });

      doc.html = mark;
    } else if (doc.path.toLowerCase().endsWith(".html")) {
      doc.html = this.stripContentsDiv(doc, buf); //also sets document title from first <h1> tag
    }

    return doc;
  }

  read() {
    for (let doc of this.config.docs) {
      this.readDocument(doc);
    }
  }
  
  getTitle(doc) {
    if (doc.title) {
      return doc.title;
    }
    
    let node = parse5.parse(fs.readFileSync(doc.path, "utf8"));
    let title = this.findTitle(node);
    
    if (title) {
      doc.title = title;
    }
    
    return doc.title;
  }
  
  findTitle(node) {
    let found = 0;
    let ret = undefined;

    let tvisit = (n)=> {
      if (n.nodeName === "#text") {
        return n.value;
      }

      if (!n.childNodes) return;

      let ret = "";

      for (let c of n.childNodes) {
        ret += tvisit(c);
      }

      return ret;
    }
    let visit = (n) => {
      if (!found && n.nodeName === "h1") {
        found = 1;

        ret = tvisit(n).trim();
        if (ret.length === 0) ret = undefined;
      }

      if (!n.childNodes) return;

      for (let c of n.childNodes) {
        visit(c);
      }
    }

    visit(node);
    return ret;
  }

  stripContentsDiv(doc, buf) {
    let node;

    buf = "<!doctype html>" +  buf;
    try {
      node = parse5.parse(buf, {});
    } catch (error) {
      console.log("malformed html data");
      return buf.trim();
    }

    let title = this.findTitle(node);
    if (title) {
      doc.title = title;
    }

    function get(node, type) {
      for (let c of node.childNodes) {
        if (c.nodeName === type) {
          return c;
        }
      }
    }

    node = get(node, "html")
    node = get(node, "body")
    let nodes = [];
    let found = false;

    outer: for (let n of node.childNodes) {
      if (n.nodeName !== "div") {
        continue;
      }
      for (let attr of n.attrs) {
        if (attr.name === "class" && attr.value === "contents") {
          node.parentNode.childNodes.remove(node);
          nodes = node.childNodes;
          found = true;
          break outer;
        }
      }
    }

    if (!found) {
      return buf;
    } else {
      let ret = "";
      for (let n of nodes) {
        ret += parse5.serialize(n);
      }

      return ret;
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
      } else if (base2 === base) {
        let key = pathmod.dirname(doc2.path);
        if (!(key in children) || doc2.path.toLowerCase().endsWith("index.md")
            || doc2.path.toLowerCase().endsWith("index.html")
        ) {
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
      this.getTitle(ch);
      
      let url = this.getHref(doc, ch);
      //console.log(doc.path, url, ch.path)
      s += `<a href="${url}" class="nav-item">${ch.title}</a>\n`;
    }

    for (let k in children) {
      let ch = children[k];
      
      this.getTitle(ch);
      
      let url = this.getHref(doc, ch);
      //console.log(doc.path, url, ch.path)
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

  writeAssets(doc) {
    let dirpath = normpath(pathmod.dirname(doc.path) + "/assets");

    if (!fs.existsSync(dirpath)) {
      return;
    }

    walkDir(dirpath, (root, dir, files) => {
      for (let f of files) {
        let f2 = normpath(this.config.outPath + "/" + pathmod.dirname(doc.relpath) + "/assets/" + f);
        f = normpath(root + "/" + f);

        let dirpath2 = pathmod.dirname(f2);
        fs.mkdirSync(dirpath2, {recursive : true});

        let update = !fs.existsSync(f2);
        update = update || fs.statSync(f2).mtime < fs.statSync(f).mtime;

        if (update) {
          console.log("writing ", f2);

          let buf = fs.readFileSync(f);
          fs.writeFileSync(f2, buf);
        }
      }
    });
  }

  writeDoc(doc) {
    //console.log(doc.html)

    this.writeAssets(doc);

    let path = this.config.outPath + doc.relpath;
    path = path.trim();
    console.log("writing", path);

    if (path.toLowerCase().endsWith(".md")) {
      path = path.slice(0, path.length - 3) + ".html";
    }

    let dir = pathmod.dirname(path);
    fs.mkdirSync(dir, {
      recursive: true
    });
    fs.writeFileSync(path, doc.html);
  }

  write() {
    for (let doc of this.config.docs) {
      this.writeDoc(doc);
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
  let cwd = normpath(process.cwd())
  let base = pathmod.dirname(normpath(path))
  base = "./" + pathmod.relative(cwd, base).replace(/\\/g, "/");

  let rebasePath = (p) => {
    if (p.startsWith("./")) {
      p = p.slice(2, p.length);
    }
    return base + "/" + p;
  }

  let buf = fs.readFileSync(path, "utf8");
  var config = undefined;

  buf = "config = " + buf;

  eval(buf);

  console.log(config);
  config = new DocsConfig(config);

  config.basePath = normpath(rebasePath(config.basePath));
  config.outPath = normpath(rebasePath(config.outPath));
  config.cssPath = normpath(rebasePath(config.cssPath));
  config.gen = new DocGenerator(config);

  config.initCache();

  console.log(config.basePath);
  console.log(config.outPath, config.cssPath)
  config.loadCSS();

  path = pathmod.resolve(config.basePath + "/../")
  console.log(path);
  //console.log(pathmod, pathmod.relative(config.basePath, path))
  console.log(config.basePath)

  walkDir(config.basePath, (root, dir, files) => {
    root = config.basePath + "/" + root
    for (let f of  files) {
      if (f.endsWith(".md") || f.endsWith(".html")) {
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

