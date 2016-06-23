import AuthorIdentity from './author-identity';
export { AuthorIdentity };

/**
 * Represents one verified full author.
 */
 export default class Author {
   private _aliases: Set<AuthorIdentity>;

   constructor(
     public primaryIdentity: AuthorIdentity,
     aliases?: AuthorIdentity[]
   ) {
     this._aliases = new Set(aliases);
   }

   /**
    * The author's name.
    * @return {string} [description]
    */
   get name(): string {
     return this.primaryIdentity.name;
   }

   /**
    * The author's email.
    * @return {string} [description]
    */
   get email(): string {
     return this.primaryIdentity.email;
   }

   /**
    * An idenitification string, suitable for mapping back to the author.
    * @return {string} [description]
    */
   get id(): string {
     return this.shorthand;
   }

   /**
    * A list of secondary aliases.
    * @return {Set<AuthorIdentity>} [description]
    */
   get aliases(): Set<AuthorIdentity> {
     return new Set(this._aliases);
   }

   get shorthand(): string {
     return this.primaryIdentity.shorthand;
   }
 }
