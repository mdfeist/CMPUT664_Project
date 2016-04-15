LATEXMKFLAGS ?= -quiet

# Use xelatex on OS X
ifeq ($(shell uname -s),Darwin)
override LATEXMKFLAGS += -pdf
endif

MAIN = paper.pdf

.PHONY: all
all: $(MAIN)

.PHONY: $(MAIN)
$(MAIN): $(basename $(MAIN)).tex $(wildcard *.bib) document.tex
	latexmk -pdf -bibtex $(LATEXMKFLAGS) $<

.PHONY: clean
clean:
	latexmk -c

.PHONY: watch
watch: LATEXMKFLAGS += -pvc
watch: $(MAIN)

# This only works on Eddie's computer...
bib:
	paperpal export --better-biblatex 'ICSME 2016' autogen.bib

.PHONY: all bib clean watch
