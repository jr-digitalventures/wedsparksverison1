import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export function generateProfileRoutes() {
  const root=path.resolve('dist'), template=fs.readFileSync(path.join(root,'vendor-profile/index.html'),'utf8');
  const routes=JSON.parse(fs.readFileSync(path.join(root,'shared/published-supplier-routes.json'),'utf8'));
  for (const slug of new Set(Object.values(routes))) {
    if (typeof slug!=='string'||!/^[a-z0-9-]+$/.test(slug)) throw new Error('Invalid vendor profile slug.');
    const dir=path.join(root,'vendor-profile',slug);fs.mkdirSync(dir,{recursive:true});
    const html=template.replace('<head>','<head><base href="../">').replaceAll('https://jr-digitalventures.github.io/wedsparksverison1/vendor-profile/"','https://jr-digitalventures.github.io/wedsparksverison1/vendor-profile/'+slug+'/"');
    fs.writeFileSync(path.join(dir,'index.html'),html);
  }
}
if (process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) generateProfileRoutes();
