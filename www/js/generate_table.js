/**
 * Processes and draws the TypeDNA diagram.
 *
 * Authors:
 *  - Michael Fiest
 *  - Eddie Antonio Santos
 *  - Ian Watts
 */

/**
 * From: http://colorbrewer2.org/?type=diverging&scheme=RdBu&n=3
 * ['#ef8a62','#f7f7f7','#67a9cf'];
 */
var COLOR_START = '#ef8a62';
var COLOR_END = '#67a9cf';
var VALID_STEP_SIZES = d3.set(['hour', 'day', 'month', 'week']);


/* Shim the assert function in there! */
!window.assert ? (window.assert = console.assert.bind(console)) : undefined;


/* Run right after the page (and this script) finishes loading. */
document.addEventListener('DOMContentLoaded', function () {
  var container = document.getElementById('dna-table');

  /* XXX: */
  var processed = window.preprocessedData = preprocessData(window.DATA);
  var filtered = window.filteredData = filterTypes(processed, {
  });

  /* Make this arbitrarily large. */
  var height = 20 * filtered.types.length;

  drawGraph(filtered, container.offsetWidth, height);
});


/*=== Classes ===*/

/**
 * Class: ASTDiff
 *
 * Instantiated with an original data object.
 */
function ASTDiff(original) {
  /* Instantiate a new ASTDiff object if called without `new`. */
  if (!(this instanceof ASTDiff)) {
    return new ASTDiff(original);
  }

  var date = new Date(original.date);
  /* The date must be reasonable... */
  assert(date > new Date('1970-01-01') && date < new Date());
  assert(typeof original.type === 'string');
  assert(ASTDiff.EDIT_KIND.has(original.edit));
  assert(looksLikeAnEmail(original.author));

  this.date = date;
  this.type = original.type;
  this.author = original.author;
  this.edit = original.edit;
  this.commit = original.commitID;
}

/**
 * The set of edit kinds.
 */
ASTDiff.EDIT_KIND = d3.set(['ADD', 'REMOVE']);

/**
 * ASTDiff methods and computed properties.
 */
Object.defineProperties(ASTDiff.prototype, {
  isAdd: {
    get: function () {
      return this.edit === 'ADD';
    }
  },

  isRemove: {
    get: function () {
      return this.edit === 'REMOVE';
    }
  },

  /**
   * Delegate valueOf() to the internal date object. This makes relational
   * comparisons with ASTDiff objects equivillent to comparing their dates.
   * (i.e.,
   *    (ASTDiff(...) < ASTDiff(...)) ===
   *        (ASTDiff(...).date < ASTDiff(...))
   * )
   */
  valueOf: {
    value: function () {
      return this.date.valueOf();
    },
  }
});

/**
 * Class: Cell
 *
 * Represents the data for a single cell in the table.  The data is a number
 * of observations, which are either additions or deletions.
 */
function Cell(start, until, type) {
  /* Instantiate a new Cell object if called without `new`. */
  if (!(this instanceof Cell)) {
    return new Cell(start, until, type);
  }

  assert(start instanceof Date);
  assert(until instanceof Date);
  assert(typeof type === 'string');

  this.data = []
  this.startDate = start;
  this.endDate = until;
  this.type = type;
}

Object.defineProperties(Cell.prototype, {
  /**
   * Given a bunch of ASTDiffs,
   * sets this cell's data to the appropriate ASTDiff.
   */
  setDataFromSortedASTDiffs: {
    value: function (astDiffs) {
      assert(astDiffs instanceof Array);
      var typeName = this.type;

      var lowerIndex = d3.bisectLeft(astDiffs, this.startDate);
      /* Do not include upper index. */
      var upperIndex = d3.bisectLeft(astDiffs, this.endDate);

      this.data = astDiffs
        .slice(lowerIndex, upperIndex)
        .filter(function (diff) {
          return diff.type === typeName;
        });

      return this;
    },
  },

  /** True if the cell contains at least one AST diff.  */
  hasData: {
    get: function () {
      return this.data && (this.data.length > 0);
    }
  },

  /** Number of observations. */
  numberOfObservations: {
    get: function () {
      return this.data.length;
    }
  },

  /** Number of additions.  */
  numberOfAdds: {
    get: function () {
      return this.data.filter(function (diff) {
        return diff.isAdd;
      }).length;
    }
  },

  /** Number of deletions.  */
  numberOfDeletions: {
    get: function () {
      return this.data.filter(function (diff) {
        return diff.isRemove;
      }).length;
    }
  }
});


