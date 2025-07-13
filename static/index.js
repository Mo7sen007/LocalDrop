function InitTable() {
            const table = document.getElementById("tableOfContent");
            table.innerHTML = ""; // clear any existing content
            const tableHeader = ["Name", "Delete", "ID"];
            const headerRow = table.insertRow();
            tableHeader.forEach(text => {
                const cell = headerRow.insertCell();
                cell.textContent = text;
            });
        }

        async function updateTable(data) {
            const table = document.getElementById("tableOfContent");
            data.forEach(file => {
                const row = table.insertRow();
                row.insertCell().textContent = file.name;
                const DeletCell = row.insertCell();
                DeletCell.onclick = async () =>  {
                    await deleteById(file.id);
                    const res = await fetch("/listOfFiles");
                    const updatedData = await res.json();
                    InitTable();
                    updateTable(updatedData);

                }
                DeletCell.textContent = "Delete";
                DeletCell.setAttribute("class","down");

                row.insertCell().textContent = file.id;
                
            });
        }

        // Intercept the form submission
document.getElementById("uploadForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const form = document.getElementById("uploadForm");
    const formData = new FormData(form);
    const newName = formData.get("fileName");
    const uploadedFile = formData.get("file");
    
    // Extract the extension from the actual file being uploaded
    const ext = uploadedFile.name.split(".").pop();
    const fullName = newName + "." + ext;

    // Fetch existing files to check for duplicates
    let listRes = await fetch("/listOfFiles");
    let listData = await listRes.json();
    let duplicate;
    if(listData ===null){
        duplicate = false
        
    }else{
        duplicate = listData.some(file => file.name === fullName);
    }

    if (duplicate) {
        alert(`A file named "${fullName}" already exists. Please choose another name.`);
        return;
    }

    // Proceed with upload
    const response = await fetch("/upload", {
        method: "POST",
        body: formData
    });

    if (response.ok) {
        alert(await response.text());
        listRes = await fetch("/listOfFiles");
        listData = await listRes.json();
        document.getElementById("tableOfContent").innerHTML = "";
        InitTable();
        console.log(listData)
        updateTable(listData);
    } else {
        alert("Upload failed.");
    }
});


        // Initial table load
        window.onload = async () => {
            InitTable();
            const response = await fetch("/listOfFiles");
            const data = await response.json();
            updateTable(data);
        };
async function deleteById(id){
    const response = await fetch(`delete/${id}`)
    const data = await response.text();
    console.log(data)
}

function checkName(name,names){
    return names.indexOf(name)
}
        