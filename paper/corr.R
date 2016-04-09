#!/usr/bin/env Rscript

library(ggplot2)

# Antlr
antlr <- read.csv('antlr.csv')
# Turn the Unix Timestamps (in MS) to R dates.
antlr$Date <- as.Date(as.POSIXct(antlr$Date / 1000, 'UTC', origin="1970-01-01"))

with(antlr, {
    file.cov <- antlr[antlr$Metric == 'file',]
    type.cov <- antlr[antlr$Metric == 'type',]

    # Get significance tests
    print("[antlr] Wilcoxon")
    print(wilcox.test(type.cov$Coverage, file.cov$Coverage)$p.value)

    # Get correlations
    print("[antlr] Pearson (linear) correlation")
    print(cor(type.cov$Coverage, file.cov$Coverage, method = "pearson"))
    print("[antlr] Spearman (rank) correlation")
    print(cor(type.cov$Coverage, file.cov$Coverage, method = "spearman"))

    d.type <- density(type.cov$Coverage)
    d.file <- density(file.cov$Coverage)

    ggplot(antlr, aes(antlr$Coverage, colour = antlr$Metric, fill =
                      antlr$Metric)) +
     geom_density(alpha = 0.4, size = 1) +
     labs(x = "Coverage for Antlr4", y = "Density",
          colour = "Metric", fill = "Metric")

})

rm(antlr)


# Tika
tika <- read.csv('tika.csv')
# Turn the Unix Timestamps (in MS) to R dates.
tika$Date <- as.Date(as.POSIXct(tika$Date / 1000, 'UTC', origin="1970-01-01"))

with(tika, {
    file.cov <- tika[Metric == 'file',]
    type.cov <- tika[Metric == 'type',]

    # Get significance tests
    print("[tika] Wilcoxon")
    print(wilcox.test(type.cov$Coverage, file.cov$Coverage)$p.value)

    # Get correlations
    print("[tika] Pearson (linear) correlation")
    print(cor(type.cov$Coverage, file.cov$Coverage, method = "pearson"))
    print("[tika] Spearman (rank) correlation")
    print(cor(type.cov$Coverage, file.cov$Coverage, method = "spearman"))

    #d.type <- density(type.cov$Coverage)
    #d.file <- density(file.cov$Coverage)

    ggplot(tika, aes(tika$Coverage, colour = tika$Metric, fill =
                      tika$Metric)) +
     geom_density(alpha = 0.4, size = 1) +
     labs(x = "Coverage for Apache Tika", y = "Density",
          colour = "Metric", fill = "Metric")
})
rm(tika)


bookkeeper <- read.csv('bookkeeper.csv')
# Turn the Unix Timestamps (in MS) to R dates.
bookkeeper$Date <- as.Date(as.POSIXct(bookkeeper$Date / 1000, 'UTC', origin="1970-01-01"))

with(bookkeeper, {
    file.cov <- bookkeeper[Metric == 'file',]
    type.cov <- bookkeeper[Metric == 'type',]

    # Get significance tests
    print("[bookkeeper] Wilcoxon")
    print(wilcox.test(type.cov$Coverage, file.cov$Coverage)$p.value)

    # Get correlations
    print("[bookkeeper] Pearson (linear) correlation")
    print(cor(type.cov$Coverage, file.cov$Coverage, method = "pearson"))
    print("[bookkeeper] Spearman (rank) correlation")
    print(cor(type.cov$Coverage, file.cov$Coverage, method = "spearman"))

    d.type <- density(type.cov$Coverage)
    d.file <- density(file.cov$Coverage)
})


curator <- read.csv('curator.csv')
# Turn the Unix Timestamps (in MS) to R dates.
curator$Date <- as.Date(as.POSIXct(curator$Date / 1000, 'UTC', origin="1970-01-01"))

with(curator, {
    file.cov <- curator[Metric == 'file',]
    type.cov <- curator[Metric == 'type',]

    # Get significance tests
    print("[curator] Wilcoxon")
    print(wilcox.test(type.cov$Coverage, file.cov$Coverage)$p.value)

    # Get correlations
    print("[curator] Pearson (linear) correlation")
    print(cor(type.cov$Coverage, file.cov$Coverage, method = "pearson"))
    print("[curator] Spearman (rank) correlation")
    print(cor(type.cov$Coverage, file.cov$Coverage, method = "spearman"))

    d.type <- density(type.cov$Coverage)
    d.file <- density(file.cov$Coverage)
})


#parrt <- antlr[antlr$Author == 'parrt <parrt@antlr.org>',]
#file.cov <- parrt[parrt$Metric == 'file',]
#type.cov <- parrt[parrt$Metric == 'type',]

# Coverage for the top contributor.
#plot(file.cov$Date, file.cov$Coverage / 100, col="red")
#points(type.cov$Date, type.cov$Coverage / 100, col="blue")

# Plot stuff.
#plot(file.cov$Date, file.cov$Coverage,
#     col="red",
#     main="Coverage for Terence Parr in ",
#     xlab="Commit date", ylab="Cumulative Coverage (proportion)")
#points(type.cov$Date, type.cov$Coverage,
#       col="blue")
