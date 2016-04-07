GUMTREE = gumtree-spoon-ast-diff/target/gumtree-spoon-ast-diff-0.0.3-SNAPSHOT-jar-with-dependencies.jar

all: antlr4.out $(GUMTREE)

# This only works on Eddie's computer...
bib:
	paperpal export --better-biblatex 'ICSME 2016' $@

# Compile GumTree
$(GUMTREE):
	cd gumtree-spoon-ast-diff && mvn install -DskipTests

antlr4.out: antlr4.tar.gz
	tar xzf $<
	touch $@ # Reset the modification time, to not extract again.

.PHONY: all bib build
