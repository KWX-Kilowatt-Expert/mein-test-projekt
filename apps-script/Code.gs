/**
 * Prediger Deckel – Server (Google Apps Script, an die Tabelle gebunden)
 *
 * Alle Daten liegen in dieser Google-Tabelle:
 *   Deckel       – offene Deckel (wird laufend neu geschrieben)
 *   Zahlungen    – jede Zahlung (Bar / EC-Karte / PayPal), nur angehängt
 *   Schulden     – Schuldenbuch (angeschrieben, offen / bezahlt)
 *   Auslagen     – Geld, das aus der Kasse genommen wurde
 *   Karte        – alle Artikel mit Preisen (hier dürfen Preise direkt geändert werden)
 *   Statistik    – Verkaufszähler für die Favoriten
 *   Stammgäste   – Namensvorschläge
 *   Einstellungen – PIN
 *
 * Einrichtung: siehe ANLEITUNG.md
 */

// ===== SHARED START – dieser Teil läuft auf dem Server UND im Browser =====
var AREAS = [
  {id:"ph",name:"Podest hinten"},{id:"fe",name:"Fenster"},{id:"t2",name:"Tisch 2"},
  {id:"pv",name:"Podest vorne"},{id:"sh",name:"Säule hinten"},{id:"sv",name:"Säule vorne"},{id:"t1",name:"Tisch 1"},
  {id:"ba",name:"Bar"},{id:"xt",name:"X-TRA"}
];
var METHODS = {bar:"Bar", ec:"EC-Karte", paypal:"PayPal", schulden:"Anschreiben"};

