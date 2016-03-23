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

if [ ! -d "$CMPUT644_PROJECT/tmp" ]; then
	mkdir $CMPUT644_PROJECT/tmp
fi

git log --reverse --date=iso8601 --format="%H %aE %ad" | while read line
do
	stringarray=($line)

	commit=${stringarray[0]}
	author=${stringarray[1]}
	date=${stringarray[2]}
	t=${stringarray[3]}
	timeZone=${stringarray[4]}

	# Check if merge commit
	FOUND=false
	while read no_merge
	do
		if [ "$commit" = "$no_merge" ]; then
			FOUND=true
			break
		fi
	done < <(git log --reverse --no-merges --format="%H")

	if [ "$FOUND" = false ]; then
		continue
	fi
	
	echo "#COMMIT_START"
	echo "#AUTHOR | $author"
	echo "#DATE | $date $t $timeZone"
	echo "#COMMIT_ID | $commit"
	echo "#COMMIT_MESSAGE_START"
	git log --format=%B -n 1 $commit
	echo "#COMMIT_MESSAGE_END"
	echo "#FILES_TOUCHED_START"
	git show --pretty="format:" --name-only $commit | sed -n '1!p'
	echo "#FILES_TOUCHED_END"

	# Git Diff
	git difftool -y --tool=gumtree_cmp --dir-diff=$CMPUT644_PROJECT/tmp $commit $commit^1 2>/dev/null

	# IF commit has no parent
	if [ $? -ne 0 ]; then
		git show --pretty="format:" --name-only $commit | while read file
		do
			if [[ $file == *".java"* ]]
			then
			  fname=${commit: -5}_${file##*/}
			  git show $commit:$file > $CMPUT644_PROJECT/tmp/$fname
			  bash $CMPUT644_PROJECT/ast.sh one $CMPUT644_PROJECT/tmp/$fname /dev/null
			fi
		done
	fi

	echo "#COMMIT_END"
done


echo "#PROJECT_END"

cd ..
