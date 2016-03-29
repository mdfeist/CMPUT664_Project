/**
 * Processes and draws the TypeDNA diagram.
 *
 * Authors:
 *  - Michael Fiest
 *  - Eddie Antonio Santos
 *  - Ian Watts
 */

var VALID_STEP_SIZES = d3.set(['hour', 'day', 'month', 'week']);

/** The set of edit kinds.  */
ASTDiff.EDIT_KIND = d3.set(['ADD', 'REMOVE']);

/* Shim the assert function in there! */
!window.assert ? (window.assert = console.assert.bind(console)) : undefined;

var CELL_INFO_WIDTH = 500

/* Cell Info */
var cellInfo = d3.select("body")
  .append("div")
  .style("position", "absolute")
  .style("z-index", "10")
  .style("visibility", "hidden")
  .style("width", String(CELL_INFO_WIDTH) + "px")
  .classed('panel panel-default', true);

cellInfo.append('div')
  .classed('panel-heading', true)
  .style("font-weight", "bold")
  .text('Info');


/* Draw table given JSON */
function createTable(data, filter) {
  window.DATA = data;
  window.preprocessedData = preprocessData(window.DATA);

  return createTable2(filter);
}
window.createTable = createTable;

function createTable2(filter) {
  var container = document.getElementById('dna-table');

  /* Clear previous table */
  container.innerHTML = "";

  /* XXX: */
  var processed = window.preprocessedData;
  var filtered = window.filteredData = filterTypes(processed, filter);

  /* Make this arbitrarily large. */
  var height = 20 * filtered.types.length;

  drawGraph(filtered, container.offsetWidth, height);

  return filtered;
}


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
  /* We can't trust all data to look like an email address... */
  //assert(looksLikeAnEmail(original.author));

  this.date = date;
  this.type = original.type;
  this.author = original.author;
  this.edit = original.edit;
  this.commit = original.commitID;
}

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

  this.diffs = []
  this.startDate = start;
  this.endDate = until;
  this.type = type;
}

