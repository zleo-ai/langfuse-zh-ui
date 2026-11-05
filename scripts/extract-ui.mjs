import fs from 'node:fs/promises';import path from 'node:path';import vm from 'node:vm';
import ts from 'typescript';
import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');if(!process.argv[2])throw Error('Usage: node scripts/extract-ui.mjs /path/to/langfuse/web/src');const root=path.resolve(process.argv[2]),out=path.join(base,'catalog');const commit=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
const ctx={};vm.runInNewContext(await fs.readFile(path.join(base,'extension/dictionary.js'),'utf8'),ctx);const dictionary=ctx.langfuseZhDictionary;
const records=[];const files=[];async function walk(p){for(const e of await fs.readdir(p,{withFileTypes:true})){if(e.name.startsWith('__')||e.name==='server'||e.name==='node_modules')continue;const f=path.join(p,e.name);if(e.isDirectory())await walk(f);else if(/\.tsx?$/.test(e.name)&&!/(?:stories|test|spec|mock|fixture)\./i.test(e.name))files.push(f);}}await walk(root);
const properties=new Set(['label','title','description','placeholder','emptyMessage','emptyText','helpText','message','tooltip','tooltipContent','buttonText','submitButtonText','aria-label','alt','header','headerName','content','helperText','triggerText','emptyStateMessage','noResultsMessage','tooltipText','searchPlaceholder','confirmText','confirmMessage','caption','loadingText','errorMessage','cancelText','buttonLabel','subtitle','subTitle','heading','summary','deleteText','successMessage','failureMessage']);
const normalize=s=>s.replace(/&apos;|&#39;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/\s+/g,' ').trim();
for(const file of files){const raw=await fs.readFile(file,'utf8'),sf=ts.createSourceFile(file,raw,ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS),local=[];
 const add=(n,text,kind)=>{const key=normalize(text);if(!/[A-Za-z]{2}/.test(key)||key.length>2200||/^https?:|^\/[\w/]|^[\w.-]+@/.test(key))return;const loc=sf.getLineAndCharacterOfPosition(n.getStart(sf));local.push({file:path.relative(root,file).replaceAll('\\','/'),line:loc.line+1,kind,text:key,covered:Object.hasOwn(dictionary,key)});};
 const tag=n=>n?.tagName?.getText(sf)||'';
 const visibleExpression=n=>!ts.isJsxAttribute(n.parent)||properties.has(n.parent.name.getText(sf));
 const codeAncestor=n=>{for(let p=n.parent;p;p=p.parent)if(ts.isJsxElement(p)&&/^(?:pre|code|CodeBlock|CodeMirror|CodeMirrorEditor|JsonEditor)$/.test(tag(p.openingElement)))return true;return false;};
 function visit(n){
  if(ts.isJsxText(n)&&!codeAncestor(n))add(n,n.text,'jsx');
  if((ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))&&!codeAncestor(n)){
   const p=n.parent;
   if(ts.isJsxAttribute(p)&&properties.has(p.name.getText(sf)))add(n,n.text,'attribute');
   else if(ts.isPropertyAssignment(p)&&properties.has(p.name.getText(sf).replaceAll('"','').replaceAll("'",'')))add(n,n.text,'property');
   else if(ts.isJsxExpression(p)&&visibleExpression(p))add(n,n.text,'expression');
   else if(ts.isCallExpression(p)&&/\.(?:min|max|length|email|url|regex|refine)$/.test(p.expression.getText(sf))&&/[a-zA-Z]{2}.*[ .!?:]/.test(n.text))add(n,n.text,'validation');
   else if(ts.isNewExpression(p)&&p.expression.getText(sf)==='Error')add(n,n.text,'client-error');
   else if(ts.isConditionalExpression(p)||ts.isBinaryExpression(p)){let q=p;while(q.parent&&(ts.isConditionalExpression(q.parent)||ts.isBinaryExpression(q.parent)||ts.isParenthesizedExpression(q.parent)))q=q.parent;if(ts.isJsxExpression(q.parent)&&visibleExpression(q.parent))add(n,n.text,'expression');}
   else if(ts.isConditionalExpression(p)&&p.parent&&ts.isJsxExpression(p.parent)&&visibleExpression(p.parent))add(n,n.text,'conditional');
   else if(ts.isCallExpression(p)&&/toast|notify|showError|showSuccess/.test(p.expression.getText(sf)))add(n,n.text,'notification');
  }
  if(ts.isTemplateExpression(n)&&n.parent&&((ts.isJsxExpression(n.parent)&&ts.isJsxAttribute(n.parent.parent)&&properties.has(n.parent.parent.name.getText(sf)))||(ts.isPropertyAssignment(n.parent)&&properties.has(n.parent.name.getText(sf))))){add(n,n.getText(sf),'dynamic');}
  ts.forEachChild(n,visit);
 }visit(sf);records.push(...local);
}
const publicRecords=records.filter(r=>!r.file.startsWith('ee/')&&!r.file.startsWith('pages/api/')).map(({covered,...r})=>r);await fs.writeFile(out+'/source-inventory.json',JSON.stringify({sourceCommit:commit,scannedFiles:files.length,records:publicRecords},null,2)+'\n');console.log({scannedFiles:files.length,records:publicRecords.length,sourceCommit:commit});
