let _image = undefined;
define([
  "util"
], function(util) {
  "use strict";
  
  let exports = _image = {};
  
  exports.getImageData = function(image) {
    if (typeof image == "string") {
      let src = image;
      
      image = new Image();
      image.src = src;
    }
    
    function render() {
      let canvas = document.createElement("canvas");
      let g = canvas.getContext("2d");
      
      canvas.width = image.width;
      canvas.height = image.height;
      
      g.drawImage(image, 0, 0);
      return g.getImageData(0, 0, image.width, image.height);
    }
    
    return new Promise((accept, reject) => {
      if (!image.complete) {
        image.onload = () => {
          console.log("image loaded");
          accept(render(image));
        }
      } else {
        accept(render(image));
      }
    });
  }
  
  exports.loadImageFile = function() {
    let this2 = this;
    
    return new Promise((accept, reject) => {
      let input = document.createElement("input");
      input.type = "file";
      
      input.addEventListener("change", function(e) {
        let files = this.files;
        console.log("file!", e, this.files);
        
        console.log("got file", e, files)
        if (files.length == 0) return;
        
        var reader = new FileReader();
        reader.onload = function(e) {
          var img = new Image();
          
          let dataurl = img.src = e.target.result;
          
          window._image_url = e.target.result;
          
          img.onload = (e) => {
            this2.getImageData(img).then((data) => {
              data.dataurl = dataurl;
              accept(data);
            });
          };
        };
        
        reader.readAsDataURL(files[0]);
      });
      
      input.click();
    });
  }
  
  return exports;
});
