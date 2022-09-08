"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
exports.__esModule = true;
var dsl_1 = require("./dsl");
const Sandbox = require('sandbox');
var fullLine
var virtual = new Sandbox();
dsl_1.ƛ({
    server: process.argv[3],
    nick: process.argv[3],
    channel: process.argv[4]
}, dsl_1.Connect(6667)(function (line) {
  return dsl_1.on(/PING (\S+)/)(function (_) {
    console.log('received ping req')
    dsl_1.server(templateObject_1 || (templateObject_1 = __makeTemplateObject(["PONG ", ""], ["PONG ", ""])), _);
}); }, function (line) {
  return dsl_1.message(/^\.js (.+)/)(function (_, chan) {
    virtual.run(_, function (out) {
        if (_.toLowerCase().includes('mainmodule')) {
            dsl_1.reply(templateObject_2 || (templateObject_2 = __makeTemplateObject(["Execution halted \uD83D\uDE45\u200D"], ["Execution halted \uD83D\uDE45\u200D"])));
            return;
        }
        var safe = out.result.replace(/\r|\n/g, '')
            .replace(/\\'/g, "'")
            .slice(0, 400);
        //let chan = '#math'
        //console.log(chan)
        dsl_1.reply(templateObject_3 || (templateObject_3 = __makeTemplateObject(["", ""], ["", ""])), safe, chan);
    });
  }); 
}, function (line) { return dsl_1.message(/^\.version$/)(function (_) {
    dsl_1.reply(templateObject_4 || (templateObject_4 = __makeTemplateObject(["qj v2.0.2 ( source: https://gist.github.com/jahan-addison/093e87eef768073bc9ead499d088df10 )"], ["qj v2.0.2 ( source: https://gist.github.com/jahan-addison/093e87eef768073bc9ead499d088df10 )"])));
}); }), function (error) { return '💥 Something went wrong.'; });
var templateObject_1, templateObject_2, templateObject_3, templateObject_4;
