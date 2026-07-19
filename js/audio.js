async function analyzeAudio(file) {

    return new Promise((resolve, reject) => {

        const audio = document.createElement("audio");

        const url = URL.createObjectURL(file);

        audio.preload = "metadata";

        audio.onloadedmetadata = () => {

            resolve({
                duration: audio.duration
            });

            URL.revokeObjectURL(url);

        };

        audio.onerror = () => {

            URL.revokeObjectURL(url);

            reject("Unable to read audio.");

        };

        audio.src = url;

    });

}
