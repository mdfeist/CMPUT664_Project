import assert from './assert';

/**
 * A private symbol used to fake a private constructor.
 * @return {[type]} [description]
 */
const PRIVATE = Symbol();

export default class AuthorIdentity {
  public name: string;
  public email: string;

  /** XXX: Fix memory leak! */
  private static _instances = new Map<string, AuthorIdentity>();

  constructor(alias: string, token: any) {
    if (token !== PRIVATE) {
      throw new Error(`Use AuthorIdentity.get("${alias}") instead.`);
    }
    [this.name, this.email] = parseAlias(alias);
  }

  get shorthand() {
    return `${this.name} <${this.email}>`
  }

  toString() {
    return this.shorthand;
  }

  /**
   * Get a globally unique instance.
   * @return {AuthorIdentity}      [description]
   */
  static get(name: string): AuthorIdentity {
    let normalized = new AuthorIdentity(name, PRIVATE).shorthand;
    let id = AuthorIdentity._instances.get(normalized);

    if (id === undefined) {
      id = new AuthorIdentity(name, PRIVATE);
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
