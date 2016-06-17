import JavaType from './java-type.js';
import TimeSlice from './time-slice';
import ASTDiff from './ast-diff';

import assert from './assert.js';
import { first, last, union } from './utils.js';

type StepSize = 'hour' | 'day' | 'month' | 'week';
const VALID_STEP_SIZES = new Set(['hour', 'day', 'month', 'week']);

interface AuthorSummary {
  observed: number;
  cumulative: number;
  total: number;
}

export interface AuthorStatistics {
  type: AuthorSummary;
  file: AuthorSummary;
  date: Date
}

export default class DataView {
  public types: Array<JavaType>;
  public timeslices: Array<TimeSlice>;
  public typesPresent: Array<JavaType>;
  public authorStats: { [name: string] : AuthorStatistics};
  public commits: Array<Object>;
  public astDiffs: Array<ASTDiff>;
  public typesOverall: Set<String>;
  public filesOverall: Set<String>;

  constructor({types, timeslices, typesPresent, authorStats, astDiffs,
              typesOverall, filesOverall, commits}) {
    this.types = types;
    this.timeslices = timeslices;
    this.typesPresent = typesPresent;
    this.authorStats = authorStats;
    this.commits = commits;
    this.astDiffs = astDiffs;
    this.typesOverall = typesOverall;
    this.filesOverall = filesOverall;

    assert(this.minDate <= this.maxDate);
  }

  /**
   * Returns a new DataView with the given filters applied:
   *
   * # startDate
   * # endDate
   * # limit -- maximum number of types
   * # stepSize -- What size to group ASTDiffs
   * # authors -- Filter only to the given authors.
   * # typeFilter -- only types matching this pattern are selected.
   */
  static filter(data, filters) {
    const rawFilteredData = filterTypes(data, filters);
    return new DataView(rawFilteredData);
  }

  /* TODO: Rename to allTypeNames */
  /** All types name, without arbitrary filtering or sorting. **/
  get allTypes() {
    return Object.keys(this.typesPresent);
  }

  /* TODO: rename to authorNames. */
  /** The name of every author selected in the view. */
  get authors() {
    return Object.keys(this.authorStats);
  }

  get minDate() {
    return first(this.timeslices).startDate;
  }

  get maxDate() {
    return last(this.timeslices).endDate;
  }

  get numberOfTypes() {
    return this.typesOverall.size;
  }

  get numberOfFiles() {
    return this.filesOverall.size;
  }

  /* The following two are used for the date display picker thing. */
  get absoluteMinDate() {
    return first(this.astDiffs).date;
  }

  get absoluteMaxDate() {
    return last(this.astDiffs).date;
  }

  get numberOfColumns() {
    return this.timeslices.length;
  }

  get numberOfCommits() {
    return Object.keys(this.commits).length;
  }
}


/**
 * Takes preprocessed data, and returns an array of types, in ascending order
 * of popularity.
 *
 * Each type has its Cells, with ASTDiffs.
 */