/**
 * Class: JavaType
 *
 * Represents a type in Java.
 */
function JavaType(name) {
  /* Instantiate a new Cell object if called without `new`. */
  if (!(this instanceof JavaType)) {
    return new JavaType(name);
  }

  /* TODO: primitive types? */
  /* TODO: generics? */
  var components = name.split('.');
  this.name = components.pop();
  this.package = components.join('.');
  this.cells = [];
}

Object.defineProperties(JavaType.prototype, {
  /**
   * Given a bunch of ASTDiffs,
   * sets this cell's data to the appropriate ASTDiff.
   */
  fullyQualifiedName: {
    get: function () {
      return this.package + '.' + this.name;
    }
  },

  addCell: {
    value: function (cell) {
      assert(cell instanceof Cell);
      return this.cells.push(cell);
    }
  },

  toString: {
    value: function () {
      return this.className;
    }
  }
});


/*=== Core functions ====*/

/**
 * Modifies original data.
 */
function preprocessData(data) {
  assert(data.types instanceof Array);
  assert(data.commits instanceof Array);
  assert(data.dates instanceof Array);

  return {
    /* A set of types. */
    types: d3.set(data.types),

    /* Mapping GitSha -> Commit MetaData. */
    commits: (function () {
      var commitMap = {};
      data.commits.forEach(function (commit) {
        assert(typeof commit.commitID  === 'string');
        var sha = commit.commitID;
        assert(looksLikeAGitSha(sha));

        commitMap[sha] = commit;
      });
      return commitMap;
    }()),

    /* A copy of AST Diff data, in asscending order of date. */
    astDiffs: (function (astDiffsByType) {
      return astDiffsByType
        .map(ASTDiff)
        .sort(function (a, b) {
          assert(a instanceof ASTDiff);
          return d3.ascending(a.date, b.date);
        });
    }(data.dates.slice()))
  };
}


/**
 * Takes preprocessed data, and returns an array of types, in ascending order
 * of popularity.
 *
 * Each type has its Cells, with ASTDiffs.
 */