var MENU_CATS = [
 ["Cocktails", [
  ["Cuba Libre",8.5,"Rum, Limette, Cola"],["El Gringo",11,"Rum, Tequila, Cachaça, Mango, Maracuja"],["Caipirinha",11,"Cachaça, Limette, Rohrzucker"],
  ["Long Island Ice Tea",11,"Rum, Wodka, Tequila, Gin, Triple Sec, Cola"],["Margarita Erdbeere",11,"Tequila, Triple Sec, Erdbeere, Limette"],
  ["Margarita Naturale",11,"Tequila, Triple Sec, Limette"],["Mojito",11,"Rum, Minze, Limette, Zucker, Soda"],["Moscow Mule",11,"Vodka, Lime, Spicy Ginger, Gurke"],
  ["Planter's Punch",11,"Rum, Zitrone, Orange, Angostura, Grenadine"],["Royal Navy Fog Cutter",11,"Gin, Rum, Brandy, Portwein, O-Saft, Mandel"],
  ["Titty Twister",11,"Tequila, Whisky, Grappa, Maracuja, Limette"]]],
 ["Before Dinner", [
  ["French 68",11,"Calvados, Brandy, Zitrone, Grenadine, Sekt"],["French 75",11,"Gin, Zitrone, Zucker, Angostura, Sekt"],["Gin Fizz",11,"Gin, Zitrone, Zucker, Soda"],
  ["Manhattan",11,"Whiskey, Vermouth dry + rosso, Angostura"],["Martini Cocktail",11,"Gin, Vermouth dry"],["Negroni",11,"Gin, Vermouth, Campari"],["Spider Bite",11,"Wodka, Triple Sec, Malibu, Angostura"]]],
 ["After Dinner", [
  ["Jamaica Fire",11,"Jamaican Rum, Mandel, Zitrone, Maracuja, Rum 73%"],["Mai Tai",11,"Jamaican Rum, Triple Sec, Mandel, Limette"],["Mer du Sud",11,"Cointreau, Blue Curaçao, Ananas, Ginger Ale"],
  ["Piña Colada",11,"Rum, Ananas, Kokos"],["Prince",11,"Tequila, 43er, Kokos, Maracuja"],["Sex on the Beach",11,"Wodka, Triple Sec, Cranberry, Maracuja, Ananas"],["White Russian",11,"Kahlúa, Wodka, Sahne"]]],
 ["Sours", [
  ["43 Sour",9.5,"43er, Zitrone"],["Aperol Sour",9.5,"Aperol, Zitrone"],["Gin Sour",9.5,"Gin, Limette, Rohrzucker"],["Rum Sour (Daiquiri)",9.5,"Rum, Limette, Rohrzucker"],
  ["Pisco Sour",9.5,"Pisco, Limette, Rohrzucker"],["Whisky Sour",9.5,"Scotch, Zitrone, Rohrzucker"],["Frangelico Sour",9.5,"Frangelico, Limette"],["Vodka Sour",9.5,"Vodka, Limette, Rohrzucker"]]],
 ["Mocktails", [
  ["Acapulco Gold",8,"Ananas, Kokos, Grapefruit"],["Coconut Kiss",8,"Ananas, Kirsch, Zitrone, Kokos"],["Coconut Lips",8,"Ananas, Himbeer, Kokos"],["Fernando",8,"Limette, Rohrzucker, Spicy Ginger"],
  ["Herbal Strawberry",8,"Erdbeere, Basilikum, Maracuja, Cranberry"],["San Francisco",8,"O-Saft, Ananas, Grapefruit, Zitrone, Grenadine"],["Virgin Mojito",8,"Minze, Rohrzucker, Limette, Tonic"]]],
 ["Gin & Tonic", [
  ["Monkey 47",12,"4cl · mit Thomas Henry Tonic"],["Bombay Sapphire",9.5,"4cl · mit Tonic"],["Hendrick's",9.5,"4cl · mit Tonic"],["Tanqueray London",9.5,"4cl · mit Tonic"],
  ["Tanqueray Rangpur",9.5,"4cl · mit Tonic"],["Tanqueray Sevilla",9.5,"4cl · mit Tonic"],["Tanqueray No. 10",11,"4cl · mit Tonic"]]],
 ["Whisky", [
  ["Cragganmore 12",11,"Speyside · 4cl"],["Dalwhinnie 15",11,"Highlands · 4cl"],["Glenkinchie 10",11,"Lowlands · 4cl"],["Oban 14",11,"Highlands · 4cl"],
  ["Talisker 10",11,"Skye · 4cl"],["Lagavulin 16",14,"Islay · 4cl"]]],
 ["Rum · Brandy · Port", [
  ["Havana Club 7",8.8,"Rum · 4cl"],["Matusalem 15",9.5,"Rum · 4cl"],["Appleton Extra 12",11,"Rum · 4cl"],
  ["Cardenal Mendoza Gran Reserva",8.8,"Brandy · 4cl"],["Cardenal Mendoza Carta Real",14,"Brandy · 4cl"],["Messias Port 10",6,"Portwein · 5cl"]]],
 ["Tequila & Mezcal", [
  ["Jose Cuervo Especial",3,"Silver/Reposado · 2cl"],["1800 Blanco",4,"2cl"],["1800 Añejo",4,"2cl"],["Don Julio Reposado",5,"2cl"],
  ["Cuervo Reserva de la Familia",11,"2cl"],["Montelobos Espadín",5,"Mezcal · 2cl"],["Mezcal Local Destilado",7,"Mezcal · 2cl"]]],
 ["Shooters", [
  ["Mexikaner",3,"3cl"],["Red Ouzo",3,"3cl"],["B 52",3.5,"3cl"],["Brain Damage",3.5,"3cl"],["Hiroshima",3.5,"3cl"],["Orgasmus",3.5,"3cl"],["Pepito Negro",3.5,"3cl"],["Wild Dog",3.5,"3cl"]]],
 ["Bittersüßes", [
  ["Sambuca Molinari",3,"2cl · Kaffeebohnen"],["Averna",3,"2cl"],["Jägermeister",3,"2cl · eiskalt"],["Ramazzotti",3,"2cl"],["Amaretto",4,"4cl"],["Baileys",5,"4cl"],["Frangelico",5,"4cl"]]],
 ["Aperitif", [
  ["Prosecco Spumante",4,"10cl"],["Martini Bianco",5,"10cl"],["Campari",7,"4cl · Orange/Soda"],["Pastis 51",7,"4cl · + Eau"],["Longdrink",7,"4cl Spirituose + Filler"],
  ["Aperol Spritz",7,"20cl"],["Prosecco auf Eis",7,"20cl"]]],
 ["Bier", [
  ["Früh Kölsch",2.8,"0,2 l · vom Fass"],["Kranz Kölsch",28,"11 × 0,2 l"],["Jever Pils",4,"0,3 l · vom Fass"],["San Miguel",4,"0,3 l · vom Fass"],
  ["Büble Dunkel (Halbe)",6,"0,5 l · vom Fass"],["Beck's",3.5,"0,33 l · Flasche"],["Andechser Weißbier",5,"0,5 l · Flasche"],["Jever Fun",3.5,"0,33 l · alkoholfrei"]]],
 ["Kaffee", [
  ["Espresso",1.5,""],["Espresso Doppio",3,""],["Kaffee",3,""],["Cappuccino",3.5,""],["Espresso Corretto",4,"1cl Grappa"],["Espresso Carajillo",4,"1cl Brandy"],
  ["Coffee Baileys",6,"4cl Baileys"],["Coffee Kahlúa",6,"4cl Kahlúa"]]],
 ["Alkoholfrei", [
  ["Wasser 0,25",2.5,"Teinacher medium/naturell"],["Wasser 0,75",5.5,"Teinacher medium/naturell"],["Black Forest",3,"0,4 l"],["Coca Cola",3.5,"0,33 l"],["Cola Zero",3.5,"0,33 l"],
  ["Red Bull",3.8,"0,25 l"],["Thomas Henry",3.5,"0,2 l · Tonic, Ginger Ale, Bitter Lemon …"],["Saft 0,2",3,"Ananas, Apfel, Grapefruit, Orange, Maracuja"],
  ["Saft 0,4",5,"Ananas, Apfel, Grapefruit, Orange, Maracuja"],["Schorle 0,4",3.5,"Apfel, Orange, Maracuja …"]]]
];
var DEFAULT_FAVS = ["Cuba Libre","Büble Dunkel (Halbe)","Früh Kölsch","Jägermeister","Gin Sour","Aperol Spritz","Moscow Mule","Caipirinha","Jever Pils","Coca Cola","Wasser 0,25","Espresso"];

