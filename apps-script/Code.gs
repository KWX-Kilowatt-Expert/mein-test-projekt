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
function emptyState(){ return {menu:[],tabs:[],debts:[],payments:[],expenses:[],closes:[],stats:{},regulars:[]}; }
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
    case "split":
      if(!t || findBy(s.tabs,op.newTab)) return;
      var nt={id:op.newTab, area:t.area, name:op.name||"Gast", opened:op.at, staff:op.staff||"", items:{}, meta:{}}, moved=0;
      for(var si in op.sel){
        var sn=Math.min(op.sel[si]||0, t.items[si]||0); if(sn<=0) continue;
        nt.items[si]=sn; nt.meta[si]=t.meta[si]; moved+=sn;
        if(t.items[si]-sn>0) t.items[si]-=sn; else { delete t.items[si]; delete t.meta[si]; }
      }
      if(!moved) return;
      s.tabs.push(nt); addRegular(s,nt.name);
      if(!Object.keys(t.items).length) s.tabs=s.tabs.filter(function(x){ return x!==t; });
      return;
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
        s.payments.push({id:op.pid, day:op.day, at:op.at, name:t.name, area:t.area, method:op.method, amount:sum, kind:emptied?"deckel":"teil", lines:lines, staff:op.staff||"", tip:r2(Math.max(0,Number(op.tip)||0))});
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
    case "close":
      s.closes=s.closes||[]; if(findBy(s.closes,op.pid)) return;
      var rep=op.report||{}; rep.id=op.pid; rep.at=op.at; rep.staff=op.staff||""; s.closes.push(rep); return;
  }
}

function fmtE(n){
  n=Number(n)||0; var neg=n<-0.004; var p=Math.abs(Math.round(n*100)/100).toFixed(2).split(".");
  p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g,"."); return (neg?"−":"")+p[0]+","+p[1]+" €";
}
/** Text-Bericht zum Tagesabschluss (Browser, Mail und PDF nutzen denselben Text). */
function reportText(r){
  function L(a,b){ a=String(a); b=String(b); while(a.length<22) a+="."; while(b.length<11) b=" "+b; return a+" "+b; }
  var out=["PREDIGER · TAGESABSCHLUSS", r.dateLabel||r.day, "Abgeschlossen "+(r.timeStr||"")+" von "+(r.staff||"–"), "",
    "EINNAHMEN ("+(r.payCount||0)+" Zahlungen)", L("Bar",fmtE(r.bar)), L("EC-Karte",fmtE(r.ec)), L("PayPal",fmtE(r.paypal)), L("Gesamt",fmtE(r.total))];
  if(r.debtPaid) out.push(L("davon Schulden bezahlt",fmtE(r.debtPaid)));
  if(r.tip) out.push("", "TRINKGELD", L("Bar",fmtE(r.tipBar)), L("EC-Karte",fmtE(r.tipEc)), L("PayPal",fmtE(r.tipPaypal)), L("Trinkgeld gesamt",fmtE(r.tip)));
  out.push("", "KASSE (BAR)", L("Wechselgeld Anfang",fmtE(r.start)), L("+ Bar-Einnahmen",fmtE(r.bar)));
  if(r.tipBar) out.push(L("+ Trinkgeld bar",fmtE(r.tipBar)));
  out.push(L("− Auslagen",fmtE(r.exp)), L("= Soll",fmtE(r.soll)),
    L("Gezählt",fmtE(r.counted)), L("DIFFERENZ",(r.diff>0.004?"+":"")+fmtE(r.diff)), L("Wechselgeld bleibt",fmtE(r.float)), L("ENTNAHME",fmtE(r.take)));
  if(r.ecTerm!==null && r.ecTerm!==undefined) out.push("", L("EC laut Terminal",fmtE(r.ecTerm)), L("EC laut App (inkl. TG)",fmtE((r.ec||0)+(r.tipEc||0))), L("Abweichung EC",fmtE(r.ecTerm-(r.ec||0)-(r.tipEc||0))));
  if(r.exps && r.exps.length){ out.push("","AUSLAGEN"); r.exps.forEach(function(x){ out.push(L(String(x[0]).slice(0,22),fmtE(x[1]))); }); }
  if(r.debts && r.debts.length){ out.push("","ANGESCHRIEBEN ("+fmtE(r.debtNew)+")"); r.debts.forEach(function(x){ out.push(L(String(x[0]).slice(0,22),fmtE(x[1]))); }); }
  out.push("", L("Offene Deckel",(r.openCount||0)+" · "+fmtE(r.openSum)));
  if(r.top && r.top.length){ out.push("","RENNER"); r.top.forEach(function(x){ var q=String(x[1]); while(q.length<3) q=" "+q; out.push(q+"× "+x[0]); }); }
  if(r.note) out.push("", "NOTIZ: "+r.note);
  return out.join("\n");
}
// ===== SHARED END =====

