# TypeV

Setting up AST tool:

Export `$CMPUT664_PROJECT` as the directory where this repository is
located.

In `~/.gitconfig`:

    [difftool "gumtree_cmp"]
    cmd = bash $CMPUT664_PROJECT/ast.sh cmp $LOCAL $REMOTE

# License

The Python server, the web frontend, the modifications made to
Spoon-GumTree, and all associated scripts are under the following
license:

       Copyright 2016 Micheal D. Feist, Eddie Antonio Santos, Ian Watts,
       Abram Hindle.

       Licensed under the Apache License, Version 2.0 (the "License");
       you may not use this file except in compliance with the License.
       You may obtain a copy of the License at

           http://www.apache.org/licenses/LICENSE-2.0

       Unless required by applicable law or agreed to in writing, software
       distributed under the License is distributed on an "AS IS" BASIS,
       WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
       See the License for the specific language governing permissions and
       limitations under the License.
