#!/bin/bash

echo $1
cd $1

for d in */ ; do
	bash $CMPUT664_PROJECT/project_stats.sh $d
done