var TZ = "Europe/Berlin";
var DEF = {
  "Deckel":       ["ID","Platz","Name","Geöffnet","Bedienung","Summe","Positionen","_items","_meta","_opened"],
  "Zahlungen":    ["ID","Tag","Uhrzeit","Name","Platz","Zahlart","Betrag","Art","Positionen","Bedienung","_at","_lines","Trinkgeld"],
  "Schulden":     ["ID","Name","Betrag","Bezahlt","Offen","Status","Angeschrieben","Notiz","Positionen","Bedienung","_created","_lines","_closed"],
  "Auslagen":     ["ID","Tag","Uhrzeit","Wofür","Betrag","Bedienung","_at"],
  "Karte":        ["ID","Kategorie","Name","Preis","Info"],
  "Statistik":    ["ID","Anzahl"],
  "Stammgäste":   ["Name"],
  "Abschlüsse":   ["ID","Tag","Uhrzeit","Bedienung","Bar","EC-Karte","PayPal","Gesamt","Auslagen","Wechselgeld Anfang","Soll Bar","Gezählt","Differenz","Wechselgeld neu","Entnahme","EC Terminal","Angeschrieben","Schulden bezahlt","Offene Deckel","Notiz","_json","Trinkgeld"],
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
  var fns=[r2,slug,menuSeed,emptyState,areaName,tabTotal,findBy,addRegular,bumpStat,applyOp,fmtE,reportText];
  return "var AREAS="+JSON.stringify(AREAS)+";\nvar METHODS="+JSON.stringify(METHODS)+";\nvar MENU_CATS="+JSON.stringify(MENU_CATS)+
    ";\nvar DEFAULT_FAVS="+JSON.stringify(DEFAULT_FAVS)+";\n"+fns.map(String).join("\n");
}

/** Einmal im Editor ausführen: legt alle Blätter an und fragt die Berechtigungen ab. */
function einrichten(){
  Object.keys(DEF).forEach(sheet_);
  var me=""; try{ me=Session.getEffectiveUser().getEmail(); }catch(e){}
  ensureSetting_("Bericht an", me);
  ensureSetting_("Tagesbericht per Mail", "ja");
  ensureSetting_("Wochenbericht per Mail", "ja");
  CacheService.getScriptCache().remove("settings");
  var has=ScriptApp.getProjectTriggers().some(function(t){ return t.getHandlerFunction()==="wochenbericht"; });
  if(!has) ScriptApp.newTrigger("wochenbericht").timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(12).inTimezone(TZ).create();
  var L=load_(); save_(L.s,L.snap);
  bumpRev_();
  Logger.log("Fertig. PIN und E-Mail-Empfänger stehen im Blatt »Einstellungen«. Wochenbericht: montags 12 Uhr.");
}

/** Bei Änderungen direkt in der Tabelle (z. B. Zigarrenpreise) die Geräte neu laden lassen. */
function onEdit(){
  try{ bumpRev_(); CacheService.getScriptCache().remove("settings"); }catch(e){}
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
    var L=load_(), done={}; var newCloses=[];
    ops.forEach(function(op){
      if(seen["op_"+op.id]) return;          // schon verarbeitet (Wiederholung nach Netzfehler)
      try{ applyOp(L.s,op); }catch(e){ console.error(e); }
      done["op_"+op.id]="1";
    });
    save_(L.s,L.snap);
    newCloses=(L.s.closes||[]).filter(function(c){ return !L.snap.closeIds[c.id]; });
    if(Object.keys(done).length) cache.putAll(done,21600);
    var r=bumpRev_();
    SpreadsheetApp.flush();
    lock.releaseLock();
    newCloses.forEach(function(c){ try{ sendCloseMail_(c); }catch(e){ console.error("Mail fehlgeschlagen", e); } });
    return {ok:true, rev:r, state:L.s};
  } finally { try{ lock.releaseLock(); }catch(e){} }
}

