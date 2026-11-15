const fs = require("fs");
const https = require("https");

https.get("https://api.worldbank.org/v2/country/all/indicator/PA.NUS.PPP?date=2022&format=json&per_page=300", (res) => {
  let data = "";
  res.on("data", (chunk) => data += chunk);
  res.on("end", () => {
    const json = JSON.parse(data)[1];
    const pppData = json.filter(d => d.value !== null && !d.country.value.includes("income") && !d.country.value.includes("dividend")).map(d => ({
      country: d.country.value,
      index: d.value,
      symbol: ""
    }));
    
    // Sort alphabetically but put USA and India at the top
    const sorted = pppData.sort((a, b) => a.country.localeCompare(b.country));
    
    const india = sorted.find(d => d.country === "India");
    const indiaIndex = india ? india.index : 22.88;
    
    const fileContent = `export const INDIA_PPP_INDEX = ${indiaIndex};\n\nexport const PPP_DATA = ${JSON.stringify(sorted, null, 2)};\n`;
    fs.writeFileSync("src/data/pppData.js", fileContent);
    console.log("Written " + sorted.length + " countries");
  });
});
