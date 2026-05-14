const https = require('https');
const fs = require('fs');
https.get('https://res.cloudinary.com/dip14vkem/image/upload/v1756568241/logo_t37blz.png', (res) => {
  let data = [];
  res.on('data', (c) => data.push(c));
  res.on('end', () => {
    fs.writeFileSync('./src/lib/logo-base64.ts', 'export const ZAP_LOGO_B64 = "data:image/png;base64,' + Buffer.concat(data).toString('base64') + '";\n');
    console.log('Done!');
  });
});
