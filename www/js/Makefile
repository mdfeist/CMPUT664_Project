index.js: $(wildcard *.ts) tsconfig.json typings
	tsc

typings: typings.json
	typings install

.PHONY: watch
watch:
	tsc --watch
