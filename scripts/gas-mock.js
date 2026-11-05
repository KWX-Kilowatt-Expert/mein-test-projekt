// Minimaler Nachbau der Google-Apps-Script-Dienste, um Code.gs lokal mit Node zu testen.
const fs = require("fs"), vm = require("vm"), path = require("path");

function toCell(v){ // Sheets wandelt Datums-Text automatisch in Datum um
  if(typeof v==="string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(v+"T00:00:00");
  return v===undefined||v===null ? "" : v;
}
class Range{
  constructor(sh,r,c,nr,nc){ Object.assign(this,{sh,r,c,nr,nc}); }
  setValues(vals){ vals.forEach((row,i)=>row.forEach((v,j)=>{ const R=this.r-1+i; while(this.sh.data.length<=R) this.sh.data.push([]); this.sh.data[R][this.c-1+j]=this.sh.text[this.c-1+j]?String(v):toCell(v); })); return this; }
  getValues(){ const out=[]; for(let i=0;i<this.nr;i++){ const row=[]; for(let j=0;j<this.nc;j++){ const v=(this.sh.data[this.r-1+i]||[])[this.c-1+j]; row.push(v===undefined?"":v); } out.push(row); } return out; }
  clearContent(){ for(let i=0;i<this.nr;i++) for(let j=0;j<this.nc;j++){ const row=this.sh.data[this.r-1+i]; if(row) row[this.c-1+j]=""; } return this; }
  setFontWeight(){ return this; }
  setNumberFormat(f){ if(f==="@") this.sh.text[this.c-1]=true; return this; }
}
class Sheet{
  constructor(name){ this.name=name; this.data=[]; this.text={}; this.writes=0; }
  getRange(a,b,c,d){ if(typeof a==="string") return new Range(this,1,a.charCodeAt(0)-64,1000,1); return new Range(this,a,b,c||1,d||1); }
  lastRow(){ let n=this.data.length; while(n>0 && !(this.data[n-1]||[]).some(v=>v!==""&&v!==undefined)) n--; return n; }
  getLastRow(){ return this.lastRow(); }
  getDataRange(){ const w=Math.max(1,...this.data.map(r=>r.length)); return new Range(this,1,1,Math.max(1,this.lastRow()),w); }
  setFrozenRows(){}
}
function makeEnv(){
  const sheets={}, props={}, cache={}, mails=[], triggers=[];
  const SS={ getSheetByName:n=>sheets[n]||null, insertSheet:n=>(sheets[n]=new Sheet(n)), getSpreadsheetTimeZone:()=>"Europe/Berlin" };
  const pad=n=>String(n).padStart(2,"0");
  const ctx={
    console, JSON, Math, Date, Object, String, Number, Array, isNaN, parseFloat,
    SpreadsheetApp:{ getActive:()=>SS, flush(){} },
    PropertiesService:{ getScriptProperties:()=>({ getProperty:k=>k in props?props[k]:null, setProperty:(k,v)=>{props[k]=String(v);} }) },
    CacheService:{ getScriptCache:()=>({ get:k=>k in cache?cache[k]:null, put:(k,v)=>{cache[k]=v;}, remove:k=>{delete cache[k];},
      getAll:ks=>{ const o={}; ks.forEach(k=>{ if(k in cache) o[k]=cache[k]; }); return o; }, putAll:o=>Object.assign(cache,o) }) },
    LockService:{ getScriptLock:()=>({ waitLock(){}, releaseLock(){} }) },
    Utilities:{ newBlob:(c,t,n)=>({getAs:()=>({setName(x){ this.name=x; return this; }})}),
      formatDate:(d,tz,f)=>{ // Testrechner läuft in UTC; reicht für Tests
      return f.replace("yyyy",d.getFullYear()).replace("MM",pad(d.getMonth()+1)).replace("dd",pad(d.getDate())).replace("EEE",["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()]).replace("HH",pad(d.getHours())).replace("mm",pad(d.getMinutes())); } },
    Logger:{ log(){} },
    Session:{ getEffectiveUser:()=>({ getEmail:()=>"chef@example.com" }) },
    MailApp:{ sendEmail:o=>mails.push(o) },
    ScriptApp:{ WeekDay:{MONDAY:"MONDAY"}, getProjectTriggers:()=>triggers,
      newTrigger:h=>{ const b={timeBased:()=>b,onWeekDay:()=>b,atHour:()=>b,inTimezone:()=>b,create:()=>{ triggers.push({getHandlerFunction:()=>h}); }}; return b; } },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname,"..","apps-script","Code.gs"),"utf8"), ctx);
  return {ctx, sheets, props, cache, mails, triggers};
}
module.exports={makeEnv};