/* ---------------- Tabelle lesen / schreiben ---------------- */
function ss_(){ return SpreadsheetApp.getActive(); }
var hdrOk_={};
function sheet_(name){
  var sh=ss_().getSheetByName(name);
  if(sh && !hdrOk_[name]){
    var w=DEF[name].length, h=sh.getRange(1,1,1,w).getValues()[0];
    if(h.join("|")!==DEF[name].join("|")) sh.getRange(1,1,1,w).setValues([DEF[name]]).setFontWeight("bold");
    hdrOk_[name]=1;
  }
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
function settings_(){
  var c=CacheService.getScriptCache(), v=c.get("settings");
  if(v) return JSON.parse(v);
  var o={}; rows_("Einstellungen").forEach(function(r){ o[String(r[0]).trim().toLowerCase()]=String(r[1]).trim(); });
  c.put("settings",JSON.stringify(o),300); return o;
}
function pin_(){ return settings_()["pin"]||"0000"; }
function ensureSetting_(key,val){
  var sh=sheet_("Einstellungen");
  var has=rows_("Einstellungen").some(function(r){ return String(r[0]).trim().toLowerCase()===key.toLowerCase(); });
  if(!has) sh.getRange(sh.getLastRow()+1,1,1,2).setValues([[key,val]]);
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
            kind:art==="Schulden"?"schulden":art==="Teilzahlung"?"teil":"deckel", lines:json_(r[11],[]), staff:String(r[9]||""), tip:num_(r[12]||0)};
  }).filter(function(p){ return p.day>=cutoff; });
  s.debts=rows_("Schulden").map(function(r){
    return {id:String(r[0]), name:String(r[1]), amount:num_(r[2]), paid:num_(r[3]), status:String(r[5]||"offen"), note:String(r[7]||""),
            staff:String(r[9]||""), created:Number(r[10])||0, lines:json_(r[11],[]), closed:Number(r[12])||0};
  });
  s.expenses=rows_("Auslagen").map(function(r){
    return {id:String(r[0]), day:day_(r[1]), at:Number(r[6])||0, what:String(r[3]), amount:num_(r[4]), staff:String(r[5]||"")};
  }).filter(function(e){ return e.day>=cutoff; });
  var cl=rows_("Abschlüsse"); s.closes=cl.slice(-20).map(function(r){ var o=json_(r[20],{}); o.id=String(r[0]); return o; });
  rows_("Statistik").forEach(function(r){ if(r[0]) s.stats[String(r[0])]=Number(r[1])||0; });
  s.regulars=rows_("Stammgäste").map(function(r){ return String(r[0]); }).filter(String);

  var snap=serialize_(s);
  Object.keys(dirty).forEach(function(k){ snap[k]=null; });
  snap.payIds={}; s.payments.forEach(function(p){ snap.payIds[p.id]=1; });
  snap.expIds={}; s.expenses.forEach(function(e){ snap.expIds[e.id]=1; });
  snap.closeIds={}; s.closes.forEach(function(c){ snap.closeIds[c.id]=1; });
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
            p.kind==="schulden"?"Schulden":p.kind==="teil"?"Teilzahlung":"Deckel", linesText_(p.lines||[]), p.staff, p.at, JSON.stringify(p.lines||[]), p.tip||0];
  }));
  append_("Auslagen", s.expenses.filter(function(e){ return !snap.expIds[e.id]; }).map(function(e){
    return [e.id, e.day, fmt_(e.at,"HH:mm"), e.what, e.amount, e.staff, e.at];
  }));
  append_("Abschlüsse", (s.closes||[]).filter(function(c){ return !snap.closeIds[c.id]; }).map(function(c){
    return [c.id, c.day, fmt_(c.at,"HH:mm"), c.staff, c.bar, c.ec, c.paypal, c.total, c.exp, c.start, c.soll, c.counted, c.diff, c.float, c.take,
            c.ecTerm===null||c.ecTerm===undefined?"":c.ecTerm, c.debtNew, c.debtPaid, c.openSum, c.note||"", JSON.stringify(c), c.tip||0];
  }));
}

