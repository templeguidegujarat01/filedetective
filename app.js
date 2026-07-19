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

    if(file.name.toLowerCase().endsWith(".exe")){
        securityInfo.innerHTML = `
            <p style="color:#EF4444;"><strong>⚠ Executable file detected.</strong></p>
        `;
    }else{
        securityInfo.innerHTML = `
            <p style="color:#22C55E;"><strong>✓ No obvious warning detected.</strong></p>
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

        <textarea readonly
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
    
}
