const marked = require("marked")

const ASTNodeContainer = require('esdoc/out/src/Util/ASTNodeContainer.js').default;
const ASTUtil = require('esdoc/out/src/Util/ASTUtil').default;
const EPlugin = require('esdoc/out/src/Plugin/Plugin').default;

function stop() {
  process.exit();
}

function lpad(n, s) {
  while (s.length < n) {
    s = " " + s;
  }

  return s;
}

function traverse(node, cb) {
  if (!(node && typeof node === "object" && typeof node.type === "string")) {
    return;
  }

  cb(node);

  for (let k in node) {
    let v = node[k];

    if (Array.isArray(v)) {
      for (let v2 of v) {
        traverse(v2, cb);
      }
    } else {
      traverse(v, cb);
    }
  }
}

function makeCommentMap(node) {
  let map = {};
  traverse(node, (n) => {
    if (n.leadingComments) {
      for (let c of n.leadingComments) {
        for (let i=c.loc.start.line; i<=c.loc.end.line; i++) {
          map[i] = c;
        }
      }
      if (n.trailingComments) {
        for (let c of n.trailingComments) {
          for (let i = c.loc.start.line; i <= c.loc.end.line; i++) {
            map[i] = c;
          }
        }
      }
    }
  });

  return map;
}

class Plugin {
  onHandleDocs(ev) {
    this._docs = ev.data.docs;
    this._option = ev.data.option || {};

    this._ev = ev;
    
    if (!('enable' in this._option)) this._option.enable = true;


    function genjs(node) {
      let s = "", last = "", last2 = "";
      let stack = [];

      function out(s2) {
        last2 = last;
        last = s;
        s += s2;
      }

      let walkers = {
        StringLiteral(n, p, path) {
          out('"'+n.value+'"');
        },
        NumericLiteral(n, p, path) {
          out(n.value);
        },
        Identifier(n, p, path) {
          out(n.name);
        },
        MemberExpression(n, p, path) {
          stack.push(".")
        },
        BinaryExpression(n, p, path) {
          stack.push(n.operator)
        }
      };

      traverse(node, (node, parent, path) => {
        if (node.type in walkers) {
          let slen = stack.length;

          walkers[node.type](node, parent, path);

          if (slen === stack.length && stack.length > 0) {
            s += stack.pop();
          }
        }
      });

      while (stack.length > 0) {
        s += stack.pop();
      }

      return s;
    }

    function getComments(node) {
      let ret = "/*";
      let ok = 0;

      traverse(node, (n, p, path) => {
        if (n.leadingComments) {
          for (let c of n.leadingComments) {
            ok = 1;
            ret += c.value;
          }
        }
        if (n.trailingComments) {
          for (let c of n.trailingComments) {
            ok = 1;
            ret += c.value;
          }
        }
      });

      if (ok) {
        return ret + "*/";
      } else {
        return "";
      }
    }


    for (let doc of ev.data.docs) {
      if (doc.kind === "variable") {
        let n = ASTNodeContainer.getNode(doc.__docId__);
        
        if (!n || !n.declarations) {
          continue;
        }
        
        let ok = n.declarations.length === 1;
        ok = ok && doc.export;
        ok = ok && n.declarations[0].id;
        ok = ok && n.declarations[0].id.type === "Identifier";

        if (!ok) {
          continue;
        }

        let init = n.declarations[0].init;
        let name = n.declarations[0].id.name;


        ok = ok && init.type === "ObjectExpression";

        if (!ok) {
          continue;
        }

        let map = makeCommentMap(n);

        let s = `export ${n.kind} ${name} = {\n`;
        let maxline = 1;
        for (let prop of init.properties) {
          maxline = Math.max(maxline, genjs(prop).length+2);
        }


        let lastn = init;
        for (let prop of init.properties) {
          let line = genjs(prop.key);

          if (prop.computed) {
            line = '[' + line + ']';
          }

          line = "    " + line;

          while (line.length < maxline) {
            line += " ";
          }

          line += ": ";
          line += genjs(prop.value);

          s += line + ",";

          let cmt = prop.value ? map[prop.value.loc.start.line] : undefined;
          if (cmt) {
            s += "  //" + cmt.value + "";
          }
          s += "\n";
          //lastn = prop;
          //console.log(prop)
        }

        s += "}";

        s = `<pre>${s}</pre>`;

        doc.description = s;
      }

    }

  }

}
module.exports = new Plugin();
