const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzDsAjeKrqIUjZD77vSTX4CcwWjJBfG1vNnVJSPfLs6QLwl2vUuwMWAl_SwPd3htrg1/exec";

const stations = ["Passau Hbf","Tiefenbach","Fischhaus","Kalteneck","Fürsteneck","Neuhausmühle","Röhrnbach","Waldkirchen","Freyung"];
const stationIndex = {};
stations.forEach(function(s,i){ stationIndex[s] = i; });

window.onload = function(){
    document.getElementById("datum").value = new Date().toISOString().split("T")[0];
    fillStations();
    updateStats();
    syncPending();
    window.addEventListener("online", function(){ syncPending(); });
    if("serviceWorker" in navigator){ navigator.serviceWorker.register("service-worker.js"); }
};

function fillStations(){
    const e = document.getElementById("einstieg");
    const a = document.getElementById("ausstieg");
    e.innerHTML = '<option value="">Bitte wählen</option>';
    a.innerHTML = '<option value="">Bitte wählen</option>';
    stations.forEach(function(st){
        let o1 = document.createElement("option"); o1.text = st; o1.value = st; e.add(o1);
        let o2 = document.createElement("option"); o2.text = st; o2.value = st; a.add(o2);
    });
}
function plus(){ let f = document.getElementById("anzahl"); f.value = parseInt(f.value || "1") + 1; }
function minus(){ let f = document.getElementById("anzahl"); let v = parseInt(f.value || "1"); if(v > 1){ f.value = v - 1; } }
function loadData(){ return JSON.parse(localStorage.getItem("ilztalbahn_sheets") || "[]"); }
function saveData(data){ localStorage.setItem("ilztalbahn_sheets", JSON.stringify(data)); }

function savePassenger(){
    const datum = document.getElementById("datum").value;
    const zug = document.getElementById("zugnummer").value.trim();
    let ticket = document.getElementById("ticket").value || "Nicht angegeben";
    const anzahl = parseInt(document.getElementById("anzahl").value || "1");
    const einstieg = document.getElementById("einstieg").value;
    const ausstieg = document.getElementById("ausstieg").value;
    if(!datum || !zug || !einstieg || !ausstieg){ alert("Bitte Datum, Zugnummer, Einstieg und Ausstieg ausfüllen"); return; }
    if(einstieg === ausstieg){ alert("Einstieg und Ausstieg dürfen nicht identisch sein"); return; }
    if(isNaN(anzahl) || anzahl < 1){ alert("Bitte eine gültige Anzahl eingeben"); return; }

    const richtung = stationIndex[einstieg] < stationIndex[ausstieg] ? "Passau-Freyung" : "Freyung-Passau";
    const record = {
        id: Date.now().toString() + "-" + Math.random().toString(36).substring(2,8),
        datum: datum, zugnummer: zug, ticket: ticket, anzahl: anzahl, einstieg: einstieg,
        ausstieg: ausstieg, richtung: richtung, zeit: new Date().toISOString(),
        geraet: navigator.userAgent.substring(0,80), synced: false
    };
    const data = loadData(); data.push(record); saveData(data);
    document.getElementById("status").innerHTML = anzahl + " Fahrgast/Fahrgäste gespeichert: " + einstieg + " → " + ausstieg;
    document.getElementById("anzahl").value = 1;
    updateStats();
    syncPending();
}

function updateStats(){
    const data = loadData(); let gesamt=0,d=0,b=0,unknown=0,pending=0;
    data.forEach(function(x){
        const n = parseInt(x.anzahl || 1); gesamt += n;
        if(x.ticket === "Deutschlandticket"){ d += n; } else if(x.ticket === "Bayernticket"){ b += n; } else { unknown += n; }
        if(!x.synced){ pending += 1; }
    });
    document.getElementById("gesamt").innerText = gesamt;
    document.getElementById("dticket").innerText = d;
    document.getElementById("bticket").innerText = b;
    document.getElementById("unknownTicket").innerText = unknown;
    document.getElementById("pending").innerText = pending;
    renderODMatrix(data); renderSections(data);
}

