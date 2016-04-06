#!/usr/bin/env Rscript

antlr <- read.csv('antlr.csv')
file.cov <- antlr[antlr$Metric == 'file',]
type.cov <- antlr[antlr$Metric == 'type',]

# Turn the Unix Timestamps (in MS) to R dates.
antlr$Date <- as.Date(as.POSIXct(antlr$Date / 1000, 'UTC', origin="1970-01-01"))

# Get correlation
print("Pearson (linear) correlation")
cor(type.cov$Coverage, file.cov$Coverage, method = "pearson")
print("Spearman (rank) correlation")
cor(type.cov$Coverage, file.cov$Coverage, method = "spearman")

parrt <- antlr[antlr$Author == 'parrt <parrt@antlr.org>',]
file.cov <- parrt[parrt$Metric == 'file',]
type.cov <- parrt[parrt$Metric == 'type',]

# Coverage for the top contributor.
plot(file.cov$Date, file.cov$Coverage / 100, col="red")
points(type.cov$Date, type.cov$Coverage / 100, col="blue")

# Plot stuff.
plot(file.cov$Date, file.cov$Coverage,
     col="red",
     main="Coverage for Terence Parr in ANTLR",
     xlab="Commit date", ylab="Cumulative Coverage (proportion)")
points(type.cov$Date, type.cov$Coverage,
       col="blue")
