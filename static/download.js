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

async function downloadFileById(fileId) {
  try {
    // Call API to check if file has a pin
    const response = await fetch(`/hasPin/${fileId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json(); // { id: ..., has_pin: true/false }

    let pin = "";
    console.log(data.hasPIN)
    if (data.hasPIN) {
      pin = prompt("Enter the pin code:");
      if (pin === null) {
        // user canceled
        return;
      }
    }

    // Trigger download
    const url = `/download/${fileId}?pin=${encodeURIComponent(pin)}`;
    window.location.href = url;
  } catch (err) {
    console.error("Failed to download file:", err);
    alert("Something went wrong while downloading the file.");
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

