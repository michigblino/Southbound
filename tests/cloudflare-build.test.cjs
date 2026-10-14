const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist-cloudflare');
test('Cloudflare public bundle copies all cache-listed browser assets, and no private data',()=>{
 try{
  const res=cp.spawnSync(process.execPath,[path.join(root,'scripts/build-cloudflare.cjs')],{cwd:root,encoding:'utf8'});
  assert.equal(res.status,0,res.stderr);
  const assets=fs.readdirSync(dist);
  assert.ok(assets.includes('index.html')&&assets.includes('sw.js')&&assets.includes('manifest.webmanifest'));
  assert.ok(assets.includes('trip-reprice.js')&&assets.includes('booking-ledger.js'));
  for(const name of assets)assert.match(name,/^[a-z0-9][a-z0-9._-]*\.(?:html|js|css|svg|webmanifest)$/i);
  for(const name of ['README.md','wrangler.jsonc','package.json','.env','node_modules','tests','scripts','AI_HANDOFF_AND_AUDIT.md'])assert.equal(assets.includes(name),false);
  const wrangler=JSON.parse(fs.readFileSync(path.join(root,'wrangler.jsonc'),'utf8'));
  assert.equal(wrangler.name,'southbound-web');
  assert.equal(wrangler.routes[0].pattern,'southbound.realguesser.app');
  assert.equal(wrangler.assets.directory,'./dist-cloudflare');
 }finally{fs.rmSync(dist,{recursive:true,force:true})}
});
