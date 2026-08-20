const fs = require("fs");
const file = "c:/Users/User/Desktop/Club_Demo_2026_July/frontend/components/SunmiPrinterService.ts";
const content = fs.readFileSync(file, "utf8");
const lines = content.split("\n");
lines.forEach((line, idx) => {
  if (line.includes("companySettingsStore")) {
    console.log(`${idx + 1}: ${line}`);
  }
});
