const assert = typeof console.assert !== undefined
  ? console.assert.bind(console)
  : function () {};

export default assert;
/*eslint no-console:false*/
