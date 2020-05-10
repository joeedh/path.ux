export function saveFile(data, filename="unnamed", exts=[], mime="application/x-octet-stream") {
  let blob = new Blob([data], {type : mime});
  let url = URL.createObjectURL(blob);

  let a = document.createElement("a");
  a.setAttribute("href", url);
  a.setAttribute("download", filename);

  a.click();
}

//returns a promise
export function loadFile(filename="unnamed", exts=[]) {
  let input = document.createElement("input");
  input.type = "file";

  exts = exts.join(",");

  input.setAttribute("accept", exts)
  return new Promise((accept, reject) => {
    input.onchange = function(e) {
      if (this.files === undefined || this.files.length !== 1) {
        reject("file load error");
        return;
      }

      let file = this.files[0];
      let reader = new FileReader();

      reader.onload = function(e2) {
        accept(e2.target.result);
      };

      reader.readAsArrayBuffer(file);
    }
    input.click();
  });
}

window._testLoadFile = function(exts=["*.*"]) {
  loadFile(undefined, exts).then((data) => {
    console.log("got file data:", data);
  });
};

window._testSaveFile = function() {
  let buf = _appstate.createFile();
  //console.log(buf);
  saveFile(buf, "unnamed.w3d", [".w3d"]);
}