function r2(x){ return Math.round(x*100)/100; }
function slug(s){ return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }
function menuSeed(){
  var out=[]; MENU_CATS.forEach(function(c){ c[1].forEach(function(i){ out.push({id:slug(i[0]),cat:c[0],name:i[0],price:i[1],desc:i[2]}); }); });
  return out;
}
function emptyState(){ return {menu:[],tabs:[],debts:[],payments:[],expenses:[],stats:{},regulars:[]}; }
function areaName(id){ for(var i=0;i<AREAS.length;i++) if(AREAS[i].id===id) return AREAS[i].name; return id; }
function tabTotal(t){ var s=0; for(var id in t.items){ var m=t.meta[id]||{price:0}; s+=m.price*t.items[id]; } return r2(s); }
function findBy(list,id){ for(var i=0;i<list.length;i++) if(list[i].id===id) return list[i]; return null; }
function addRegular(s,n){
  if(!n || /^Gast \d+$/.test(n)) return;
  s.regulars=[n].concat(s.regulars.filter(function(r){ return r.toLowerCase()!==String(n).toLowerCase(); })).slice(0,80);
}
function bumpStat(s,id,d){ if(id.indexOf("x-")===0) return; s.stats[id]=Math.max(0,(s.stats[id]||0)+d); if(!s.stats[id]) delete s.stats[id]; }

