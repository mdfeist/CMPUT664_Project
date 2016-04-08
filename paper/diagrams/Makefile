all: $(subst .raw,,$(wildcard *.svg.raw))

%.svg: %.svg.raw
	python3 embed-styles.py $< $@
