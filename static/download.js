function getfilesnames(){
        fetch("http://localhost:8080/listOfFiles")
        .then(response => response.json())
        .then(data => createList(data))

    }
    function createList(data){
        console.log(data)
        const ul = document.createElement("ul");
        data.forEach(element => {
            const li = document.createElement("li")
            li.textContent = element.name;
            li.onclick = () => downloadFileById(element.id);
            ul.appendChild(li)
        });
        document.body.appendChild(ul)
    }
    function downloadFileById(fileId) {
        const pin = prompt("Enter the pin code:");
        if (pin !== null) {
            const url = `/download/${fileId}?pin=${encodeURIComponent(pin)}`;
            window.location.href = url;
        }
    }
function InitTable() {
            const table = document.getElementById("tableOfContent");
            table.innerHTML = ""; // clear any existing content
            const tableHeader = ["Name", "Download", "Size"];
            const headerRow = table.insertRow();
            tableHeader.forEach(text => {
                const cell = headerRow.insertCell();
                cell.textContent = text;
            });
        }

        function updateTable(data) {
            const table = document.getElementById("tableOfContent");
            data.forEach(file => {
                const row = table.insertRow();
                row.insertCell().textContent = file.name;
                const downloadCell = row.insertCell();
                downloadCell.onclick = () => downloadFileById(file.id);
                downloadCell.textContent = "Download";
                downloadCell.setAttribute("class", "down")
                row.insertCell().textContent = `${Number(file.size)/1000000} mb`;
            });
        }

window.onload = async () => {
    InitTable();
    const response = await fetch("/listOfFiles");
    const data = await response.json();
    updateTable(data);
};