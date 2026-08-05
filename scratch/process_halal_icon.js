const fs = require('fs');
const path = require('path');

// Read uploaded file
const inputPath = 'C:\\Users\\walid\\.gemini\\antigravity\\brain\\faff7d25-0239-41d3-b4cd-30a952054f1b\\.user_uploaded\\media_1785967909093.png';
console.log('File size:', fs.statSync(inputPath).size);
