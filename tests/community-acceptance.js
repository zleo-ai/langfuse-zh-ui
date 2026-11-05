async function runCommunityAcceptance({dictionary,translator,catalog}) {
 const checks=[],check=(name,actual,expected)=>checks.push({name,pass:JSON.stringify(actual)===JSON.stringify(expected),...(JSON.stringify(actual)!==JSON.stringify(expected)?{actual,expected}:{})});
 globalThis.langfuseZhUI?.setEnabled(false);delete globalThis.langfuseZhUI;history.replaceState(null,'','/project/fixture/traces');document.title='Tracing | Langfuse';
 document.body.innerHTML='<a href="https://langfuse.com">Langfuse</a><main id="ui"></main><table><tbody id="data"></tbody></table>';
 (0,eval)(dictionary);(0,eval)(translator);const ui=document.getElementById('ui'),data=document.getElementById('data');
 const entries=catalog.entries.filter(e=>e.status==='translated'&&e.text!=='traces');for(const e of entries){const p=document.createElement('p');p.textContent=e.text;ui.append(p);const tr=document.createElement('tr'),td=document.createElement('td');td.textContent=e.text;tr.append(td);data.append(tr);}
 const raw=data.innerHTML,start=performance.now();langfuseZhUI.setEnabled(true);const elapsed=performance.now()-start;
 check('全部新增静态文案在普通界面中匹配',entries.filter((e,i)=>ui.children[i].textContent!==langfuseZhDictionary[e.text]).map(e=>e.text),[]);check('全部同名原始数据不变',data.innerHTML,raw);check('批量翻译在合理时间内完成',elapsed<15000,true);langfuseZhUI.setEnabled(false);check('批量原文恢复',entries.every((e,i)=>ui.children[i].textContent===e.text),true);
 const words={Start:'开始',End:'结束',Close:'关闭',Open:'打开',Expand:'展开',Collapse:'收起',Enable:'启用',Disable:'停用',Hide:'隐藏',Show:'显示',Restore:'恢复',Delete:'删除',trace:'完整执行',Trace:'完整执行',observation:'执行步骤',Observation:'执行步骤',project:'项目',organization:'组织',personal:'个人',Project:'项目',Organization:'组织',Personal:'个人',enabled:'已启用',disabled:'已停用',updated:'更新',created:'创建',positive:'正向',negative:'负向',file:'文件',folder:'文件夹',requested:'请求',loaded:'加载',ERROR:'错误',WARNING:'警告',DEBUG:'调试',DEFAULT:'常规'};
 const templates=catalog.templates.filter(e=>e.status==='translated-template'),samples=[];
 for(const [i,e]of templates.entries())for(let variant=0;variant<2;variant++){
   const slots=e.slots.map((s,n)=>s.choices?s.choices[variant%s.choices.length]:/showTarget/.test(s.expression)?variant?' (Observation)':'':/length|count|Count|version|Version|index|number|MAX_|LIMIT|THRESHOLD|totalCount|displayCount/.test(s.expression)?String(17+n):variant?'Input':'样本_'+i+'_'+n);
   const source=e.parts.map(p=>typeof p==='string'?p:slots[p.slot]).join('');let expected=e.translation.replaceAll('\\n','\n').replace(/\{(\d+)(:ui)?\}/g,(_,n,translate)=>translate?(words[slots[+n]]||langfuseZhDictionary[slots[+n]]||slots[+n]):slots[+n]);if(source==='Collapse Input')expected='收起输入';if(source==='Expand Input')expected='展开输入';samples.push({source,expected});
 }
 ui.innerHTML='';data.innerHTML='';for(const s of samples){const b=document.createElement('button');b.textContent=s.source;ui.append(b);const tr=document.createElement('tr'),td=document.createElement('td');td.textContent=s.source;tr.append(td);data.append(tr);}
 const before=data.innerHTML;langfuseZhUI.setEnabled(true);check('动态提示保留名称与数字',samples.flatMap((s,i)=>ui.children[i].textContent===s.expected?[]:[{index:i,source:s.source,actual:ui.children[i].textContent,expected:s.expected}]),[]);check('动态提示同名数据保护',data.innerHTML,before);langfuseZhUI.setEnabled(false);check('动态提示恢复',samples.every((s,i)=>ui.children[i].textContent===s.source),true);
 document.body.innerHTML='<main id="specific"></main>';const cases=[
 ['Unknown field "billing_key"','未知字段“billing_key”'],['Delete Input?','删除 Input？'],
 ['Show all 12 scores','显示全部 12 个评分'],['Version 8 is now available.','版本 8 现已可用。'],['Strong positive linear correlation','很强的正向线性相关'],['2 observations | Most frequent: billing (8)','2 个执行步骤｜最常见：billing（8）'],
 ];
 for(const[s]of cases){const b=document.createElement('button');b.textContent=s;document.getElementById('specific').append(b);}langfuseZhUI.setEnabled(true);for(const[i,[s,v]]of cases.entries())check('实际文案 '+s,document.getElementById('specific').children[i].textContent,v);langfuseZhUI.setEnabled(false);
 document.body.innerHTML='<nav aria-label="导航路径"><button title="No output">No output</button></nav><div class="prose">No output</div><pre>Source code</pre><div contenteditable="true">No output</div><input value="Delete Input?"><span title="Source code">Source code</span>';const protectedHTML=document.body.innerHTML;langfuseZhUI.setEnabled(true);check('名称代码编辑器及输入值完整保护',document.body.innerHTML,protectedHTML);langfuseZhUI.setEnabled(false);
 document.title='Sign in | Langfuse';langfuseZhUI.setEnabled(true);check('浏览器页标题',document.title,'登录 | Langfuse');langfuseZhUI.setEnabled(false);check('页标题恢复',document.title,'Sign in | Langfuse');
 return {passed:checks.filter(c=>c.pass).length,total:checks.length,staticKeys:entries.length,templateSamples:samples.length,elapsedMs:elapsed,checks};
}
