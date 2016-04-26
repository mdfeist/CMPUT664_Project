DIAGRAMS = Antlr4-GH-Lines-ParserATNSimulator \
		   antlr4-code-freq \
		   antlr-density \
		   bookkeeper_dep \
		   chord \
		   commits_view \
		   context \
		   data-extracted \
		   ParserATNSimulator \
		   tika-density



all: $(addsuffix .eps,$(DIAGRAMS))


# Inkscape, no GUI
INKSCAPE = inkscape -z
# Exports the entire page
EPS_OPTS = --export-ignore-filters \
		   --export-text-to-path \
		   --export-background=white \
		   --export-background-opacity=0.0 \
		   --export-use-hints

%.eps: %.svg
	$(INKSCAPE) $(EPS_OPTS) --export-eps=$@ $<