async function syncPending(){
    const data = loadData();
    const pending = data.filter(function(x){ return !x.synced; });
    if(pending.length === 0){ document.getElementById("syncStatus").innerText = "Synchronisation: alles gesichert"; updateStats(); return; }
    if(!navigator.onLine){ document.getElementById("syncStatus").innerText = "Synchronisation: offline, später erneut"; updateStats(); return; }
    document.getElementById("syncStatus").innerText = "Synchronisation: " + pending.length + " Datensatz/Datensätze werden übertragen...";
    for(const record of pending){
        try{
            await fetch(GOOGLE_SCRIPT_URL, { method:"POST", mode:"no-cors", headers:{ "Content-Type":"text/plain;charset=utf-8" }, body: JSON.stringify(record) });
            record.synced = true;
        } catch(err){
            document.getElementById("syncStatus").innerText = "Synchronisation: fehlgeschlagen, später erneut";
            break;
        }
    }
    saveData(data); updateStats();
    const rest = loadData().filter(function(x){ return !x.synced; }).length;
    document.getElementById("syncStatus").innerText = rest === 0 ? "Synchronisation: alles gesichert" : "Synchronisation: " + rest + " Datensatz/Datensätze offen";
}

function renderODMatrix(data){
    let html = "<table><tr><th>Einstieg \\ Ausstieg</th>";
    stations.forEach(function(s){ html += "<th>" + s + "</th>"; }); html += "</tr>";
    stations.forEach(function(start){
        html += "<tr><th>" + start + "</th>";
        stations.forEach(function(end){
            let sum = 0;
            data.forEach(function(t){ if(t.einstieg === start && t.ausstieg === end){ sum += parseInt(t.anzahl || 1); } });
            html += "<td>" + sum + "</td>";
        });
        html += "</tr>";
    });
    html += "</table>"; document.getElementById("odmatrix").innerHTML = html;
}

function renderSections(data){
    const sectionCounts = new Array(stations.length - 1).fill(0);
    data.forEach(function(t){
        const i = stationIndex[t.einstieg]; const j = stationIndex[t.ausstieg]; const n = parseInt(t.anzahl || 1);
        const from = Math.min(i, j); const to = Math.max(i, j);
        for(let k = from; k < to; k++){ sectionCounts[k] += n; }
    });
    let html = "<table><tr><th>Abschnitt</th><th>Fahrgäste</th></tr>";
    for(let i = 0; i < stations.length - 1; i++){ html += "<tr><td>" + stations[i] + " – " + stations[i+1] + "</td><td>" + sectionCounts[i] + "</td></tr>"; }
    html += "</table>"; document.getElementById("sections").innerHTML = html;
}

function exportCSV(){
    const data = loadData();
    let csv = "Datum,Zugnummer,Fahrscheinart,Anzahl,Einstieg,Ausstieg,Richtung,Zeit,Synchronisiert\n";
    data.forEach(function(r){
        csv += [r.datum,r.zugnummer,r.ticket,r.anzahl,r.einstieg,r.ausstieg,r.richtung,r.zeit,r.synced ? "Ja" : "Nein"].map(csvEscape).join(",") + "\n";
    });
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "Ilztalbahn_Fahrgaeste.csv"; a.click();
}
function csvEscape(value){ const s = String(value == null ? "" : value); return '"' + s.replace(/"/g, '""') + '"'; }
function clearData(){
    if(confirm("Wirklich alle lokal gespeicherten Daten löschen? Bereits synchronisierte Daten bleiben in Google Sheets erhalten.")){
        localStorage.removeItem("ilztalbahn_sheets"); updateStats(); document.getElementById("status").innerText = "Lokale Daten gelöscht";
    }
}
