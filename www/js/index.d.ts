/**
 * Monkeypatch JQuery.
 */
interface JQuery {
  datepicker(): void;
}

/**
 * Available time periods to bucket AST diffs.
 * @type {String}
 */
type StepSize = 'hour' | 'day' | 'month' | 'week';

/**
 * A lot of globals. These should disappear eventually.
 */
interface Window {
  DATA: Project;
  preprocessedData: any;
  filteredData: any;
  authors: string[];

  redrawTable(): void;
  toggleView(): void;
  toggleAuthors(): void;
  toggleStats(): void;
  toggleFilters(): void;
  uncheckAuthors(): void;
}

interface Filter {
  /** Show commits made after this date. */
  start?: Date;
  /** Show commits made before this date. */
  end?: Date;
  /** Time period to bucket AST diffs. */
  stepSize?: StepSize;
  /** Maximum number of types to display. */
  limit?: number;
  /**
   * Restrict results to these authors.
   * If none given, signifies no restriction.
   */
  authors?: string[];
  /** Restrict results to types containing this string. */
  typeFilter?: string;
}

/**
 * Two different types can be compared if their .valueOf() always returns a
 * number.
 */
interface Valuable {
  valueOf(): number;
}
