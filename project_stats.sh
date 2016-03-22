#!/bin/bash

GIT=".git"

echo "#PROJECT_START"
echo "#PROJECT_NAME | $1"
cd $1

if [ ! -d "$GIT" ]; then
	echo "#ERROR | Not git repository."
	echo "#PROJECT_END"
	cd ..
	exit
fi

last="0"

git log --reverse --date=iso8601 --format="%H %aE %ad" | while read line
do
	#echo "$commit"
	stringarray=($line)

	commit=${stringarray[0]}
	author=${stringarray[1]}
	date=${stringarray[2]}
	t=${stringarray[3]}
	timeZone=${stringarray[4]}

	echo "#COMMIT_START"
	echo "#AUTHOR | $author"
	echo "#DATE | $date $t $timeZone"
	
	if [ "$last" != "0" ]
	then
		echo "#COMMIT | $commit $last"
		git difftool -y --tool=gumtree_cmp $commit $last
	else
		if [ ! -d "$CMPUT644_PROJECT/tmp" ]; then
			mkdir $CMPUT644_PROJECT/tmp
		fi

		echo "#COMMIT | $commit"
		git show --pretty="format:" --name-only $commit | while read file
		do
			if [[ $file == *".java"* ]]
			then
			  fname=${commit: -5}_${file##*/}
			  git show $commit:$file > $CMPUT644_PROJECT/tmp/$fname
			  bash $CMPUT644_PROJECT/ast.sh one $CMPUT644_PROJECT/tmp/$fname /dev/null
			fi 
			
		done
		#git difftool -y --tool=gumtree $commit
	fi
	echo "#COMMIT_END"

	last="$commit"
done


echo "#PROJECT_END"

cd ..
