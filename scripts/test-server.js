// Testet Code.gs (Server) mit nachgebauter Google-Tabelle: node scripts/test-server.js
const assert=require("assert"), {makeEnv}=require("./gas-mock");
const {ctx,sheets}=makeEnv();
const api=r=>JSON.parse(JSON.stringify(ctx.api(r)));
let n=0; const op=(o)=>Object.assign({id:"op"+(++n), at:Date.UTC(2026,10,5,20,0)+n*60000, day:"2026-11-05", staff:"Lisa"},o);

assert.deepStrictEqual(api({pin:"1234",ops:[]}), {ok:false,error:"pin"});
let r=api({pin:"0000",since:0,ops:[]});
assert.ok(r.ok && r.state.menu.length>100, "Karte geladen");
// erster Lesezugriff legt die Tabelle an; Karte wird beim ersten Schreiben befüllt
r=api({pin:"0000",ops:[op({t:"open",tab:"T1",area:"ba",name:"Rudi"})]});
assert.strictEqual(sheets.Karte.lastRow()-1, r.state.menu.length, "Karte in Tabelle geschrieben");
const add=(item,d,name,price)=>op({t:"add",tab:"T1",item,d,name,price});
r=api({pin:"0000",ops:[add("buble-dunkel-halbe",1,"Büble Dunkel (Halbe)",6),add("buble-dunkel-halbe",1,"Büble Dunkel (Halbe)",6),add("cuba-libre",1,"Cuba Libre",8.5)]});
assert.strictEqual(ctx.tabTotal(r.state.tabs[0]), 20.5);
// Wiederholung nach Netzfehler darf nicht doppelt buchen
const dup=add("cuba-libre",1,"Cuba Libre",8.5);
api({pin:"0000",ops:[dup]}); r=api({pin:"0000",ops:[dup]});
assert.strictEqual(r.state.tabs[0].items["cuba-libre"],2, "kein Doppelbuchen");
assert.strictEqual(sheets.Deckel.data[1][6], "2× Büble Dunkel (Halbe), 2× Cuba Libre");
// Teilzahlung EC
r=api({pin:"0000",ops:[op({t:"pay",tab:"T1",sel:{"cuba-libre":1},method:"ec",pid:"P1"})]});
assert.strictEqual(r.state.payments[0].amount,8.5); assert.strictEqual(r.state.payments[0].kind,"teil");
// Rest anschreiben
r=api({pin:"0000",ops:[op({t:"pay",tab:"T1",sel:{"cuba-libre":1,"buble-dunkel-halbe":2},method:"schulden",pid:"D1",debtName:"Rudi",note:"zahlt Freitag"})]});
assert.strictEqual(r.state.tabs.length,0); assert.strictEqual(r.state.debts[0].amount,20.5);
assert.strictEqual(sheets.Deckel.lastRow(),1, "Deckel-Blatt leer");
// Schulden in zwei Raten
r=api({pin:"0000",ops:[op({t:"debtPay",debt:"D1",amount:10,method:"paypal",pid:"P2"})]});
assert.strictEqual(r.state.debts[0].status,"offen");
r=api({pin:"0000",ops:[op({t:"debtPay",debt:"D1",amount:50,method:"bar",pid:"P3"})]});
assert.strictEqual(r.state.debts[0].status,"bezahlt"); assert.strictEqual(r.state.payments[2].amount,10.5, "nicht mehr als offen");
// Auslage, Karte, neu laden aus Tabelle
r=api({pin:"0000",ops:[op({t:"expense",pid:"E1",what:"Zitronen",amount:12.4}), op({t:"menuSet",item:{id:"m-z1",cat:"Zigarren",name:"Cohiba Siglo II",price:24,desc:""}})]});
const fresh=api({pin:"0000",since:-1,ops:[]}).state;
assert.strictEqual(fresh.payments.length,3); assert.strictEqual(fresh.payments[0].day,"2026-11-05", "Datum aus Tabelle korrekt");
assert.strictEqual(fresh.payments[1].method,"paypal");
assert.deepStrictEqual(fresh.expenses.map(e=>e.amount),[12.4]);
assert.ok(fresh.menu.find(m=>m.cat==="Zigarren" && m.price===24));
assert.strictEqual(fresh.debts[0].status,"bezahlt");
assert.strictEqual(fresh.stats["cuba-libre"],2);
assert.deepStrictEqual(fresh.regulars,["Rudi"]);
// Chef ändert Preis direkt in der Tabelle (als Text mit Komma) → App übernimmt
const row=sheets.Karte.data.findIndex(r=>r[0]==="cuba-libre"); sheets.Karte.data[row][3]="9,00";
const before=fresh; ctx.onEdit();
const r2=api({pin:"0000",since:r.rev,ops:[]});
assert.ok(r2.state, "neuer Stand nach Bearbeitung"); assert.strictEqual(r2.state.menu.find(m=>m.id==="cuba-libre").price,9);
// Zeile ohne ID in der Karte bekommt eine
sheets.Karte.data.push(["","Zigarren","Montecristo No. 4",18,""]);
r=api({pin:"0000",ops:[op({t:"resetStats"})]});
assert.ok(r.state.menu.find(m=>m.id==="montecristo-no-4")); assert.ok(sheets.Karte.data.some(x=>x[0]==="montecristo-no-4"));
console.log("Alle Server-Tests bestanden ✓  ("+sheets.Zahlungen.lastRow()+" Zeilen in Zahlungen inkl. Kopf)");
