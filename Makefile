all: antlr4.out autogen.bib

antlr4.out: antlr4.tar.gz
	tar xzf $<
	touch $@ # Reset the modification time, to not extract again.

# This only works on Eddie's computer...
.PHONY: autogen.bib
autogen.bib:
	paperpal export --better-biblatex 'ICSME 2016' $@

.PHONY: all
