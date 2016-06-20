# TypeV

AST-powered software repository analytics and visualization for Java.

## Installing

Just try `make` and see what happens! If not, ensure you have the
following:

#### AST Diff

 * git
 * Java 1.7+
 * Maven 2+

#### Web Server

 * Python 3.x
     - pip

### Web Application

 * Node 4.0+ 
     - `typescript` and `typings` (`npm install -g typescript typings`)

### Installing the AST Diff

Type `make` in the repository root. Test with `make test`.

You will need to export `$TYPEV_PATH` as the directory where this
repository is located. If you're using Bash on OS X, you can simply do
this to export the environment variable when you open up a new terminal:

```sh
echo "export TYPEV_PATH=$(pwd)" >> ~/.bash_profile
```

To let Git know how to use the AST Diff, add this to `~/.gitconfig`:

    [difftool "gumtree_cmp"]
    cmd = bash $TYPEV_PATH/ast.sh cmp $LOCAL $REMOTE

### Installing the server

The Python server requires Flask. It's recommend to use a virtualenv (if
you already have experience with virtualenvs), but it's easy enough to
install Flask globally as well:

    make get-deps

or:

    pip install -r requirements.txt

### Building the web application

With [TypeScript][] and [Typings][] installed, go in to the `www/js/`
directory and simply install the typings and compile as so:

```sh
typings install && tsc
```

[typescript]: https://www.typescriptlang.org/
[typings]: https://github.com/typings/typings

# Usage

### AST Diff

To compute the AST diff of a repository.

    test "$TYPEV_PATH" != '' && ./project_stats.sh path/to/git/repo > ast-output.out

### Web Server

Ensure you've activated the proper virtualenv (if you're using
virtualenv) and simply type:

    python server.py

This will start the web server listening on <http://localhost:5000/>.

# License

The Python server, the web frontend, the modifications made to
Spoon-GumTree, and all associated scripts are under the following
license:

     Copyright 2016 Michael D. Feist, Eddie Antonio Santos, Ian Watts,
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
