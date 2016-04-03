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
  /* Plop this in dna-table div */
  var dnaTable = document.getElementById('dna-table');
  var statTable = document.getElementById('stats-table');

  /* Clear previous table */
  dnaTable.innerHTML = "";
  statTable.innerHTML = "";

  var processed = window.preprocessedData;
  var data = window.filteredData = filterTypes(processed, filter);
  drawGraph(data, dnaTable.offsetWidth);
  drawStats(data, statTable.offsetWidth);

  return data;
}


/*=== Classes ===*/

/**
 * Class: ASTDiff
 *
 * Instantiated with an original data object.
 */
function ASTDiff(original, commit) {
  var date = new Date(original.date);
  /* The date must be reasonable... */
  assert(typeof original.type === 'string');
  assert(commit.commitID === original.commitID);
  assert(ASTDiff.EDIT_KIND.has(original.edit));

  this.date = date;
  this.type = original.type;
  this.edit = original.edit;
  this._commit = commit;
}

/**
 * Create an ASTDiff using the information in the commit map.
 * A commit map maps the Git SHA to the commit contents themselves.
 */
ASTDiff.withCommitMap = function (commits, diff) {
  return new ASTDiff(diff, commits[diff.commitID])
};

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
   * Get the raw commit info.
   */
  commit: {
    get: function () {
      return this._commit;
    }
  },

  /**
   * The Git commit ID.
   */
  sha: {
    get: function () {
      return this._commit.commitID;
    },
    enumerable: true
  },

  /**
   * The commit's author.
   */
  author: {
    get: function () {
      return this._commit.author;
    },
    enumerable: true
  },

  /**
   * Files modified in this commit.
   */
  filesModified: {
    get: function () {
      return this._commit.files;
    }
  },

  /**
   * All files present at this point in time.
   */
  allFiles: {
    get: function () {
      return this._commit.all_files;
    }
  },

  /**
   * Log message of the commit associated with this ASTDiff.
   */
  commitMessage: {
    get: function () {
      return this._commit.message;
    },
    enumerable: true
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
  },
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
 * Note: There probably should be a JavaEntity,
 * with methods having a JavaType parent, and JavaType arguments;
 * and for there to be a DataEntry class that contains cells. But that sounds
 * like too much effort.
 *
 * Create an array of these and you get a y-axis!
 */
function JavaType(name) {
  /* Instantiate a new Cell object if called without `new`. */
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
    this.className += "<" + generics_components[1];
  }

  this.cells = [];
};

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
   * The short name is simply the class name, plus its arguments, if they
   * exist.
   */
  shortName: {
    get: function () {
      if (this.methodName) {
        return this.className + '#' + this.methodName;
      }
      return this.className;
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

  /**
   * Returns the number of commits in the largest cell.
   */
  numberOfObservationsInLargestCell: {
    get: function () {
      if (this._largest) {
        return this._largest;
      }

      /* Calculate it! */
      var maxCell = d3.max(this.cells, function (cell) {
        return cell.numberOfObservations;
      });

      this._largest = maxCell;
      return this._largest;
    }
  },

  /**
   * toString() will simply return the fully-qualified name.
   */
  toString: {
    value: function () {
      return this.fullyQualifiedName;
    }
  }
});


/**
 * Class: TimeSlice
 * A slice of time, with a start date and an end date.
 * Contains file coverage and
 *
 * Create an array of these and you get an x-axis!
 */
function TimeSlice(start, end) {
  assert(start instanceof Date);
  assert(end instanceof Date);
  this.startDate = start;
  this.endDate = end;

  this._diffs = [];
  this._fileCoverageCache = {};
  this._typeCoverageCache = {};
}

