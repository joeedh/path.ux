let marked = require("marked")
let fs = require("fs");
let pathmod = require("path");
const EPlugin = require('esdoc/out/src/Plugin/Plugin').default;

let manualBasePath = "./";

function* listdir(path) {
  let d = fs.opendirSync(path, {});

  for (let item=d.readSync(); item; item=d.readSync()) {
    yield item;
  }
  d.close();
}

function doManual(p) {
  console.log("Generating manual paths... ");
  let opt = p.option;

  if (!p.option) {
    return;
  }

  let base = manualBasePath;
  for (let item of listdir(base)) {
    if (item.isDirectory()) {
      continue;
    }

    path = base + "/" + item.name;

    let extok = item.name.toLowerCase().endsWith(".md");
    extok = extok || item.name.toLowerCase().endsWith(".html");

    if (!extok) {
      continue;
    }
    if (p.option.files.indexOf(path) >= 0) {
      continue;
    }
    p.option.files.push(path);
  }

  console.log(p.option.files);
}


class Plugin {
  onHandleDocs(ev) {
    if (this.option && this.option.manualBasePath) {
      manualBasePath = this.option.manualBasePath;
    }

    function test(path) {
      for (let p of listdir(manualBasePath)) {
        if (p.name.trim() === path) {
          return path;
        }
      }
      if (fs.existsSync(path)) {
        ///return path;
      }

      return undefined;
    }

    let re = /\@[a-zA-Z_$]+[a-zA-Z0-9_$]*/;

    function handleRefLink(href, title, text) {
      let matches = [];

      let norm = (f) => {
        return f.replace(/\\/g, "/").trim();
      }

      if (href.startsWith("@")) {
        href = norm(href.slice(1, href.length));

        console.log("=====Found tag:", href);

        for (let doc of ev.data.docs) {
          let w = 0;

          if (norm(doc.longname).endsWith(href)) {
            let longname = norm(doc.longname);
            let l = longname.length - href.length;
            let s = longname.slice(0, l);

            //console.log("   ------>", s);

            if (s.endsWith(".js") || s.endsWith("~") || s.endsWith("#")) {
              matches.push([doc, norm(doc.longname), w]);
            }
            //console.log("->>>>>>.", doc.longname);
          }

          if (norm(doc.name) === href) {
            matches.push([doc, norm(doc.name)]);
          }
        }
        //console.log("----");
      }

      //console.log(matches.length);
      let doc;
      let max = -1e17;
      let docpriority = undefined;

      let priority = {
        'class'    : 0,
        'function' : 1,
        'method'   : 2,
        'variable' : 3
      };

      for (let r of matches) {
        let doc2 = r[0], key = r[1];

        console.log(doc2);

        let p1 = doc2.kind in priority ? priority[doc2.kind] : 5;

        let better = doc === undefined || key.length+r[2] > max;
        better = better || p1 < docpriority;

        if (better) {
          doc = doc2;
          docpriority = p1;
          max = key.length;
        }
      }

      console.log("=======Match doc:");
      console.log(doc);

      if (doc) {
        let url = doc.longname.replace(/\.js/, ".js.html")
        let type = doc.kind;


        url = type + "/" + url;
        console.log(doc)

        let path;

        if (doc.memberof) {
          if (doc.kind === "class") {
            path = "class/" + doc.longname + ".html";
          } else {
            path = doc.kind + "/index.html#";

            if (doc.static && doc.kind !== "class") {
              path += "static-" + doc.kind + "-" + doc.name;
            } else {
              path += doc.name;
            }
          }
        } else {
          path = doc.longname;
        }

        if (path) {
          return {
            href  : path,
            title : title,
            text  : text
          }
        }
      }
    }

    marked.Renderer.prototype.link = function (href, title, text) {
      href = href.trim();

      console.log(href);

      let is_href = /https?:\/\//;
      is_href = href.trim().toLowerCase().search(is_href) == 0.0;

      if (!is_href && !href.startsWith("@")) {
        let href2 = href.trim();

        href2 = href2.trim();
        if (href2.startsWith("./")) {
          href2 = href2.slice(2, href2.length);
        }

        while (href2.startsWith("/")) {
          href2 = href2.slice(1, href2.length).trim();
        }

        href = href2;

        if (href2.toLowerCase().endsWith(".md")) {
          href2 = href2.slice(0, href2.length - 3);
        }

        if (test(href2 + ".md") || test(href2 + ".Md") || test(href2 + ".mD") || test(href2 + ".MD")) {
          console.log("found manual page");
          href2 += ".html";

          if (href2.search("manual") < 0) {
            href = href2;
          } else {
            href = href2;
          }
        }
      }
      console.log(href, title, text, is_href);

      let hr = handleRefLink(href, title, text);
      if (hr) {
        href = "../" + hr.href;
        title = hr.title;
        text = hr.text;
      }

      if (this.options.sanitize) {
        try {
          var prot = decodeURIComponent(unescape(href))
            .replace(/[^\w:]/g, '')
            .toLowerCase();
        } catch (e) {
          return text;
        }
        if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0 || prot.indexOf('data:') === 0) {
          return text;
        }
      }
      if (this.options.baseUrl && !originIndependentUrl.test(href)) {
        href = resolveUrl(this.options.baseUrl, href);
      }
      var out = '<a href="' + href + '"';
      if (title) {
        out += ' title="' + title + '"';
      }
      out += '>' + text + '</a>';
      return out;
    };

    for (let p of EPlugin._plugins) {
      if (p.name === "esdoc-integrate-manual-plugin") {
        console.log(doManual(p));
      }
    }
  }
}

module.exports = new Plugin();

