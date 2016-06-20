const assert: (condition: boolean, message?: string) => void =
typeof console.assert !== undefined
  ? console.assert.bind(console)
  : function () {};

export default assert;
/*eslint no-console:0*/
