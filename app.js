const stations = [
"Passau Hbf",
"Tiefenbach",
"Fischhaus",
"Kalteneck",
"Fürsteneck",
"Neuhausmühle",
"Röhrnbach",
"Waldkirchen",
"Freyung"
];

const stationIndex = {};
stations.forEach(function(s,i){ stationIndex[s] = i; });

window.onload = function(){
    document.getElementById("datum").value = new Date().toISOString().split("T")[0];
    fillStations();
    updateStats();

    if("serviceWorker" in navigator){
        navigator.serviceWorker.register("service-worker.js");
    }
};

function fillStations(){
    const e = document.getElementById("einstieg");
    const a = document.getElementById("ausstieg");

    e.innerHTML = '<option value="">Bitte wählen</option>';
    a.innerHTML = '<option value="">Bitte wählen</option>';

    stations.forEach(function(st){
        let o1 = document.createElement("option");
        o1.text = st;
        o1.value = st;
        e.add(o1);

        let o2 = document.createElement("option");
        o2.text = st;
        o2.value = st;
        a.add(o2);
    });
}

function plus(){
    let f = document.getElementById("anzahl");
    f.value = parseInt(f.value || "1") + 1;
}

function minus(){
    let f = document.getElementById("anzahl");
    let v = parseInt(f.value || "1");
    if(v > 1){ f.value = v - 1; }
}

function loadData(){
    return JSON.parse(localStorage.getItem("ilztalbahn_optional_ticket") || "[]");
}

function saveData(data){
    localStorage.setItem("ilztalbahn_optional_ticket", JSON.stringify(data));
}

function savePassenger(){
    const datum = document.getElementById("datum").value;
    const zug = document.getElementById("zugnummer").value.trim();
    let ticket = document.getElementById("ticket").value;
    const anzahl = parseInt(document.getElementById("anzahl").value || "1");
    const einstieg = document.getElementById("einstieg").value;
    const ausstieg = document.getElementById("ausstieg").value;

    if(!ticket){
        ticket = "Nicht angegeben";
    }

    if(!datum || !zug || !einstieg || !ausstieg){
        alert("Bitte Datum, Zugnummer, Einstieg und Ausstieg ausfüllen");
        return;
    }

    if(einstieg === ausstieg){
        alert("Einstieg und Ausstieg dürfen nicht identisch sein");
        return;
    }

    if(isNaN(anzahl) || anzahl < 1){
        alert("Bitte eine gültige Anzahl eingeben");
        return;
    }

    const richtung = stationIndex[einstieg] < stationIndex[ausstieg]
        ? "Passau-Freyung"
        : "Freyung-Passau";

    const data = loadData();

    data.push({
        datum: datum,
        zug: zug,
        ticket: ticket,
        anzahl: anzahl,
        einstieg: einstieg,
        ausstieg: ausstieg,
        richtung: richtung,
        zeit: new Date().toISOString()
    });

    saveData(data);

    document.getElementById("status").innerHTML =
        anzahl + " Fahrgast/Fahrgäste gespeichert: " +
        einstieg + " → " + ausstieg;

    document.getElementById("anzahl").value = 1;
    updateStats();
}

function updateStats(){
    const data = loadData();
    let gesamt = 0;
    let d = 0;
    let b = 0;
    let unknown = 0;

    data.forEach(function(x){
        const n = parseInt(x.anzahl || 1);
        gesamt += n;
        if(x.ticket === "Deutschlandticket"){ d += n; }
        else if(x.ticket === "Bayernticket"){ b += n; }
        else { unknown += n; }
    });

    document.getElementById("gesamt").innerText = gesamt;
    document.getElementById("dticket").innerText = d;
    document.getElementById("bticket").innerText = b;
    document.getElementById("unknownTicket").innerText = unknown;

    renderODMatrix(data);
    renderSections(data);
}

function renderODMatrix(data){
    let html = "<table><tr><th>Einstieg \\ Ausstieg</th>";
    stations.forEach(function(s){ html += "<th>" + s + "</th>"; });
    html += "</tr>";

    stations.forEach(function(start){
        html += "<tr><th>" + start + "</th>";
        stations.forEach(function(end){
            let sum = 0;
            data.forEach(function(t){
                if(t.einstieg === start && t.ausstieg === end){
                    sum += parseInt(t.anzahl || 1);
                }
            });
            html += "<td>" + sum + "</td>";
        });
        html += "</tr>";
    });

    html += "</table>";
    document.getElementById("odmatrix").innerHTML = html;
}

function renderSections(data){
    const sectionCounts = new Array(stations.length - 1).fill(0);

    data.forEach(function(t){
        const i = stationIndex[t.einstieg];
        const j = stationIndex[t.ausstieg];
        const n = parseInt(t.anzahl || 1);

        const from = Math.min(i, j);
        const to = Math.max(i, j);

        for(let k = from; k < to; k++){
            sectionCounts[k] += n;
        }
    });

    let html = "<table><tr><th>Abschnitt</th><th>Fahrgäste</th></tr>";

    for(let i = 0; i < stations.length - 1; i++){
        html += "<tr><td>" + stations[i] + " – " + stations[i+1] +
                "</td><td>" + sectionCounts[i] + "</td></tr>";
    }

    html += "</table>";
    document.getElementById("sections").innerHTML = html;
}

function exportCSV(){
    const data = loadData();

    let csv = "Datum,Zugnummer,Fahrscheinart,Anzahl,Einstieg,Ausstieg,Richtung,Zeit\n";

    data.forEach(function(r){
        csv += [
            r.datum,
            r.zug,
            r.ticket,
            r.anzahl,
            r.einstieg,
            r.ausstieg,
            r.richtung,
            r.zeit
        ].map(csvEscape).join(",") + "\n";
    });

    const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "Ilztalbahn_Fahrgaeste.csv";
    a.click();
}

function csvEscape(value){
    const s = String(value == null ? "" : value);
    return '"' + s.replace(/"/g, '""') + '"';
}

function clearData(){
    if(confirm("Wirklich alle gespeicherten Daten löschen?")){
        localStorage.removeItem("ilztalbahn_optional_ticket");
        updateStats();
        document.getElementById("status").innerText = "Daten gelöscht";
    }
}
