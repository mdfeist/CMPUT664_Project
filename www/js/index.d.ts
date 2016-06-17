/**
 * Monkeypatch JQuery.
 */
interface JQuery {
  datepicker(): void;
}

/**
 * A lot of globals. These should disappear eventually.
 */
interface Window {
  DATA: any;
  preprocessedData: any;
  filteredData: any;

  redrawTable(): void;
  toggleView(): void;
  toggleAuthors(): void;
  toggleStats(): void;
  toggleFilters(): void;
  uncheckAuthors(): void;
}
