async function analyzeImage(file) {

    return new Promise((resolve, reject) => {

        const img = new Image();

        const url = URL.createObjectURL(file);

        img.onload = () => {

            resolve({
                width: img.width,
                height: img.height
            });

            URL.revokeObjectURL(url);

        };

        img.onerror = () => {

            URL.revokeObjectURL(url);

            reject("Unable to read image.");

        };

        img.src = url;

    });

}