Object.defineProperties(TimeSlice.prototype, {
  /**
   * Add a diff. This carries:
   *  - an author
   *  - a commit
   *  - files
   */
  addDiff: {
    value: function (diff) {
      assert(diff instanceof ASTDiff);
      this._diffs.push(diff);
    }
  },

  /**
   * Determines **average** file coverage per commits.
   * That is, how many files have been touched per commit for all the files
   * covered in the project.
   */
  averageFileCoverage: {
    get: function () {
      throw new Error('Not implemented');
    },
  },

  /**
   * Determines how many files out of all files available an author used.
   */
  averageTypeCoverage: {
    value: function () {
      throw new Error('Not implemented');
    },
  },

  /**
   * Determines how many files out of all files available in a commit that an
   * author used.
   */
  averageFileCoverageForAuthor: {
    value: function (authorName) {
      /* Return cached value. */
      if (authorName in this._fileCoverageCache) {
        return this._fileCoverageCache[authorName];
      }

      /* d3.mean() returns undefined if there are no commits. */
      var result = d3.mean(this._diffsByAuthor(authorName), (diff) => {
        return diff.filesModified.length / diff.allFiles.length;
      });

      return this._fileCoverageCache[authorName] = result || 0.0;
    },
  },

  /**
   * Determines how many types out of all types available an author used.
   */
  averageTypeCoverageForAuthor: {
    value: function (types, authorName) {
      /* Return cached value. */
      if (authorName in this._typeCoverageCache) {
        return this._typeCoverageCache[authorName];
      }

      assert(types instanceof Array, 'Types should be an array of types.');
      assert(typeof authorName === 'string');

      var typesTouched = d3.set();
      this._diffsByAuthor(authorName).forEach((diff) => {
        typesTouched.add(diff.type)
      });

      return this._typeCoverageCache[authorName] = typesTouched.size() / types.length;
    },
  },

  /**
   * Returns JUST the diffs, made by the given author name.
   */
  _diffsByAuthor: {
    value: function (authorName) {
      return this._diffs.filter((diff) => diff.author === authorName);
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

  /* A set of types. */
  var types = d3.set(data.types)
  /* Mapping GitSha -> Commit Metadata. */
  var commits = createCommitMap(data.commits);

  return {
    types,
    commits,
    /* A copy of AST Diff data, in asscending order of date. */
    astDiffs: createASTDiffsInAscendingOrder(data.dates, commits)
  };
}

/* Maps Git SHA to the raw commit data. */
function createCommitMap (commits) {
  var commitMap = {};

  commits.forEach(function (commit) {
    var sha = commit.commitID;
    assert(looksLikeAGitSha(sha));
    commitMap[sha] = commit;
  });

  return commitMap;
}

/* Returns AST Diff data, in asscending order of date. */
function createASTDiffsInAscendingOrder(astDiffsByType, commits) {
  return astDiffsByType
    .map(ASTDiff.withCommitMap.bind(ASTDiff, commits))
    /* Note: unary + coerces to smallint using Date#valueOf() */
    /* See explanation in Cell#isAcceptableDiff(). */
    .sort((a, b) => d3.ascending(+a.date, +b.date));
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
  var sortedTypeNames = Object.keys(typesPresent)
    .sort((a, b) => d3.descending(typesPresent[a], typesPresent[b]))
    .slice(0, numberOfTypesUpperBound);

  assert(sortedTypeNames.length > 0);

  /* Create a list of each type. */
  var types = sortedTypeNames.map(JavaType);
  var typeMap = {};
  /* Map full type names to their type. */
  types.forEach(function (type) {
    typeMap[type.name] = type;
  });

  /* Data gets appended in addDataForTimeSlice(). */
  var timeslices = [];
  var authorsSeen = d3.set();

  /* Create all cells applicable for display.  */
  var meta = forEachTimeSliceDescending(startDate, endDate, stepSize,
                                         addDataForTimeSlice);
  assert(meta.count > 0);
  assert(meta.minDate <= meta.maxDate);

  return {
    /* Filtered types. */
    types,
    /* All types, without arbitrary filtering or sorting. */
    allTypes: Object.keys(typesPresent),
    timeslices,
    /* The authors selected and seen. */
    authors: authorsSeen.values(),
    numberOfColumns: timeslices.length,
    minDate: meta.minDate,
    maxDate: meta.maxDate,
    absoluteMinDate: first(data.astDiffs).date,
    absoluteMaxDate: last(data.astDiffs).date,
  };


  /* The callback to forEachTimeSliceDescending().  Appends data for each
   * type, and data for each timeslice. */
  function addDataForTimeSlice(startDate, endDate) {
    var timeslice = new TimeSlice(startDate, endDate);

    /* This will filter out only the applicable diffs. */
    var lowerIndex = d3.bisectLeft(applicableDiffs, startDate);
    var upperIndex = d3.bisectRight(applicableDiffs, endDate);
    var i, diff, type;

    /* For each applicable diff in the time range... */
    for (i = lowerIndex; i < upperIndex; i++) {
      diff = applicableDiffs[i];
      type = typeMap[diff.type];

      /* The type must exist! */
      if (type === undefined) {
        continue;
      }

      if (authors.length <= 0 || authors.indexOf(diff.author) != -1) {
        type.addDiff(diff, startDate, endDate);
        timeslice.addDiff(diff);
        authorsSeen.add(diff.author);
      }
    }

    timeslices.push(timeslice);
  }
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
function forEachTimeSliceDescending(start, end, step, callback) {
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

function drawGraph(data, width) {
  var marginLeft = 150;
  var cellHeight = 64;
  var height = cellHeight * data.types.length;

  /* Create a scale for the types i.e., the y-axis */
  var yScale = d3.scale.ordinal()
    .domain(data.types.map(function (type) { return type.fullyQualifiedName }))
    .rangeBands([0, height]);

  /* Create a scale for the dates i.e., the x-axis */
  var xScale = d3.time.scale()
    .domain([data.minDate, data.maxDate])
    .range([marginLeft, width]);

  var timeAxis = d3.svg.axis()
    .scale(xScale)
    .orient('bottom');

  //var cellWidth = cellWidthFromScale(first(first(data.types).cells), xScale);
  var maxCellHeight = yScale.rangeBand() - 2;

  var svg = d3.select('#dna-table').append('svg')
      .classed('main-figure', true)
      .attr("width", width)
      .attr("height", height);

  var row = svg.selectAll('.row')
      .data(data.types)
      .enter().append('g')
      .classed('row', true)
      .attr('transform', (type) => `translate(0, ${yScale(type.fullyQualifiedName)})`);

  /* The background. */
  row.append('rect')
      .attr('x', marginLeft)
      .attr('width', width - marginLeft)
      .attr('height', maxCellHeight)
      .style('fill', function (d, i) {
        /* Make alternating colour bands. */
        return i&1 ? '#f4f4f4' : '#fafafa';
      });

  row.each(createCellsForType);

  row.append('text')
      .classed('type-title', true)
      .attr('y', yScale.rangeBand() / 2)
      .attr('dy', '.22em')
      .attr('x', `${marginLeft - 10}px`)
      .attr('text-anchor', 'end')
      .text(function (type) { return type.shortName });

  /* Add the time axis as a **new** SVG element, inserted BEFORE the main SVG
   * element.*/
  var floatingAxis = d3.select('#dna-table').insert('svg', '.main-figure')
      .classed('time-axis', true)
      .attr('width', width)
      /* Note: Height will be set with CSS. */
      .call(timeAxis);

  /* Make all text left-aligned, and bold all the years. */
  floatingAxis.selectAll("text")
      .attr("y", 6)
      .attr("x", 6)
      .style("text-anchor", "start")
      .classed('year-tick', function () {
        /* Matches if the text looks like a year. */
        var text = this.textContent;
        return text.match(/^\d{4,}$/);
      });

  ensureAxisIsAtGraphBottom(svg.node(), floatingAxis.node());

  function createCellsForType(type) {
    /* Create all the cells. */
    var cell = d3.select(this).selectAll('.cell')
      .data(type.cells)
      .enter().append('g')
        /* Only do cool things with cells that *HAVE* data! */
        .filter(function (cell) { return cell.hasData; })
        .classed('cell', true)
        .attr('transform', function (cell) {
          var yOffset = maxCellHeight * (1  - cell.numberOfObservations / type.numberOfObservationsInLargestCell);
          return 'translate(' + xScale(cell.startDate) + ', ' + yOffset + ')';
        });

    /* Make the deletion bar. */
    cell.append('rect')
      .classed('ast-deletions', true)
      .attr('width', function (cell) {
        return cellWidthFromScale(cell, xScale);
      })
      .attr('height', function (cell) {
        var proportion = cell.numberOfDeletions / cell.numberOfObservations;
        var height = cell.numberOfObservations / type.numberOfObservationsInLargestCell;
        return proportion * maxCellHeight * height;
      });

    /* Make the addition bar. */
    cell.append('rect')
      .classed('ast-additions', true)
      .attr('width', function (cell) {
        return cellWidthFromScale(cell, xScale);
      })
      .attr('transform', function (cell) {
        var proportion = cell.numberOfDeletions / cell.numberOfObservations;
        var height = cell.numberOfObservations / type.numberOfObservationsInLargestCell;
        var topHalf = proportion * maxCellHeight * height;

        return 'translate(0, ' + topHalf + ')'
      })
      .attr('height', function (cell) {
        var proportion = cell.numberOfAdds / cell.numberOfObservations;
        var height = cell.numberOfObservations / type.numberOfObservationsInLargestCell;
        return proportion * maxCellHeight * height;
      });

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
      /* TODO: Graphs here! */
      info.append('p')
        .text("Authors: " + cell_data.authors.length);
      info.append('p')
        .text("Commits: " + cell_data.commits.length);

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

      info.append('li')
        .classed("list-group-item", true)
        .text("Commits: " + cell_data.commits.length);

      info.append('li')
        .classed("list-group-item", true)
        .text("Start Date: " + cell_data.startDate);
      info.append('li')
        .classed("list-group-item", true)
        .text("End Date: " + cell_data.endDate);

      var coords = d3.mouse(document.body);
      var currentx = coords[0];
      var currenty = coords[1];

      var x = currentx - CELL_INFO_WIDTH/2;

      if (x < 10) x = 10;
      if (x > width - CELL_INFO_WIDTH - 10) x = width - CELL_INFO_WIDTH -10;

      var y = currenty + maxCellHeight + 10;

      cellInfo.style('left', String(x) + "px");
      cellInfo.style('top', String(y) + "px");

      cellInfo.style("visibility", "visible");
    });

    /* Mouse move: Update position of cell info */
    cell.on("mousemove", function (_cell_data) {
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
    cell.on("mouseout", function(_cell) {
      cellInfo.style("visibility", "hidden");
    });
  }
}

/**
 * Draws type coverage stats and things.
 */
function drawStats(/*data, width*/) {
  /*
  var marginLeft = 150;
  var rowHeight = 64;
  */

  /* Create a scale for the dates i.e., the x-axis */
    /*
  var xScale = d3.time.scale()
    .domain([data.minDate, data.maxDate])
    .range([marginLeft, width]);

  var timeAxis = d3.svg.axis()
    .scale(xScale)
    .orient('bottom');

  var svg = d3.select('#stats-table').append('svg')
      .classed('main-figure', true)
      .attr("width", width)
      .attr("height", rowHeight)
    */

  /* TODO: Make columns */
  /*
  var typeBar = svg.selectAll('.type-bar')
        .data(d3.range(data.timeSlices))
      .enter().append('g')
        .classed('type-bar', true);

  typeBar.append('text')
      .classed('type-title', true)
      .attr('y', yScale.rangeBand() / 2)
      .attr('dy', '.22em')
      .attr('x', `${marginLeft - 10}px`)
      .attr('text-anchor', 'end')
      .text(function (type) { return type.shortName });
      */
}


/**
 * Creates a link
 */
window.makeCSVLink = function makeCSVLink(data) {
  var lines = [];
  addRow('Metric', 'Author', 'Date', 'Coverage');

  data.timeslices.forEach(function (timeslice) {
    data.authors.forEach(function (authorName) {
      addRow(
        'line',
        authorName,
        timeslice.startDate,
        timeslice.averageFileCoverageForAuthor(authorName)
      );
      addRow(
        'type',
        authorName,
        timeslice.startDate,
        timeslice.averageTypeCoverageForAuthor(data.types, authorName)
      );
    });
  });

  function addRow() {
    var i;
    for (i = 0; i < arguments.length; i++) {
      if (/[,"]/.exec(arguments[i]))
        throw new Error('Invalid char in:' + arguments[i]);
    }
    lines.push(Array.prototype.join.call(arguments, ','));
    lines.push('\n');
  }

  var blob = new Blob(lines, {type: 'text/csv'});

  return URL.createObjectURL(blob);

}


/**
 * Places the axis on the bottom of the graph on initial render, when the
 * screen is too big.
 */
function ensureAxisIsAtGraphBottom(graph, axis) {
  assert(graph instanceof SVGElement);
  assert(axis instanceof SVGElement);

  var paddingBottom = 60;
  var bottomOfGraph = graph.getBoundingClientRect().bottom;

  /* when the screen*/
  var shouldReposition = bottomOfGraph + paddingBottom < viewportHeight();

  if (shouldReposition) {
    /* Set to the height. */
    //axis.style.top = graph.getBoundingClientRect().height;;
    axis.classList.add('axis-on-bottom');
  } else {
    axis.classList.add('axis-floating');
  }
}

/**
 * http://stackoverflow.com/a/8876069
 */
function viewportHeight() {
  return Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
}

/*=== Utilties ===*/

function cellWidthFromScale(cell, scale) {
  var bigger = scale(cell.endDate);
  var smaller = scale(cell.startDate);
  assert(bigger > smaller);
  /* Ensure it rounds up to remove horizontal gaps. */
  return Math.ceil(bigger - smaller) + 1;
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
