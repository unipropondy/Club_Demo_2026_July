const fs = require('fs');
const path = require('path');

function fixJcenter(filePath) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('jcenter()')) {
      content = content.replace(/jcenter\(\)/g, 'mavenCentral()');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed jcenter() in ${filePath}`);
    }
  }
}

// 1. Fix react-native-thermal-printer build.gradle
const thermalPrinterGradle = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-thermal-printer',
  'android',
  'build.gradle'
);
fixJcenter(thermalPrinterGradle);

// 2. Scan node_modules for any other build.gradle files containing jcenter()
function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '.bin' && entry.name !== 'android' && entry.name !== '.git') {
        scanDir(fullPath);
      }
    } else if (entry.isFile() && entry.name === 'build.gradle') {
      fixJcenter(fullPath);
    }
  }
}

try {
  const nodeModulesDir = path.join(__dirname, '..', 'node_modules');
  scanDir(nodeModulesDir);
} catch (e) {
  console.warn('Scan node_modules warn:', e.message);
}
