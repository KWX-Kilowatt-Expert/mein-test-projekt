// Baut bar-deckel/index.html: dieselbe App wie in Google, aber ohne Server (Demo, Daten nur im Browser).
const fs=require("fs"), path=require("path"), {makeEnv}=require("./gas-mock");
const root=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(root,"apps-script","index.html"),"utf8");
const shared=makeEnv().ctx.sharedSource();
fs.writeFileSync(path.join(root,"bar-deckel","index.html"), html.replace("<?!= sharedSource() ?>", ()=>shared));
console.log("bar-deckel/index.html gebaut");
