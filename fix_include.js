const fs = require('fs');
const files = [
  'backend/src/controllers/submissionController.js'
];
for (let file of files) {
  let content = fs.readFileSync(file, 'utf8');
  // replace
  // include: {
  //   type: true,
  //   standardId: true
  // }
  // with
  // include: { type: true }
  content = content.replace(/include:\s*\{\s*type:\s*true,\s*standardId:\s*true\s*\}/g, 'include: { type: true }');
  
  // Also for the weird indentation:
  // include: {
  // type: true,
  //               standardId: true
  //             }
  content = content.replace(/include:\s*\{\s*type:\s*true,\s*standardId:\s*true\s*\}/g, 'include: { type: true }');
  
  fs.writeFileSync(file, content);
}
console.log('Fixed');
