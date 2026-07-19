function analyzePDF(file) {

    return {
        name: file.name,
        sizeKB: (file.size / 1024).toFixed(2)
    };

}
