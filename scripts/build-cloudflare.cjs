#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),target=path.join(root,'dist-cloudflare');
const cache=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const list=cache.match(/const FILES=\[(.*?)\];/s);
if(!list)throw Error('Service-worker asset list missing; cannot safely package public files');
const entries=[...list[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
const required=['index.html','manifest.webmanifest','sw.js'];
const assets=new Set(required);
for(const entry of entries){
  const pathname=entry.split('?')[0];
  if(pathname==='./')continue;
  if(!/^\.\/[a-z0-9][a-z0-9._-]*\.(?:html|js|css|svg|webmanifest)$/i.test(pathname))throw Error('Unsafe or unsupported browser asset: '+entry);
  assets.add(pathname.slice(2));
}
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const match of index.matchAll(/(?:src|href)=["']\.\/([^"']+)["']/g)){
  const file=match[1].split('?')[0];
  if(!assets.has(file))throw Error('HTML asset not cached/packaged: '+file);
}
fs.rmSync(target,{recursive:true,force:true});fs.mkdirSync(target,{recursive:true});
for(const name of assets){
  const input=path.join(root,name);
  if(!fs.statSync(input).isFile())throw Error('Non-file browser asset: '+name);
  fs.copyFileSync(input,path.join(target,name));
}
console.log('Prepared '+assets.size+' public browser assets for Cloudflare; no user data or test files included.');