function filterTypes(data, filters) {
  /* Let filters be undefined or null. */
  filters = filters ? filters : {};

  /* Either the date provided, or the first date attested. */
  var startDate = filters.start || first(data.astDiffs).date;
  /* Either the date provided or the last date attested. */
  var endDate = filters.end || last(data.astDiffs).date;
  var numberOfTypesUpperBound = filters.limit || Infinity;
  var stepSize = filters.stepSize || 'month';
  var authors = filters.authors || [];
  var typeFilter = filters.typeFilter ? filters.typeFilter : null;

  assert(startDate instanceof Date);
  assert(endDate instanceof Date);
  assert(startDate < endDate);
  assert(typeof numberOfTypesUpperBound === 'number');
  assert(VALID_STEP_SIZES.has(stepSize));
  assert(authors instanceof Array);

  /* Find the range of diffs to use. */
  var lowerIndex = d3.bisectLeft(data.astDiffs, startDate);
  var upperIndex = d3.bisectRight(data.astDiffs, endDate);

  var applicableDiffs = data.astDiffs.slice(lowerIndex, upperIndex);
  /* Filter types, first by the types that are ACTUALLY present in the
   * filtered ASTDiffs */
  var typesPresent = countTypeAbsoluteFrequency(applicableDiffs);
  /* XXX: refactor... */
  var typeNames = typeFilter === null ? Object.keys(typesPresent) :
    Object.keys(typesPresent).filter(typeName => {
      return typeName.toLowerCase().includes(typeFilter.toLowerCase());
    });

  var sortedTypeNames = typeNames
    .sort((a, b) => d3.descending(typesPresent[a], typesPresent[b]))
    .slice(0, numberOfTypesUpperBound);

  /* TODO: This is actually okay! You've just got an empty selection! */
  assert(sortedTypeNames.length > 0);

  /* Create a list of each type. */
  var types = sortedTypeNames.map(type => new JavaType(type));
  var typeMap = {};
  /* Map full type names to their type. */
  types.forEach(function (type) {
    typeMap[type.name] = type;
  });

  var authorMap = {};
  var authorSets = {};
  var typesOverall = new Set();
  var filesOverall = new Set();

  /* Create all cells applicable for display.  */
  var timeslices = TimeSlice.createRange(startDate, endDate, stepSize);

  timeslices.forEach(function (timeslice) {
    var startDate = timeslice.startDate;
    var endDate = timeslice.endDate;

    /* This will filter out only the applicable diffs. */
    var lowerIndex = d3.bisectLeft(applicableDiffs, startDate);
    var upperIndex = d3.bisectRight(applicableDiffs, endDate);
    var i, diff, type;

    /* For each applicable diff in the time range... */
    for (i = lowerIndex; i < upperIndex; i++) {
      diff = applicableDiffs[i];
      /* Count the type, regardless if it's filtered. */
      typesOverall.add(diff.type);

      type = typeMap[diff.type];

      /* The type must exist! */
      if (type === undefined) {
        continue;
      }

      /* Add the diff, accounting for author filters. */
      if (authors.length <= 0 || authors.indexOf(diff.author) != -1) {
        type.addDiff(diff, startDate, endDate);
        timeslice.addDiff(diff);
      }
    }

    /* Finally, commit the count to the timeslice. */
    timeslice.cumulativeTypeCount = typesOverall.size;
  });

  /* Will need to recalculate this for this measurement: */
  typesOverall = new Set();
  forEachCommit(applicableDiffs, (commit, files, types) => {
    var author = commit.author;
    var date = new Date(commit.date);
    if (!(author in authorMap)) {
      authorMap[author] = [];
      authorSets[author] = {
        files: new Set(),
        types: new Set()
      };
    }

    /* Add all observed files and types to their respective sets. */
    union(filesOverall, files);
    union(authorSets[author].files, files);
    union(typesOverall, types);
    union(authorSets[author].types, types);

    /* Record stats! */
    authorMap[author].push({
      type: {
        observed: types.size,
        cumulative: authorSets[author].types.size,
        total: typesOverall.size
      },
      file: {
        observed: files.size,
        cumulative: authorSets[author].files.size,
        total: filesOverall.size
      },
      date
    });
  });

  return {
    /* Filtered types. */
    types,
    commits: data.commits,
    typesPresent,
    timeslices,
    authorStats: authorMap,
    typesOverall,
    filesOverall,
    astDiffs: data.astDiffs
  };
}

/**
 * Count all types in the given ASTDiff objects.
 */
function countTypeAbsoluteFrequency(astDiffs) {
  var typesFrequency = {};
  astDiffs.forEach(function (diff) {
    var freq = typesFrequency[diff.type] || 0;
    typesFrequency[diff.type] = freq + 1;
  });

  return typesFrequency;
}

/**
 * Given diffs, calls the callback for each commit.
 * The callback is called with the raw commit, a set of files touched, and a
 * set of types type
 */
function forEachCommit(diffs, fn) {
  var currentCommit, filesOverall, typesOverall;

  for (var diff of diffs) {
    /* When encoutering a new commit... */
    if (currentCommit === undefined || currentCommit.commitID !== diff.sha) {
      /* Do the callback. */
      if (currentCommit !== undefined) {
        fn(currentCommit, filesOverall, typesOverall);
      }

      /* Reset the current commit. */
      currentCommit = diff.commit;
      typesOverall = new Set();
      filesOverall = new Set();
    }

    /* Update the types. */
    typesOverall.add(diff.type);

    for (var filename of diff.filesModified) {
      filesOverall.add(filename);
    }
  }
}

/*global d3*/