function filterTypes(data, filters) {
  assert(filters);
  /* Either the date provided, or the first date attested. */
  var startDate = filters.start || data.astDiffs[0].date;
  /* Either the date provided or right NOW! */
  var endDate = filters.end || new Date();
  var numberOfTypesUpperBound = filters.limit || Infinity;
  var cellSize = filters.stepSize || 'day';

  assert(startDate instanceof Date);
  assert(endDate instanceof Date);
  assert(startDate < endDate);
  assert(typeof numberOfTypesUpperBound === 'number');
  assert(VALID_STEP_SIZES.has(cellSize));

  /* Find the range of diffs to use. */
  var lowerIndex = d3.bisectLeft(data.astDiffs, startDate);
  var upperIndex = d3.bisectRight(data.astDiffs, endDate);

  var applicableDiffs = data.astDiffs.slice(lowerIndex, upperIndex);
  /* Filter types, first by the types that are ACTUALLY present in the
   * filtered ASTDiffs */
  var typesPresent = countTypeAbsoluteFrequency(applicableDiffs);
  var sortedTypeNames = Object.keys(typesPresent)
    .sort(function (a, b) {
      return d3.descending(typesPresent[a], typesPresent[b]);
    })
    .slice(0, numberOfTypesUpperBound);

  assert(sortedTypeNames.length > 0);

  /* Create an entry for each type. */
  var types = sortedTypeNames.map(JavaType);

  /* Create all cells applicable to display.  */
  forEachDateLimitsDescending(startDate, endDate, cellSize, function (start, end) {
    /* For each type... */
    types.forEach(function (type) {
      /* ...add all data cells. */
      type.addCell(
        new Cell(start, end, type.fullyQualifiedName)
          .setDataFromSortedASTDiffs(applicableDiffs)
      );
    });

  });

  /* The cells in each type are in DESCENDING order.
   * Therefore, take the END date of the FIRST cell to get the upper limit;
   * and take the START date of the LAST cell to get the lower limit. */
  var arbitraryCells = first(types).cells;
  var maxDate = first(arbitraryCells).endDate;
  var minDate = last(arbitraryCells).startDate;
  assert(minDate <= maxDate);

  return {
    types: types,
    numberOfColumns: arbitraryCells.length,
    minDate: minDate,
    maxDate: maxDate
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
 * Given start and end dates, calls the given callback with the start and end
 * date.
 */
function forEachDateLimitsDescending(start, end, step, callback) {
  var currentStart;
  var currentEnd = end;

  while (start < currentEnd) {
    currentStart = moment(currentEnd);

    switch (step) {
        case 'hour':
            currentStart.subtract(1, 'hour');
            break;
        case 'day':
            currentStart.subtract(1, 'day');
            break;
        case 'week':
            /* TODO: Make this smarter? */
            currentStart.subtract(1, 'weeks');
            break;
        case 'month':
            currentStart.subtract(1, 'month');
    }

    callback(currentStart.toDate(), currentEnd);
    currentEnd = currentStart.toDate();
  }
}


/*=== Graph ===*/

function drawGraph(data, width, height) {
  var marginLeft = 120;

  /* Create a scale for the types i.e., the y-axis */
  var yScale = d3.scale.ordinal()
    .domain(data.types.map(function (type) { return type.name }))
    .rangeBands([0, height]);

  /* Create a scale for the dates i.e., the x-axis */
  var xScale = d3.time.scale()
    .domain([data.minDate, data.maxDate])
    .rangeRound([marginLeft, width]);

  /**
   * Given number of additions and deletions, returns an appropriate,
   * interpoloated colour.
   */
  var colorScale = (function () {
    var colorInterpolator = d3.interpolateHsl(COLOR_START, COLOR_END);

    return function (additions, deletions) {
      assert(additions + deletions > 0);
      var score = additions / (additions + deletions);
      assert(0 <= score && score <= 1);
      return colorInterpolator(score);
    };
  }());

  var svg = d3.select('#dna-table').append('svg')
      .attr("width", width)
      .attr("height", height);

  var row = svg.selectAll('.row')
      .data(data.types)
    .enter().append('g')
      .classed('row', true)
      .attr('transform', function (type) {
        return 'translate(0, ' + yScale(type.name) + ')';
      })
      .each(createCellsForType);

  row.append('text')
      .attr('y', yScale.rangeBand() / 2)
      .attr('dy', '.32em')
      .attr('x', `${marginLeft - 10}px`)
      .attr('text-anchor', 'end')
      .text(function (type) { return type.name });

  function createCellsForType(type) {
    /* Create all the cells. */
    var cell = d3.select(this).selectAll('.cell')
        .data(type.cells)
      .enter().append('g')
        /* Only do cool things with cells that *HAVE* data! */
        .filter(function (cell) { return cell.hasData; })
        .classed('cell', true)
        .attr('transform', function (cell) {
          return 'translate(' + xScale(cell.startDate) + ', 0)';
        });

    cell.append('rect')
      .classed('cell-data', true)
      .attr('width', cellWidthFromScale(first(type.cells), xScale))
      .attr('transform', 'translate(0, 1)')
      .attr('height', yScale.rangeBand() - 2)
      .style('fill', function (cell) {
        assert(cell.hasData);
        /* Use a gradient that shows proportion of additions and deletions. */
        return colorScale(cell.numberOfAdds, cell.numberOfDeletions);
      });
  }
}

/*=== Utilties ===*/

function cellWidthFromScale(cell, scale) {
  var bigger = scale(cell.endDate);
  var smaller = scale(cell.startDate);
  assert(bigger > smaller);
  return bigger - smaller;
}

function first(array) {
  assert(array instanceof Array);
  return array[0];
}

function last(array) {
  assert(array instanceof Array);
  return array[array.length - 1];
}

/*=== Predicates used in assertions and checks ===*/

function looksLikeAnEmail(thing) {
  if (typeof thing !== 'string') {
    return false;
  }

  /* Emails are actually really complicated, but let's... do this: */
  return thing.match(/^.+@.+$/);
}


function looksLikeAGitSha(thing) {
  if (typeof thing !== 'string') {
    return false;
  }

  return thing.match(/^[0-9a-f]{5,}$/i);
}

/*globals d3, moment*/
