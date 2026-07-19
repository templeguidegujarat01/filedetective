let lastAnalyzedFile = null;
const chooseFileBtn = document.getElementById("chooseFileBtn");
const fileInput = document.getElementById("fileInput");

const generalInfo = document.getElementById("generalInfo");
const securityInfo = document.getElementById("securityInfo");
const metadataInfo = document.getElementById("metadataInfo");
const hashInfo = document.getElementById("hashInfo");

chooseFileBtn.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", (event) => {

    const file = event.target.files[0];

    if (!file) return;

    analyzeFile(file);

});

function analyzeFile(file){

    if(lastAnalyzedFile === file.name){

        return;

    }

    lastAnalyzedFile = file.name;


    console.log("Analyzing file:", file.name);

    const extension =
        file.name.includes(".")
        ? file.name.split(".").pop().toUpperCase()
        : "Unknown";

    generalInfo.innerHTML = `
        <p><strong>Name:</strong> ${file.name}</p>
        <p><strong>Extension:</strong> ${extension}</p>
        <p><strong>Size:</strong> ${(file.size/1024).toFixed(2)} KB</p>
        <p><strong>Type:</strong> ${file.type || "Unknown"}</p>
        <p><strong>Last Modified:</strong> ${new Date(file.lastModified).toLocaleString()}</p>
    `;

    const suspiciousPattern = /\.(jpg|jpeg|png|pdf|doc|docx)\.(exe|bat|cmd|js)$/i;


if(suspiciousPattern.test(file.name)){

    securityInfo.innerHTML = `
        <p style="color:#EF4444;">
        ⚠ Suspicious double extension detected.
        </p>
    `;

}
else if(file.name.toLowerCase().endsWith(".exe")){

    securityInfo.innerHTML = `
        <p style="color:#F59E0B;">
        ⚠ Executable file detected.
        </p>
    `;

}
else{

    securityInfo.innerHTML = `
        <p style="color:#22C55E;">
        ✓ No obvious warning detected.
        </p>
    `;

}

    metadataInfo.innerHTML = `
        <p>Detailed metadata module will be added next.</p>
    `;

    hashInfo.innerHTML = `
        <p>SHA-256 generation will be added next.</p>
    `;

generateSHA256(file).then(hash => {

    hashInfo.innerHTML = `
        <p><strong>SHA-256</strong></p>

        <textarea id="hashValue"
        readonly
        style="
        width:100%;
        min-height:110px;
        margin-top:12px;
        padding:12px;
        border-radius:12px;
        resize:none;
        font-family:monospace;
        ">${hash}</textarea>
    `;

    window.currentHash = hash;

});

if (file.type.startsWith("image/")) {

    analyzeImage(file).then(image => {

        metadataInfo.innerHTML = `
            <p><strong>Width:</strong> ${image.width}px</p>
            <p><strong>Height:</strong> ${image.height}px</p>
            <p><strong>Resolution:</strong> ${image.width} × ${image.height}</p>
        `;

    });

}

if (file.type.startsWith("audio/")) {

    analyzeAudio(file).then(audio => {

        metadataInfo.innerHTML = `
            <p><strong>Duration:</strong> ${audio.duration.toFixed(2)} seconds</p>
        `;

    });

}

if (file.type.startsWith("video/")) {

    analyzeVideo(file).then(video => {

        metadataInfo.innerHTML = `
            <p><strong>Resolution:</strong> ${video.width} × ${video.height}</p>
            <p><strong>Duration:</strong> ${video.duration.toFixed(2)} seconds</p>
        `;

    });

}

if (file.type === "application/pdf") {

    const pdf = analyzePDF(file);

    metadataInfo.innerHTML = `
        <p><strong>PDF File:</strong> ${pdf.name}</p>
        <p><strong>Size:</strong> ${pdf.sizeKB} KB</p>
    `;

}

}

const uploadCard = document.querySelector(".upload-card");


uploadCard.addEventListener("dragover", (e)=>{

    e.preventDefault();

    uploadCard.style.borderColor = "#2563EB";

});


uploadCard.addEventListener("dragleave", ()=>{

    uploadCard.style.borderColor = "rgba(255,255,255,.15)";

});


uploadCard.addEventListener("drop",(e)=>{

    e.preventDefault();


    uploadCard.style.borderColor = "rgba(255,255,255,.15)";


    const file = e.dataTransfer.files[0];


    if(file){

        analyzeFile(file);

    }

});

window.addEventListener("dragover", (e) => {
    e.preventDefault();
});


window.addEventListener("drop", (e) => {
    e.preventDefault();
});

const downloadReportBtn = document.getElementById("downloadReportBtn");


downloadReportBtn.addEventListener("click", ()=>{

    const report = {

        general: generalInfo.innerText,

        security: securityInfo.innerText,

        metadata: metadataInfo.innerText,

        hash: window.currentHash || "Hash generating..."

    };


    console.log("Report Data:", report);

    downloadReport(report);

});
