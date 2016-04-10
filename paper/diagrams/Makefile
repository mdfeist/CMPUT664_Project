all: $(subst .svg,.eps,$(wildcard *.svg))

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
