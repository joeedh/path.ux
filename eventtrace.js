
let debug = 0;

function color(str, c) {
  let pre;

  if (!str)
    return;

  pre = "\u001b[38;5;" + c.toString(10) + "m";

  return pre + str + "\u001b[0m";
}

exports.parse = (buf, name) => {
    let counts = {
        addEventListener : 3,
        removeEventListener : 3,
        dispatchEvent : 1,
        on : 3,
        off : 3,
      //   _fireEvent : 2,
      //   _fire : 2
    };

    let keys = new Set(["addEventListener", "removeEventListener", "dispatchEvent", "on", "off", /*"_fireEvent", "_fire"*/]);

    let babel = require("@babel/parser");
    let walk = require("@babel/traverse").default;
    let generator = require("@babel/generator").default;
    let types = require("@babel/types");

    let node = babel.parse(buf, {
        sourceType : "unambiguous",
        sourceFilename : name,
        ranges : true
    });

    function genjs(n) {
        return generator(n, {}).code.trim();
    }

    walk(node, {
        CallExpression(path) {
            let n = path.node;

            //console.log(n.node)
            let ok = n.callee.type === "MemberExpression";
            let key = genjs(n.callee.property);
            ok = ok && keys.has(key); 

            if (!ok) {
                return;
            }
            
            let args = key === "dispatchEvent" ? 1 : 4;

            while (n.arguments.length < args) {
                n.arguments.push({
                    type : "Identifier",
                    name : "undefined"
                })
            }
            //console.log(genjs(n.callee));
            
            let owner = "";

            let p = path;
            while (p) {
                //console.log(p.node.type)
                if (p.node.type === "ClassDeclaration") {
                    owner = genjs(p.node.id) + "." + owner;
                } else if (p.node.type === "ClassMethod") {
                    let id = p.node.kind === "constructor" ? "constructor" : genjs(p.node.id);
                    owner = id + "." + owner;
                } else if (p.node.type === "FunctionExpression" || p.node.type === "ArrowFunctionExpression") {
                    let id = genjs(p.node.id)
                    
                    let pn = p.parentPath.node;
                    if (pn.type === "VariableDeclarator") {
                        id = genjs(pn.id);
                    } else if (pn.type === "MemberExpression") {
                        id = genjs(pn.property);
                    } else if (pn.type === "AssignmentExpression") {
                        id = "'" + genjs(pn.left) + "'";
                    }

                    owner = id + "." + owner
                }

                p = p.parentPath;
            }

            if (owner.endsWith(".")) {
                owner = owner.slice(0, owner.length-1);
            }

            if (debug)
                console.log(owner);


            //console.log("\n\n");

            n.arguments.push({
                type : "Identifier",
                name : "this"
            });

            n.arguments.push({
                type : "NumericLiteral",
                value : n.loc.start.line-1
            })
            n.arguments.push({
                type : "StringLiteral", 
                value : name
            })

            n.arguments.push({
                type : "StringLiteral", 
                value : owner
            })
            
            //n.arguments.push()
        }
    })

    //console.log(node);

    let buf2 = generator(node, {
        retainLines  : true,
        compact      : false,
        comments     : true,
        filename     : name,
    }, buf);

    if (debug)
        console.log(buf2.code);

    return buf2.code;
}

if (debug) {
  console.log(exports.parse(`
  export class Yay {
      constructor() {
        function bleh() {
            window.addEventListener("mousedown", /*)*/bleh, {a : 1}); //bleh
        }
        let func2 = () => {
            window.off(\`mousedown\`, (e) => {
            });
        }
        let func3 = function() {
            window.dispatchEvent(e);
        }

        this.func4 = function() {
            window.off(\`mousedown\`, (e) => {
            });
        }
    }
}
`, "file.js"));
}