/** Wendet eine Aktion auf den Zustand an. Läuft identisch im Browser (sofort) und auf dem Server (verbindlich). */
function applyOp(s, op){
  var t = op.tab ? findBy(s.tabs, op.tab) : null;
  switch(op.t){
    case "open":
      if(findBy(s.tabs,op.tab)) return;
      s.tabs.push({id:op.tab, area:op.area, name:op.name, opened:op.at, staff:op.staff||"", items:{}, meta:{}});
      addRegular(s,op.name); return;
    case "add":
      if(!t) return;
      var q=(t.items[op.item]||0)+op.d; if(q<0) return;
      if(op.d>0 && !t.meta[op.item]) t.meta[op.item]={name:op.name, price:Number(op.price)||0};
      if(q===0){ delete t.items[op.item]; delete t.meta[op.item]; } else t.items[op.item]=q;
      bumpStat(s,op.item,op.d); return;
    case "rename": if(t && op.name){ t.name=op.name; addRegular(s,op.name); } return;
    case "move": if(t) t.area=op.area; return;
    case "merge":
      var o=findBy(s.tabs,op.into); if(!t||!o||t===o) return;
      for(var id in t.items){ o.items[id]=(o.items[id]||0)+t.items[id]; if(!o.meta[id]) o.meta[id]=t.meta[id]; }
      s.tabs=s.tabs.filter(function(x){ return x!==t; }); return;
    case "drop":
      if(!t) return;
      for(var k in t.items) bumpStat(s,k,-t.items[k]);
      s.tabs=s.tabs.filter(function(x){ return x!==t; }); return;
    case "pay":
      if(!t) return;
      var lines=[], sum=0;
      for(var it in op.sel){
        var n=Math.min(op.sel[it]||0, t.items[it]||0); if(n<=0) continue;
        var m=t.meta[it]||{name:it,price:0};
        lines.push({name:m.name, price:m.price, qty:n}); sum+=m.price*n;
        if(t.items[it]-n>0) t.items[it]-=n; else { delete t.items[it]; delete t.meta[it]; }
      }
      sum=r2(sum); if(!lines.length) return;
      var emptied=Object.keys(t.items).length===0;
      if(op.method==="schulden"){
        s.debts.push({id:op.pid, name:op.debtName||t.name, created:op.at, amount:sum, paid:0, status:"offen", note:op.note||"", lines:lines, staff:op.staff||"", closed:0});
        addRegular(s,op.debtName||t.name);
      } else {
        s.payments.push({id:op.pid, day:op.day, at:op.at, name:t.name, area:t.area, method:op.method, amount:sum, kind:emptied?"deckel":"teil", lines:lines, staff:op.staff||""});
      }
      if(emptied) s.tabs=s.tabs.filter(function(x){ return x!==t; });
      return;
    case "debtNew":
      if(findBy(s.debts,op.pid)) return;
      s.debts.push({id:op.pid, name:op.name, created:op.at, amount:r2(op.amount), paid:0, status:"offen", note:op.note||"", lines:[], staff:op.staff||"", closed:0});
      addRegular(s,op.name); return;
    case "debtPay":
      var d=findBy(s.debts,op.debt); if(!d || d.status!=="offen") return;
      var amt=r2(Math.min(op.amount, d.amount-d.paid)); if(amt<=0) return;
      d.paid=r2(d.paid+amt);
      if(d.paid>=d.amount-0.001){ d.status="bezahlt"; d.closed=op.at; }
      s.payments.push({id:op.pid, day:op.day, at:op.at, name:d.name, area:"", method:op.method, amount:amt, kind:"schulden", lines:[], staff:op.staff||""});
      return;
    case "expense":
      if(findBy(s.expenses,op.pid)) return;
      s.expenses.push({id:op.pid, day:op.day, at:op.at, what:op.what, amount:r2(op.amount), staff:op.staff||""}); return;
    case "menuSet":
      var mi=op.item, ex=findBy(s.menu,mi.id);
      var clean={id:mi.id, cat:mi.cat||"Sonstiges", name:mi.name, price:Number(mi.price)||0, desc:mi.desc||""};
      if(ex) s.menu[s.menu.indexOf(ex)]=clean; else s.menu.push(clean); return;
    case "menuDel": s.menu=s.menu.filter(function(x){ return x.id!==op.item; }); return;
    case "resetStats": s.stats={}; return;
  }
}
// ===== SHARED END =====

