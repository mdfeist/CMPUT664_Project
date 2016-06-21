import ASTDiff from './ast-diff';
import Cell from './cell';
import { last } from './utils';

/**
 * Class: JavaType
 *
 * Represents a type in Java.
 * Note: There probably should be a JavaEntity,
 * with methods having a JavaType parent, and JavaType arguments;
 * and for there to be a DataEntry class that contains cells. But that sounds
 * like too much effort.
 *
 * Create an array of these and you get a y-axis!
 */
export default class JavaType {
  private _largest: number;

  public className: string;
  public package: string;
  public methodName: string;
  public cells: Cell[];

  constructor(name: string) {
    /* Instantiate a new JavaType object if called without `new`. */
    if (!(this instanceof JavaType)) {
      return new JavaType(name);
    }

    /* TODO: primitive types? */
    /* TODO: generics? */
    var sides = name.split('#');
    var generics_components = sides[0].split('<');
    var components = generics_components[0].split('.');

    /* Max adds per type. */
    this._largest = null;

    this.className = components.pop();
    this.package = components.join('.');
    this.methodName = sides[1] || '';

    if (generics_components.length > 1) {
      this.className += `<${generics_components[1]}>`;
    }

    this.cells = [];
  }

  /**
   * Adds a data cell.
   */
  addCell(cell: Cell) {
    return this.cells.push(cell);
  }

  /**
   * Adds an AST diff to the current type.
   */
  addDiff(diff: ASTDiff, startDate: Date, endDate: Date) {
    if (!this.cells.length || !last(this.cells).isAcceptableDiff(diff)) {
      /* Automatically add a new cell, if needed. */
      this.addCell(new Cell(startDate, endDate, this.name));
    }
    last(this.cells).addDiff(diff);
  }

  /**
   * toString() will simply return the fully-qualified name.
   */
  toString() {
    return this.fullyQualifiedName;
  }

  /**
   * Returns the fully-qualified name (package + class name) of this type.
   */
  get name(): string {
    if (this.package) {
      return this.package + '.' + this.shortName;
    }

    return this.shortName;
  }

  /**
   * The short name is simply the class name, plus its arguments, if they
   * exist.
   */
  get shortName(): string {
    if (this.methodName) {
      return this.className + '#' + this.methodName;
    }
    return this.className;
  }

  /**
   * Alias for name.
   */
  get fullyQualifiedName(): string {
    return this.name;
  }

  /**
   * The number of commits in the largest cell.
   *
   * Used when rendering bars proportionally.
   */
  get numberOfObservationsInLargestCell(): number {
    if (this._largest !== null) {
      return this._largest;
    }

    /* Calculate it! */
    var maxCell = d3.max(this.cells, function (cell) {
      return cell.numberOfObservations;
    });

    this._largest = maxCell;
    return this._largest;
  }
}

/*globals d3*/
