/* Validate inline scripts without shell escaping or executing browser code. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
let checked=0;
for(const [index,entry] of scripts.entries()){
 const attrs=entry[1],code=entry[2];
 if(!code.trim())continue;
 if(/\btype\s*=\s*["'](?:application\/json|importmap)["']/i.test(attrs))continue;
 if(/\btype\s*=\s*["']module["']/i.test(attrs)){throw new Error('Inline ES module requires module-aware syntax check: script '+index);}
 new vm.Script(code,{filename:'index.html inline script '+index});checked++;
}
if(checked===0)throw new Error('No inline JavaScript found; check HTML extraction');
console.log('Validated '+checked+' inline JavaScript scripts');