var TZ = "Europe/Berlin";
var DEF = {
  "Deckel":       ["ID","Platz","Name","Geöffnet","Bedienung","Summe","Positionen","_items","_meta","_opened"],
  "Zahlungen":    ["ID","Tag","Uhrzeit","Name","Platz","Zahlart","Betrag","Art","Positionen","Bedienung","_at","_lines"],
  "Schulden":     ["ID","Name","Betrag","Bezahlt","Offen","Status","Angeschrieben","Notiz","Positionen","Bedienung","_created","_lines","_closed"],
  "Auslagen":     ["ID","Tag","Uhrzeit","Wofür","Betrag","Bedienung","_at"],
  "Karte":        ["ID","Kategorie","Name","Preis","Info"],
  "Statistik":    ["ID","Anzahl"],
  "Stammgäste":   ["Name"],
  "Einstellungen":["Schlüssel","Wert"]
};

/* ---------------- Web-App ---------------- */
function doGet(){
  return HtmlService.createTemplateFromFile("index").evaluate()
    .setTitle("Prediger Deckel")
    .addMetaTag("viewport","width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no")
    .addMetaTag("mobile-web-app-capable","yes")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Liefert den gemeinsamen Code für den Browser (wird in index.html eingesetzt). */
function sharedSource(){
  var fns=[r2,slug,menuSeed,emptyState,areaName,tabTotal,findBy,addRegular,bumpStat,applyOp];
  return "var AREAS="+JSON.stringify(AREAS)+";\nvar METHODS="+JSON.stringify(METHODS)+";\nvar MENU_CATS="+JSON.stringify(MENU_CATS)+
    ";\nvar DEFAULT_FAVS="+JSON.stringify(DEFAULT_FAVS)+";\n"+fns.map(String).join("\n");
}

/** Einmal im Editor ausführen: legt alle Blätter an und fragt die Berechtigungen ab. */
function einrichten(){
  Object.keys(DEF).forEach(sheet_);
  var L=load_(); save_(L.s,L.snap);
  bumpRev_();
  Logger.log("Fertig. PIN steht im Blatt »Einstellungen« (Standard 0000 – bitte ändern!).");
}

/** Bei Änderungen direkt in der Tabelle (z. B. Zigarrenpreise) die Geräte neu laden lassen. */
function onEdit(){
  try{ bumpRev_(); CacheService.getScriptCache().remove("pin"); }catch(e){}
}

/**
 * Einziger Endpunkt für den Browser.
 * req = {pin, since, ops:[...]}  →  {ok, rev, state?}
 */
function api(req){
  req=req||{};
  if(String(req.pin||"").trim()!==pin_()) return {ok:false, error:"pin"};
  var props=PropertiesService.getScriptProperties();
  var ops=req.ops||[];
  if(!ops.length){
    var rev=Number(props.getProperty("rev")||1);
    if(Number(req.since)===rev) return {ok:true, rev:rev};
    return {ok:true, rev:rev, state:load_().s};
  }
  var lock=LockService.getScriptLock();
  lock.waitLock(25000);
  try{
    var cache=CacheService.getScriptCache();
    var seen=cache.getAll(ops.map(function(o){ return "op_"+o.id; }));
    var L=load_(), done={};
    ops.forEach(function(op){
      if(seen["op_"+op.id]) return;          // schon verarbeitet (Wiederholung nach Netzfehler)
      try{ applyOp(L.s,op); }catch(e){ console.error(e); }
      done["op_"+op.id]="1";
    });
    save_(L.s,L.snap);
    if(Object.keys(done).length) cache.putAll(done,21600);
    var r=bumpRev_();
    SpreadsheetApp.flush();
    return {ok:true, rev:r, state:L.s};
  } finally { lock.releaseLock(); }
}

/* ---------------- Tabelle lesen / schreiben ---------------- */
function ss_(){ return SpreadsheetApp.getActive(); }
function sheet_(name){
  var sh=ss_().getSheetByName(name);
  if(!sh){
    sh=ss_().insertSheet(name);
    sh.getRange(1,1,1,DEF[name].length).setValues([DEF[name]]).setFontWeight("bold");
    sh.setFrozenRows(1);
    if(name==="Einstellungen"){ sh.getRange("B:B").setNumberFormat("@"); sh.getRange(2,1,1,2).setValues([["PIN","0000"]]); }
  }
  return sh;
}
function rows_(name){
  var v=sheet_(name).getDataRange().getValues(); v.shift();
  return v.filter(function(r){ return r.some(function(c){ return c!=="" && c!==null; }); });
}
function rewrite_(name,rows){
  var sh=sheet_(name), w=DEF[name].length, last=sh.getLastRow();
  if(last>1) sh.getRange(2,1,last-1,w).clearContent();
  if(rows.length) sh.getRange(2,1,rows.length,w).setValues(rows);
}
function append_(name,rows){
  if(!rows.length) return;
  var sh=sheet_(name);
  sh.getRange(sh.getLastRow()+1,1,rows.length,DEF[name].length).setValues(rows);
}
function bumpRev_(){
  var p=PropertiesService.getScriptProperties(), r=Number(p.getProperty("rev")||1)+1;
  p.setProperty("rev",String(r)); return r;
}
function pin_(){
  var c=CacheService.getScriptCache(), v=c.get("pin");
  if(v!==null) return v;
  v="0000";
  rows_("Einstellungen").forEach(function(r){ if(String(r[0]).trim().toUpperCase()==="PIN") v=String(r[1]).trim(); });
  c.put("pin",v,300); return v;
}
function num_(v){ if(typeof v==="number") return v; var n=parseFloat(String(v).replace(/[^\d,.\-]/g,"").replace(",",".")); return isNaN(n)?0:n; }
function day_(v){ return (v instanceof Date) ? Utilities.formatDate(v, ss_().getSpreadsheetTimeZone(), "yyyy-MM-dd") : String(v); }
function fmt_(at,f){ return Utilities.formatDate(new Date(at), TZ, f); }
function json_(v,d){ try{ return v ? JSON.parse(v) : d; }catch(e){ return d; } }
function areaId_(name){ for(var i=0;i<AREAS.length;i++) if(AREAS[i].name===name || AREAS[i].id===name) return AREAS[i].id; return name ? String(name) : ""; }
function methodKey_(label){ for(var k in METHODS) if(METHODS[k]===label || k===label) return k; return String(label); }
function linesText_(lines){ return lines.map(function(l){ return l.qty+"× "+l.name; }).join(", "); }

function load_(){
  var s=emptyState(), dirty={};
  var cutoff=Utilities.formatDate(new Date(Date.now()-2*864e5), TZ, "yyyy-MM-dd");

  var used={};
  rows_("Karte").forEach(function(r){
    var name=String(r[2]).trim(); if(!name) return;
    var id=String(r[0]).trim();
    if(!id || used[id]){ id=slug(name); while(used[id]) id+="-2"; dirty.Karte=true; }
    used[id]=1;
    s.menu.push({id:id, cat:String(r[1]||"Sonstiges").trim(), name:name, price:num_(r[3]), desc:String(r[4]||"")});
  });
  if(!s.menu.length){ s.menu=menuSeed(); dirty.Karte=true; }

  s.tabs=rows_("Deckel").map(function(r){
    return {id:String(r[0]), area:areaId_(r[1]), name:String(r[2]), staff:String(r[4]||""), items:json_(r[7],{}), meta:json_(r[8],{}), opened:Number(r[9])||Date.now()};
  });
  s.payments=rows_("Zahlungen").map(function(r){
    var art=String(r[7]);
    return {id:String(r[0]), day:day_(r[1]), at:Number(r[10])||0, name:String(r[3]), area:areaId_(r[4]), method:methodKey_(r[5]), amount:num_(r[6]),
            kind:art==="Schulden"?"schulden":art==="Teilzahlung"?"teil":"deckel", lines:json_(r[11],[]), staff:String(r[9]||"")};
  }).filter(function(p){ return p.day>=cutoff; });
  s.debts=rows_("Schulden").map(function(r){
    return {id:String(r[0]), name:String(r[1]), amount:num_(r[2]), paid:num_(r[3]), status:String(r[5]||"offen"), note:String(r[7]||""),
            staff:String(r[9]||""), created:Number(r[10])||0, lines:json_(r[11],[]), closed:Number(r[12])||0};
  });
  s.expenses=rows_("Auslagen").map(function(r){
    return {id:String(r[0]), day:day_(r[1]), at:Number(r[6])||0, what:String(r[3]), amount:num_(r[4]), staff:String(r[5]||"")};
  }).filter(function(e){ return e.day>=cutoff; });
  rows_("Statistik").forEach(function(r){ if(r[0]) s.stats[String(r[0])]=Number(r[1])||0; });
  s.regulars=rows_("Stammgäste").map(function(r){ return String(r[0]); }).filter(String);

  var snap=serialize_(s);
  Object.keys(dirty).forEach(function(k){ snap[k]=null; });
  snap.payIds={}; s.payments.forEach(function(p){ snap.payIds[p.id]=1; });
  snap.expIds={}; s.expenses.forEach(function(e){ snap.expIds[e.id]=1; });
  return {s:s, snap:snap};
}

function serialize_(s){
  var o={};
  o.Deckel=s.tabs.map(function(t){
    var lines=Object.keys(t.items).map(function(id){ return {qty:t.items[id], name:(t.meta[id]||{name:id}).name}; });
    return [t.id, areaName(t.area), t.name, fmt_(t.opened,"dd.MM. HH:mm"), t.staff, tabTotal(t), linesText_(lines), JSON.stringify(t.items), JSON.stringify(t.meta), t.opened];
  });
  o.Schulden=s.debts.map(function(d){
    return [d.id, d.name, d.amount, d.paid, r2(d.amount-d.paid), d.status, d.created?fmt_(d.created,"dd.MM.yyyy HH:mm"):"", d.note,
            linesText_(d.lines||[]), d.staff, d.created, JSON.stringify(d.lines||[]), d.closed||""];
  });
  o.Karte=s.menu.map(function(m){ return [m.id, m.cat, m.name, m.price, m.desc]; });
  o.Statistik=Object.keys(s.stats).sort(function(a,b){ return s.stats[b]-s.stats[a]; }).map(function(k){ return [k, s.stats[k]]; });
  o["Stammgäste"]=s.regulars.map(function(n){ return [n]; });
  return o;
}

function save_(s,snap){
  var cur=serialize_(s);
  ["Deckel","Schulden","Karte","Statistik","Stammgäste"].forEach(function(k){
    if(snap[k]===null || JSON.stringify(cur[k])!==JSON.stringify(snap[k])) rewrite_(k,cur[k]);
  });
  append_("Zahlungen", s.payments.filter(function(p){ return !snap.payIds[p.id]; }).map(function(p){
    return [p.id, p.day, fmt_(p.at,"HH:mm"), p.name, areaName(p.area), METHODS[p.method]||p.method, p.amount,
            p.kind==="schulden"?"Schulden":p.kind==="teil"?"Teilzahlung":"Deckel", linesText_(p.lines||[]), p.staff, p.at, JSON.stringify(p.lines||[])];
  }));
  append_("Auslagen", s.expenses.filter(function(e){ return !snap.expIds[e.id]; }).map(function(e){
    return [e.id, e.day, fmt_(e.at,"HH:mm"), e.what, e.amount, e.staff, e.at];
  }));
}
