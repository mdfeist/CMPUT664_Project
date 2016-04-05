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

if [ ! -d "$CMPUT664_PROJECT/tmp" ]; then
	mkdir $CMPUT664_PROJECT/tmp
fi

git log --reverse --date=iso8601 --format="%H;%ad;%aN;%aE" | while read line
do
	IFS=';' read -a stringarray <<< "$line"

	commit=${stringarray[0]}
	date=${stringarray[1]}
	name=${stringarray[2]}
	email=${stringarray[3]}
	
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

	# Skip large commits as probably not authors work
#	FILE_COUNT=0
#	while read no_merge
#	do
#		FILE_COUNT=$[$FILE_COUNT +1]
#	done < <(git show --pretty="format:" --name-only $commit | sed -n '1!p')
#
#	if [ $FILE_COUNT -gt 20 ]; then
#		continue
#	fi
	
	echo "#COMMIT_START"
	echo "#AUTHOR | $name <$email>"
	echo "#DATE | $date"
	echo "#COMMIT_ID | $commit"
	echo "#COMMIT_MESSAGE_START"
	git --no-pager log --format=%B -n 1 $commit
	echo "#COMMIT_MESSAGE_END"
	echo "#FILES_TOUCHED_START"
	git show --pretty="format:" --name-only $commit | sed -n '1!p'
	echo "#FILES_TOUCHED_END"
	echo "#FILES_START"
	git ls-tree -r --name-only $commit
	echo "#FILES_END"

	# Git Diff
	git difftool -y --tool=gumtree_cmp $commit^1 $commit 2>/dev/null
	# IF commit has no parent
	if [ $? -gt 1 ]; then
		#echo "############################### FIRST COMMIT ###############################"
		git show --pretty="format:" --name-only $commit | while read file
		do
			if [[ $file == *".java"* ]]
			then
			  fname=${commit: -5}_${file##*/}
			  git show $commit:$file > $CMPUT664_PROJECT/tmp/$fname
			  bash $CMPUT664_PROJECT/ast.sh one $CMPUT664_PROJECT/tmp/$fname /dev/null
			fi
		done
	fi

	echo "#COMMIT_END"
done


echo "#PROJECT_END"

cd ..
