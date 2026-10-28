import {build} from 'esbuild';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
await mkdir(resolve(root,'docs/fitamaster'),{recursive:true});
await build({entryPoints:[resolve(root,'src/fitamaster/app.mjs')],outfile:resolve(root,'docs/fitamaster/portal.js'),bundle:true,format:'esm',platform:'browser',target:['es2022'],minify:true,legalComments:'linked',sourcemap:false,define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'public-config',setup(api){api.onResolve({filter:/docs\/fitamaster\/config\.mjs$/},()=>({path:'./config.mjs',external:true}));}}]});
// Preserve third-party license notices beside the locally served bundle.
const manifest=JSON.parse(await readFile(resolve(root,'node_modules/@supabase/supabase-js/package.json'),'utf8'));
if(manifest.version!=='2.112.4')throw new Error('Unexpected Supabase dependency version.');
await writeFile(resolve(root,'docs/fitamaster/DEPENDENCIES.txt'),'Locally bundled dependencies are pinned by package-lock.json.\nSupabase JS '+manifest.version+' — MIT\nesbuild is a build-time dependency.\n');
await copyFile(resolve(root,'node_modules/@supabase/supabase-js/LICENSE'),resolve(root,'docs/fitamaster/SUPABASE-LICENSE.txt'));
console.log('Built isolated /fitamaster portal with Supabase JS '+manifest.version+'.');
