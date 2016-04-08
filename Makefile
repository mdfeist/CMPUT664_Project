GUMTREE = gumtree-spoon-ast-diff/target/gumtree-spoon-ast-diff-0.0.3-SNAPSHOT-jar-with-dependencies.jar

all: antlr4.out $(GUMTREE)
	@printf '\033[1;35m'
	@echo 'Type `make get-deps` to install Flask system-wide.'
	@echo 'virutalenv recommended: https://virtualenv.pypa.io/en/latest/'
	@printf '\033[m'

# This only works on Eddie's computer...
bib:
	paperpal export --better-biblatex 'ICSME 2016' autogen.bib

get-deps:
	pip install -r requirements.txt

# Compile GumTree
$(GUMTREE):
	cd gumtree-spoon-ast-diff && mvn install -DskipTests

antlr4.out: antlr4.tar.gz
	tar xzf $<
	touch $@ # Reset the modification time, to not extract again.

.PHONY: all bib build get-deps
