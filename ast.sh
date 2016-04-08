#!/bin/bash

TIMEOUT='timeout 10s'
if [ `uname -s` == Darwin ]; then
    TIMEOUT=''
fi

if [ ${2: -5} == ".java" ] || [ ${3: -5} == ".java" ]
then
	echo "#STATS_START"
    echo "#FILE1 | $2"
    echo "#FILE2 | $3"
    echo "#TYPE | $1"

	$TIMEOUT java -cp $CMPUT664_PROJECT/gumtree-spoon-ast-diff/target/gumtree-spoon-ast-diff-0.0.3-SNAPSHOT-jar-with-dependencies.jar fr.inria.sacha.spoon.diffSpoon.DiffSpoonImpl $1 $2 $3

	echo "#STATS_END"
fi
