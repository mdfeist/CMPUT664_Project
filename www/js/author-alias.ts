import assert from './assert';

export default class AuthorAlias {
  public name: String;
  public email: String;

  constructor(alias: String) {
    [this.name, this.email] = parseAlias(alias);
  }

  get shorthand() {
    return `${this.name} <${this.email}>`
  }

  toString() {
    return this.shorthand;
  }
}

function parseAlias(text: String): [String, String] {
  let match = text.match(/^\s*([^<]+)<([^>]+)>\s*$/);
  if (match === null || match.length !== 3) {
    throw new Error(`Could not match author alias: ${text}`);
  }

  return [match[1], match[2]];
}