/* ---------------- Berichte per E-Mail ---------------- */
function recipients_(){ return (settings_()["bericht an"]||"").split(/[,;\s]+/).filter(function(x){ return x.indexOf("@")>0; }).join(","); }
function isOn_(key){ return String(settings_()[key]||"ja").toLowerCase()!=="nein"; }
function esc_(t){ return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function pdf_(html,name){ return Utilities.newBlob(html,"text/html",name+".html").getAs("application/pdf").setName(name+".pdf"); }
function page_(title,body){
  return '<html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#222;margin:24px}h1{font-size:20px;color:#8e2a23;margin:0 0 4px}'+
    'pre{font-family:Consolas,Menlo,monospace;font-size:13px;line-height:1.45;background:#f7f2e8;padding:14px;border-radius:8px}'+
    'table{border-collapse:collapse;font-size:12px;width:100%}th,td{border:1px solid #ccc;padding:5px 6px;text-align:right}th{background:#f0e6d2}td:first-child,th:first-child,td:nth-child(2),th:nth-child(2),td:nth-child(11),th:nth-child(11){text-align:left}'+
    '.miss{background:#fde3dd}.neg{color:#b3261e;font-weight:bold}.small{color:#777;font-size:11px}</style></head><body><h1>'+esc_(title)+'</h1>'+body+'</body></html>';
}

/** Wird nach jedem Tagesabschluss automatisch aufgerufen. */
function sendCloseMail_(c){
  var to=recipients_(); if(!to || !isOn_("tagesbericht per mail")) return;
  var txt=reportText(c);
  var d=Utilities.formatDate(new Date(c.day+"T12:00:00"),TZ,"dd.MM.");
  var subj="Prediger · Abschluss "+d+" · Differenz "+(c.diff>0.004?"+":"")+fmtE(c.diff)+" · "+(c.staff||"");
  var html=page_("Tagesabschluss "+d, "<pre>"+esc_(txt)+"</pre>");
  MailApp.sendEmail({to:to, subject:subj, body:txt, htmlBody:html, name:"Prediger Deckel", attachments:[pdf_(html,"Prediger_Abschluss_"+c.day)]});
}

/** Wochenübersicht (läuft montags automatisch; kann im Editor auch von Hand gestartet werden). */
function wochenbericht(){
  if(!isOn_("wochenbericht per mail")) return;
  var to=recipients_(); if(!to) return;
  var days=[]; for(var i=7;i>=1;i--) days.push(Utilities.formatDate(new Date(Date.now()-i*864e5),TZ,"yyyy-MM-dd"));
  var inRange=function(d){ return days.indexOf(d)>=0; };
  var closes={}; rows_("Abschlüsse").forEach(function(r){ var d=day_(r[1]); if(inRange(d)){ var o=json_(r[20],{}); o.staff=String(r[3]||o.staff||""); if(!closes[d]||o.at>closes[d].at) closes[d]=o; } });
  var sales={}; rows_("Zahlungen").forEach(function(r){ var d=day_(r[1]); if(!inRange(d)) return; var m=methodKey_(r[5]); sales[d]=sales[d]||{bar:0,ec:0,paypal:0,tip:0}; sales[d][m]=(sales[d][m]||0)+num_(r[6]); sales[d].tip+=num_(r[12]||0); });
  var exps={}; rows_("Auslagen").forEach(function(r){ var d=day_(r[1]); if(inRange(d)) exps[d]=(exps[d]||0)+num_(r[4]); });
  var T={bar:0,ec:0,paypal:0,total:0,exp:0,diff:0,take:0,tip:0}, rows="", missing=0;
  days.forEach(function(d){
    var c=closes[d], s=sales[d]; if(!c && !s && !exps[d]) return;
    var label=Utilities.formatDate(new Date(d+"T12:00:00"),TZ,"EEE dd.MM.");
    var v=c||{bar:r2(s?s.bar:0),ec:r2(s?s.ec:0),paypal:r2(s?s.paypal:0),exp:r2(exps[d]||0),tip:r2(s?s.tip:0)};
    v.total=r2((v.bar||0)+(v.ec||0)+(v.paypal||0));
    ["bar","ec","paypal","total","exp","tip"].forEach(function(k){ T[k]+=v[k]||0; });
    if(c){ T.diff+=c.diff||0; T.take+=c.take||0; } else missing++;
    rows+='<tr'+(c?'':' class="miss"')+'><td>'+label+'</td><td>'+(c?esc_(c.staff||""):"⚠ kein Kassensturz")+'</td><td>'+fmtE(v.bar)+'</td><td>'+fmtE(v.ec)+'</td><td>'+fmtE(v.paypal)+
      '</td><td><b>'+fmtE(v.total)+'</b></td><td>'+fmtE(v.tip||0)+'</td><td>'+fmtE(v.exp)+'</td><td'+(c&&c.diff<-0.004?' class="neg"':'')+'>'+(c?(c.diff>0.004?"+":"")+fmtE(c.diff):"–")+'</td><td>'+(c?fmtE(c.take):"–")+'</td><td>'+(c&&c.note?esc_(c.note):"")+'</td></tr>';
  });
  var debts=rows_("Schulden").filter(function(r){ return String(r[5]||"offen")==="offen"; }).map(function(r){ return {name:String(r[1]), rest:num_(r[4]), since:String(r[6]||"")}; }).sort(function(a,b){ return b.rest-a.rest; });
  var debtSum=debts.reduce(function(a,d){ return a+d.rest; },0);
  var openTabs=rows_("Deckel");
  var from=Utilities.formatDate(new Date(days[0]+"T12:00:00"),TZ,"dd.MM."), till=Utilities.formatDate(new Date(days[6]+"T12:00:00"),TZ,"dd.MM.yyyy");
  var body='<p class="small">'+from+' – '+till+(missing?' · <span class="neg">'+missing+' Tag(e) ohne Kassensturz</span>':' · alle Tage abgeschlossen ✓')+'</p>'+
    (rows?'<table><tr><th>Tag</th><th>Kassensturz von</th><th>Bar</th><th>EC</th><th>PayPal</th><th>Gesamt</th><th>Trinkgeld</th><th>Auslagen</th><th>Differenz</th><th>Entnahme</th><th>Notiz</th></tr>'+rows+
    '<tr><th>Summe</th><th></th><th>'+fmtE(T.bar)+'</th><th>'+fmtE(T.ec)+'</th><th>'+fmtE(T.paypal)+'</th><th>'+fmtE(T.total)+'</th><th>'+fmtE(T.tip)+'</th><th>'+fmtE(T.exp)+'</th><th>'+(T.diff>0.004?"+":"")+fmtE(T.diff)+'</th><th>'+fmtE(T.take)+'</th><th></th></tr></table>'
    :'<p>Keine Umsätze in dieser Woche.</p>')+
    '<h1 style="font-size:16px;margin-top:22px">Offene Schulden: '+fmtE(debtSum)+'</h1>'+
    (debts.length?'<table><tr><th>Name</th><th>seit</th><th>offen</th></tr>'+debts.map(function(d){ return '<tr><td>'+esc_(d.name)+'</td><td>'+esc_(d.since)+'</td><td>'+fmtE(d.rest)+'</td></tr>'; }).join("")+'</table>':'<p>Keine.</p>')+
    '<p class="small">Gerade offene Deckel: '+openTabs.length+'. Details stehen in der Google-Tabelle.</p>';
  var html=page_("Prediger · Wochenbericht", body);
  var subj="Prediger · Woche "+from+"–"+till+" · "+fmtE(T.total)+(missing?" · ⚠ "+missing+"× kein Kassensturz":"")+" · Diff "+(T.diff>0.004?"+":"")+fmtE(T.diff);
  MailApp.sendEmail({to:to, subject:subj, htmlBody:html, name:"Prediger Deckel", attachments:[pdf_(html,"Prediger_Woche_"+days[6])]});
}
