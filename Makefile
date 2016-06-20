AST_OUTDIR = ast-output
GUMTREE = gumtree-spoon-ast-diff/target/gumtree-spoon-ast-diff-0.0.3-SNAPSHOT-jar-with-dependencies.jar
OUTPUTS = $(AST_OUTDIR)/antlr4.out
WEBAPP = www/js/index.js

all: $(OUTPUTS) $(GUMTREE) $(WEBAPP)
	@printf '\033[1;35m'
	@echo 'Type `make get-deps` to install Flask system-wide.'
	@echo 'virutalenv recommended: https://virtualenv.pypa.io/en/latest/'
	@printf '\033[m'

# Install Python dependencies.
get-deps:
	pip install -r requirements.txt

test: tests
	@test '$(TYPEV_PATH)' != '' || (echo 'Must set TYPEV_PATH environment variable!' && false)
	sh get_stats.sh $<

# Updates the tar archive with the test Git repository.
update-archive:
	tar -czvf tests.tar.gz tests

#### Real Targets ####

# Compile GumTree
$(GUMTREE):
	cd gumtree-spoon-ast-diff && mvn install -DskipTests

# Compile the webapp:
$(WEBAPP):
	@which tsc > /dev/null || printf "Must install typescript\n\tnpm install -g typescript"
	@which typings > /dev/null || printf "Must install typings\n\tnpm install -g typings"
	$(MAKE) -C $(dir $(word 1,$(WEBAPP)))

#### Pattern rules ####

# How to unextract a .out file from a gzipped tarball.
%.out: %.tar.gz
	tar -xzC $(AST_OUTDIR) -f $<
	touch $@ # Reset the modification time, to not extract again.

# How to unextract a directory that was tar'd and gzip'd.
%: %.tar.gz
	tar -xvzf $<
	touch $@ # Reset the modification time, to not extract again.

.PHONY: all build get-deps update-archive test
