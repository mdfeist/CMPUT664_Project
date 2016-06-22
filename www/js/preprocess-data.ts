import ASTDiff from './ast-diff';

import assert from './assert';

export interface PreprocessedData {
  typeNames: Set<string>;
  commits: CommitMap;
  astDiffs: ASTDiff[];
};

/**
 * Converts the raw data delivered by the JSON endpoint to something more
 * useful and malleable in JavaScript.
 *
 * This includes return ASTDiffs.
 */
export default function preprocessData(data: Project): PreprocessedData {
  /* Leaving these type assertions here so that we can validate the JSON. */
  assert(data.types instanceof Array);
  assert(data.commits instanceof Array);
  assert(data.dates instanceof Array);

  /* A set of type names */
  var typeNames = new Set(data.types);
  /* Mapping GitSha -> Commit Metadata. */
  var commits = createCommitMap(objectifyDates(data.commits));

  return {
    typeNames,
    commits,
    /* A copy of AST Diff data, in asscending order of date. */
    astDiffs: createASTDiffsInAscendingOrder(data.dates, commits)
  };
}

/**
 * Ensure each commit has a proper Date object.
 */
function objectifyDates(commits: CommitFromJSON[]): Commit[] {
  for (let commit of commits) {
    commit.date = new Date(commit.date as string);
  }
  return commits as Commit[];
}

/* Maps Git SHA to the raw commit data. */
function createCommitMap(commits: Commit[]) {
  var commitMap: CommitMap = {};

  commits.forEach(function (commit) {
    var sha = commit.commitID;
    assert(looksLikeAGitSha(sha));
    commitMap[sha] = commit;
  });

  return commitMap;
}

/* Returns AST Diff data, in asscending order of date. */
function createASTDiffsInAscendingOrder(astDiffsByType: Edit[], commits: CommitMap) {
  return <ASTDiff[]> astDiffsByType
    .map(ASTDiff.withCommitMap.bind(ASTDiff, commits))
    /* Note: unary + coerces to smallint using Date#valueOf() */
    /* See explanation in Cell#isAcceptableDiff(). */
    .sort((a: ASTDiff, b: ASTDiff) => d3.ascending(+a.date, +b.date));
}

/*=== Predicates used in assertions and checks ===*/

function looksLikeAGitSha(thing: any): boolean {
  if (typeof thing !== 'string') {
    return false;
  }

  return !!thing.match(/^[0-9a-f]{5,}$/i);
}
/*global d3*/
