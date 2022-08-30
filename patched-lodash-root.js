// Patched version of the lodash/_root module which currently includes a
// literal eval. This makes the code fail static analysis/security checks
var freeGlobal = require('./_freeGlobal');

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf;
if (!root) {
  throw new Error('undefined root');
}

module.exports = root;
