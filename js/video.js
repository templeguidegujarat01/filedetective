async function analyzeVideo(file) {

    return new Promise((resolve, reject) => {

        const video = document.createElement("video");

        const url = URL.createObjectURL(file);

        video.preload = "metadata";

        video.onloadedmetadata = () => {

            resolve({
                width: video.videoWidth,
                height: video.videoHeight,
                duration: video.duration
            });

            URL.revokeObjectURL(url);

        };

        video.onerror = () => {

            URL.revokeObjectURL(url);

            reject("Unable to read video.");

        };

        video.src = url;

    });

}
