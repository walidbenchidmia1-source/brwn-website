const fs = require('fs');

const darkPath = 'c:\\BRWN-Recovery\\BRWN-Restored\\src\\public\\images\\halal_hd.png';
const whitePath = 'c:\\BRWN-Recovery\\BRWN-Restored\\src\\public\\images\\halal_hd_white.png';
const targetPath = 'c:\\BRWN-Recovery\\BRWN-Restored\\src\\src\\components\\HalalSealData.ts';

const blackBuf = fs.readFileSync(darkPath);
const whiteBuf = fs.readFileSync(whitePath);

const blackBase64 = `data:image/png;base64,${blackBuf.toString('base64')}`;
const whiteBase64 = `data:image/png;base64,${whiteBuf.toString('base64')}`;

const fileContent = `export const HALAL_SEAL_DARK = "${blackBase64}";
export const HALAL_SEAL_WHITE = "${whiteBase64}";
`;

fs.writeFileSync(targetPath, fileContent);
console.log('Successfully generated HalalSealData.ts at', targetPath);
