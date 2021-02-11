//stores xml sources
let pagecache = new Map()


export function parseXML(xml) {
  let parser = new DOMParser()
}

export function initPage(ctx, xml) {

}

export function loadPage(ctx, url) {
  let source;

  if (pagecache.has(url)) {
    source = pagecache.get(url);
    return new Promise((accept, reject) => {
      let ret = initPage(ctx, source);

      accept(ret);
    });
  } else {
    return new Promise((accept, reject) => {
      fetch(url).then(res => res.text()).then(data => {
        pagecache.set(url, data);

        let ret = initPage(ctx, data);

        accept(ret);
      });
    });
  }
}