Object.defineProperties(Cell.prototype, {
  /**
   * Adds a single diff.
   */
  addDiff: {
    value: function (diff) {
      assert(diff instanceof ASTDiff);
      assert(this.isAcceptableDiff(diff));
      assert(diff.type === this.type);
      this.diffs.push(diff);
      return this;
    },
  },

  isAcceptableDiff: {
    value: function (diff) {
      if (!(diff instanceof ASTDiff)) {
        return false;
      }

      /* Chrome V8 will bail-out of optimizing this function if you compare
       * the dates directly (non-primitive compare);
       * instead, compare the valueOf()s, since this ends up being a Number
       * time value (see ECMA-262 5.1 §15.9.1.1), which it will gladly
       * generate native code for.  */
      return this.startDate.valueOf() <= diff.date.valueOf() &&
        diff.date.valueOf() <= this.endDate.valueOf();
    },
  },

  /** True if the cell contains at least one AST diff.  */
  hasData: {
    get: function () {
      return this.diffs && (this.diffs.length > 0);
    }
  },

  /** Number of observations. */
  numberOfObservations: {
    get: function () {
      return this.diffs.length;
    }
  },

  /** Number of additions.  */
  numberOfAdds: {
    get: function () {
      return this.diffs.filter(function (diff) {
        return diff.isAdd;
      }).length;
    }
  },

  /** Number of deletions.  */
  numberOfDeletions: {
    get: function () {
      return this.diffs.filter(function (diff) {
        return diff.isRemove;
      }).length;
    }
  },

  /** Get set of authors */
  authors: {
    get: function () {
      var authors = d3.set();

      this.diffs.forEach( function (diff) {
        authors.add(diff.author);
      });

      return authors.values();
    }
  },

  /** Get set of commit id's */
  commits: {
    get: function () {
      var commits = d3.set();

      this.diffs.forEach( function (diff) {
        commits.add(diff.commit);
      });

      return commits.values();
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
  this.shortName = components.pop();
  this.package = components.join('.');
  this.cells = [];
}

Object.defineProperties(JavaType.prototype, {
  /**
   * Returns the fully-qualified name (package + class name) of this type.
   */
  name: {
    get: function () {
      if (this.package) {
        return this.package + '.' + this.shortName;
      }

      return this.shortName;
    }
  },

  /**
   * Alias for name.
   */
  fullyQualifiedName: {
    get: function () {
      return this.name;
    }
  },

  /**
   * Adds a data cell.
   */
  addCell: {
    value: function (cell) {
      assert(cell instanceof Cell);
      return this.cells.push(cell);
    }
  },

  /**
   * Adds an AST diff to the current type.
   */
  addDiff: {
    value: function (diff, startDate, endDate) {
      if (!this.cells.length || !last(this.cells).isAcceptableDiff(diff)) {
        /* Automatically add a new cell, if needed. */
        this.addCell(new Cell(startDate, endDate, this.name));
      }
      last(this.cells).addDiff(diff);
    }
  },

  toString: {
    value: function () {
      return this.fullyQualifiedName;
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
  /* Let filters be undefined or null. */
  filters = filters ? filters : {};

  /* Either the date provided, or the first date attested. */
  var startDate = filters.start || first(data.astDiffs).date;
  /* Either the date provided or the last date attested. */
  var endDate = filters.end || last(data.astDiffs).date;
  var numberOfTypesUpperBound = filters.limit || Infinity;
  var stepSize = filters.stepSize || 'month';

  assert(startDate instanceof Date);
  assert(endDate instanceof Date);
  assert(startDate < endDate);
  assert(typeof numberOfTypesUpperBound === 'number');
  assert(VALID_STEP_SIZES.has(stepSize));

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

  /* Create a list of each type. */
  var types = sortedTypeNames.map(JavaType);
  var typeMap = {};
  /* Map full type names to their type. */
  types.forEach(function (type) {
    typeMap[type.name] = type;
  });

  /* Create all cells applicable for display.  */
  var meta = forEachDateLimitsDescending(startDate, endDate, stepSize,
                                         function (start, end) {
    /* This will filter out only the applicable diffs. */
    var lowerIndex = d3.bisectLeft(applicableDiffs, start);
    var upperIndex = d3.bisectRight(applicableDiffs, end);
    var i, diff, type;

    /* For each diff... */
    for (i = lowerIndex; i < upperIndex; i++) {
      diff = applicableDiffs[i];
      type = typeMap[diff.type];
      if (type === undefined) {
        continue;
      }
      type.addDiff(diff, start, end);
    }
  });

  assert(meta.count > 0);
  assert(meta.minDate <= meta.maxDate);

  return {
    types: types,
    numberOfColumns: meta.count,
    minDate: meta.minDate,
    maxDate: meta.maxDate,
    absoluteMinDate: first(data.astDiffs).date,
    absoluteMaxDate: last(data.astDiffs).date,
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
  var count = 0;

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
    count++;
  }

  return {
    /* CurrentEnd is the last start date. */
    minDate: currentEnd,
    maxDate: end,
    count: count
  };
}


/*=== Graph ===*/

function drawGraph(data, width, height) {
  var marginLeft = 150;

  /* Create a scale for the types i.e., the y-axis */
  var yScale = d3.scale.ordinal()
    .domain(data.types.map(function (type) { return type.fullyQualifiedName }))
    .rangeBands([0, height]);

  /* Create a scale for the dates i.e., the x-axis */
  var xScale = d3.time.scale()
    .domain([data.minDate, data.maxDate])
    .range([marginLeft, width]);

  //var cellWidth = cellWidthFromScale(first(first(data.types).cells), xScale);
  var maxCellHeight = yScale.rangeBand() - 2;

  var svg = d3.select('#dna-table').append('svg')
      .attr("width", width)
      .attr("height", height);

  var row = svg.selectAll('.row')
      .data(data.types)
      .enter().append('g')
      .classed('row', true)
      .attr('transform', function (type) {
        return 'translate(0, ' + yScale(type.fullyQualifiedName) + ')';
      })
      .each(createCellsForType);

  row.append('text')
      .classed('type-title', true)
      .attr('y', yScale.rangeBand() / 2)
      .attr('dy', '.22em')
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

    /* Make the addition bar. */
    cell.append('rect')
      .classed('ast-additions', true)
      .attr('width', function (cell) {
        return cellWidthFromScale(cell, xScale);
      })
      /* Bump it down... */
      .attr('transform', 'translate(0, 1)')
      .attr('height', function (cell) {
        var proportion = cell.numberOfAdds / cell.numberOfObservations;
        return proportion * maxCellHeight;
      });

    /* Make the deletion bar. */
    cell.append('rect')
      .classed('ast-deletions', true)
      .attr('width', function (cell) {
        return cellWidthFromScale(cell, xScale);
      })
      /* Bump it down... */
      .attr('transform', function (cell) {
        var proportion = cell.numberOfAdds / cell.numberOfObservations;
        var topHalf = 1 + proportion * maxCellHeight;

        return 'translate(0, ' + topHalf + ')'
      })
      .attr('height', function (cell) {
        var proportion = cell.numberOfDeletions / cell.numberOfObservations;
        return proportion * maxCellHeight;
      });

    cell.append('rect')
      .classed('cell-outline', true)
      .attr('width', function (cell) {
        return cellWidthFromScale(cell, xScale);
      })
      .attr('height', maxCellHeight)
      /* Bump down a pixel. */
      .attr('transform', 'translate(0, 1)');

    /* Mouse Click: Show Cell stats */
    cell.on("click", function(cell_data) {
      var stats = d3.select("#stats-body");
      stats.selectAll('.content').remove();

      var info = stats.append('div')
        .classed('content', true);

      info.append('b')
        .text("Info:");
      info.append('p')
        .text("Additions: " + cell_data.numberOfAdds);
      info.append('p')
        .text("Deletions: " + cell_data.numberOfDeletions);
      info.append('p')
        .text("Authors: " + cell_data.authors.length);

      info.append('br')

      info.append('b')
        .text("Authors:");

      cell_data.authors.forEach(function (author) {
        info.append('p')
          .text(author);
      })

      info.append('br')

      var commit_map = window.preprocessedData.commits;

      info.append('b')
        .text("Commits:");

      cell_data.commits.forEach(function (commitID) {
        var commit = commit_map[commitID];
        info.append('p')
          .text("Commit ID: " + commit.commitID);
        var block = info.append('div')
          .style('padding-left', '5em');
        block.append('p')
          .text("Author: " + commit.author);
        block.append('p')
          .text("Date: " + commit.date);
        block.append('p')
          .text("Message: ");

        var msg_block = block.append('div')
          .style('padding-left', '5em');

        var lines = commit.message.split("\n");
        lines.forEach(function (line) {
          msg_block.append('p')
          .text(line);
        });
        
        info.append('br')
      })
    });

    /* Mouse over: Show and update cell info */
    cell.on("mouseover", function(cell_data) {
      cellInfo.selectAll('ul').remove();
      var info = cellInfo.append('ul')
        .classed('list-group', true);

      info.append('li')
        .classed("list-group-item", true)
        .text("Type: " + cell_data.type);

      info.append('li')
        .classed("list-group-item", true)
        .text("Additions: " + cell_data.numberOfAdds);

      info.append('li')
        .classed("list-group-item", true)
        .text("Deletions: " + cell_data.numberOfDeletions);

      info.append('li')
        .classed("list-group-item", true)
        .text("Authors: " + cell_data.authors.length);

      var coords = d3.mouse(document.body);
      var currentx = coords[0];
      var currenty = coords[1];
      //console.log(currenty)

      //var div_height = cell.node().getBoundingClientRect().height;

      var x = currentx - CELL_INFO_WIDTH/2;

      if (x < 10) x = 10;
      if (x > width - CELL_INFO_WIDTH - 10) x = width - CELL_INFO_WIDTH -10;

      var y = currenty + maxCellHeight + 10;

      cellInfo.style('left', String(x) + "px");
      cellInfo.style('top', String(y) + "px");

      cellInfo.style("visibility", "visible");

      //console.log("over");
    });
    
    /* Mouse move: Update position of cell info */
    cell.on("mousemove", function (cell_data) {
      var coords = d3.mouse(document.body);
      var currentx = coords[0];
      var currenty = coords[1];

      var x = currentx - CELL_INFO_WIDTH/2;

      if (x < 10) x = 10;
      if (x > width - CELL_INFO_WIDTH - 10) x = width - CELL_INFO_WIDTH -10;

      var y = currenty + maxCellHeight + 10;

      cellInfo.style('left', String(x) + "px");
      cellInfo.style('top', String(y) + "px");
    });

    /* Mouse out: Hide cell info */
    cell.on("mouseout", function(cell) {
      cellInfo.style("visibility", "hidden");
      //console.log("out");
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
window.looksLikeAnEmail = looksLikeAnEmail;


function looksLikeAGitSha(thing) {
  if (typeof thing !== 'string') {
    return false;
  }

  return thing.match(/^[0-9a-f]{5,}$/i);
}

/*globals d3, moment*/
