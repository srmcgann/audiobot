"use strict";
exports.__esModule = true;
exports.Guard = exports.match = exports.Some = exports.None = void 0;
var None = function () { return void (0); };
exports.None = None;
function Some(_) {
    return function () { return _; };
}
exports.Some = Some;
function match(_, some, none) {
    if (Guard(_)) {
        return some(_());
    }
    else {
        return none();
    }
}
exports.match = match;
function Guard(_) {
    return _() !== exports.None();
}
exports.Guard = Guard;
