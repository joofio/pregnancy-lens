const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { JSDOM } = require("jsdom");

global.html = fs.readFileSync(path.join(__dirname, "../data/html.html"), "utf-8");
global.epi = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/epi.json")));
global.ips = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/ips.too-young.json")));
global.pv = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/pv.json")));

const dom = new JSDOM(global.html);
global.window = dom.window;
global.document = dom.window.document;

test("should handle female not of childbearing age (too young)", async () => {
  const scriptContent = fs.readFileSync(path.join(__dirname, "../pregnancy-lens.js"), "utf-8");
  const context = {
    console,
    window,
    document,
    html: global.html,
    epi: global.epi,
    ips: global.ips,
    pv: {},
    require,
    module: {},
    exports: {},
  };
  context.global = context;
  vm.createContext(context);
  const wrappedScript = `(function() {\n${scriptContent}\n})();`;
  const annotation = vm.runInContext(wrappedScript, context);
  await annotation.enhance();
  const explanationFn = annotation.explanation("en");
  expect(explanationFn.status.childbearingAge).toBe(false);
  expect(explanationFn.message).toBe("");
});
