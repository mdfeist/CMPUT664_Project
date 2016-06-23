import assert from './assert';

export default class AuthorIdentity {
  public name: string;
  public email: string;

  /** XXX: Fix memory leak! */
  private static _instances = new Map<string, AuthorIdentity>();

  constructor(alias: string) {
    [this.name, this.email] = parseAlias(alias);
  }

  get shorthand() {
    return `${this.name} <${this.email}>`
  }

  toString() {
    return this.shorthand;
  }

  static get(name: string): AuthorIdentity {
    let normalized = new AuthorIdentity(name).shorthand;
    let id = AuthorIdentity._instances.get(normalized);

    if (id === undefined) {
      id = new AuthorIdentity(name);
      AuthorIdentity._instances.set(id.shorthand, id);
    }

    return id;
  }
}

function parseAlias(text: string): [string, string] {
  let match = text.match(/^\s*([^<]+)<([^>]+)>\s*$/);
  if (match === null || match.length !== 3) {
    throw new Error(`Could not match author alias: ${text}`);
  }

  return [match[1].trim(), match[2].trim()];
}
