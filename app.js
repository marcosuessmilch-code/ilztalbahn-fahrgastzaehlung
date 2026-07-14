const stations = [
"Passau Hbf",
"Tiefenbach",
"Fischhaus",
"Kalteneck",
"Fürsteneck",
"Neuhäusermühle",
"Röhrnbach",
"Waldkirchen",
"Freyung"
];

const GOOGLE_SCRIPT_URL =
"https://script.google.com/macros/s/AKfycbzDsAjeKrqIUjZD77vSTX4CcwWjJBfG1vNnVJSPfLs6QLwl2vUuwMWAl_SwPd3htrg1/exec";


let data = JSON.parse(localStorage.getItem("fahrgaeste") || "[]");


// Bahnhofsliste laden
function loadStations(){

let ein = document.getElementById("einstieg");
let aus = document.getElementById("ausstieg");

stations.forEach(s=>{

let o1=document.createElement("option");
o1.text=s;
ein.add(o1);

let o2=document.createElement("option");
o2.text=s;
aus.add(o2);

});

}


// Zähler
function plus(){

let a=document.getElementById("anzahl");
a.value=parseInt(a.value)+1;

}


function minus(){

let a=document.getElementById("anzahl");

if(parseInt(a.value)>1){
a.value=parseInt(a.value)-1;
}

}



// Speichern
function savePassenger(){

let ein=document.getElementById("einstieg").value;
let aus=document.getElementById("ausstieg").value;


let eintrag={

datum:new Date().toLocaleDateString(),

zugnummer:document.getElementById("zugnummer").value,

ticket:document.getElementById("ticket").value,

anzahl:parseInt(document.getElementById("anzahl").value),

einstieg:ein,

ausstieg:aus,

zeit:new Date().toLocaleTimeString(),

sync:false

};


data.push(eintrag);

localStorage.setItem(
"fahrgaeste",
JSON.stringify(data)
);


document.getElementById("status").innerHTML=
"Gespeichert";


updateStats();

}


// Statistik
function updateStats(){

let gesamt=0;
let d=0;
let b=0;
let guti=0;
let fahrrad=0;
let unknown=0;
let pending=0;


data.forEach(x=>{


let n=Number(x.anzahl);


gesamt+=n;


if(x.ticket==="Deutschlandticket"){
d+=n;
}

else if(x.ticket==="Bayernticket"){
b+=n;
}

else if(x.ticket==="Guti Ticket"){
guti+=n;
}

else if(x.ticket==="Fahrrad"){
fahrrad+=n;
}

else{
unknown+=n;
}


if(!x.sync){
pending+=n;
}


});


document.getElementById("gesamt").innerText=gesamt;

document.getElementById("dticket").innerText=d;

document.getElementById("bticket").innerText=b;

document.getElementById("gutiticket").innerText=guti;

document.getElementById("fahrrad").innerText=fahrrad;

document.getElementById("unknownTicket").innerText=unknown;

document.getElementById("pending").innerText=pending;


}


// Synchronisieren
function syncPending(){

let offen=data.filter(x=>!x.sync);


offen.forEach(x=>{


fetch(GOOGLE_SCRIPT_URL,{

method:"POST",

body:JSON.stringify(x)

})

.then(()=>{

x.sync=true;

localStorage.setItem(
"fahrgaeste",
JSON.stringify(data)
);

updateStats();

});


});


}



// CSV Export
function exportCSV(){

let csv="Datum,Zugnummer,Ticket,Anzahl,Einstieg,Ausstieg,Zeit\n";


data.forEach(x=>{

csv+=
`${x.datum},${x.zugnummer},${x.ticket},${x.anzahl},${x.einstieg},${x.ausstieg},${x.zeit}\n`;

});


let blob=new Blob(
[csv],
{type:"text/csv"}
);


let url=URL.createObjectURL(blob);


let a=document.createElement("a");

a.href=url;

a.download="Ilztalbahn_Fahrgaeste.csv";

a.click();

}



// Löschen
function clearData(){

if(confirm("Alle Daten löschen?")){

data=[];

localStorage.removeItem("fahrgaeste");

updateStats();

}

}



window.onload=function(){

loadStations();

updateStats();

};
