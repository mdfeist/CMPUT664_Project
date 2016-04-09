AST_OUTDIR = ast-output
GUMTREE = gumtree-spoon-ast-diff/target/gumtree-spoon-ast-diff-0.0.3-SNAPSHOT-jar-with-dependencies.jar
OUTPUTS = $(AST_OUTDIR)/antlr4.out

all: $(OUTPUTS) $(GUMTREE)
	@printf '\033[1;35m'
	@echo 'Type `make get-deps` to install Flask system-wide.'
	@echo 'virutalenv recommended: https://virtualenv.pypa.io/en/latest/'
	@printf '\033[m'

get-deps:
	pip install -r requirements.txt

# Compile GumTree
$(GUMTREE):
	cd gumtree-spoon-ast-diff && mvn install -DskipTests

%.out: %.tar.gz
	tar -xzC $(AST_OUTDIR) -f $<
	touch $@ # Reset the modification time, to not extract again.

.PHONY: all build get-deps
