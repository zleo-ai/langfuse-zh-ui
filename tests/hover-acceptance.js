// Actual portal shapes from Langfuse 4.75.0; no application writes or requests.
async function runHoverAcceptance({dictionary,translator}) {
  const checks=[],check=(name,actual,expected)=>checks.push({name,pass:JSON.stringify(actual)===JSON.stringify(expected),...(JSON.stringify(actual)!==JSON.stringify(expected)?{actual,expected}:{})});
  const text=id=>document.getElementById(id).textContent.trim();
  const tick=()=>new Promise(resolve=>setTimeout(resolve,65));
  globalThis.langfuseZhUI?.setEnabled(false);delete globalThis.langfuseZhUI;
  document.title='Tracing | Langfuse';history.replaceState(null,'','/project/fixture/traces');
  const status='You can differentiate the importance of observations with the level attribute to control the verbosity of your traces and highlight errors and warnings.';
  document.body.innerHTML='<a href="https://langfuse.com">Langfuse</a><div id="host"></div>';
  (0,eval)(dictionary);(0,eval)(translator);
  // Every reviewed tooltip key must work inside a mono-styled portal and restore.
  const host=document.getElementById('host'),keys=[...langfuseZhHoverKeys];
  for(const [i,key]of keys.entries()) {
    const trigger=document.createElement('button');trigger.setAttribute('aria-describedby','tip-'+i);trigger.setAttribute('aria-label','More information');host.append(trigger);
    const tip=document.createElement('div');tip.id='tip-'+i;tip.role='tooltip';tip.className='font-mono';tip.textContent=key;host.append(tip);
  }
  const original=host.innerHTML;langfuseZhUI.setEnabled(true);
  check('全部审核悬停词条在等宽浮层翻译',keys.filter((k,i)=>text('tip-'+i)!==langfuseZhDictionary[k]),[]);
  langfuseZhUI.setEnabled(false);check('全部悬停词条完整恢复',host.innerHTML,original);
  host.innerHTML=`<table><thead><tr><th><button aria-controls="status-card" aria-label="More information"></button><button class="peer" aria-label="Select all" id="select-all"></button></th></tr></thead></table>
    <div role="dialog" data-floating-ui-focusable id="status-card"><div class="font-mono" id="status">${status}</div><a href="https://langfuse.com/docs/observability/features/log-levels">Read docs</a></div>
    <button id="columns" title="Show/hide columns">Columns</button><button id="reset" title="Reset playground state">Reset playground</button>
    <table><tr><td><div data-facet-column="name"><fieldset><input id="filter" placeholder="Filter values" value="Save"></fieldset></div></td></tr></table>`;
  langfuseZhUI.setEnabled(true);
  check('截图状态说明浮层',text('status'),langfuseZhDictionary[status]);
  check('原生表头列控制悬停',document.getElementById('columns').getAttribute('title'),'显示或隐藏列');
  check('原生重置按钮悬停',document.getElementById('reset').getAttribute('title'),langfuseZhDictionary['Reset playground state']);
  check('全选按钮无障碍说明',document.getElementById('select-all').getAttribute('aria-label'),'全选');
  check('筛选搜索提示',document.getElementById('filter').getAttribute('placeholder'),'可选筛选值');
  check('筛选搜索输入值保护',document.getElementById('filter').value,'Save');
  langfuseZhUI.setEnabled(false);
  const scenarios=[
    ['Input','<table><tr><td>','</td></tr></table>'],['Save','<table><tr><td>','</td></tr></table>'],['Error','<table><tr><td>','</td></tr></table>'],
    ['Status','<div data-facet-column="name"><fieldset>','</fieldset></div>'],['Metadata','<nav aria-label="breadcrumb">','</nav>'],['Save','<div data-session-message-bubble>','</div>'],
    [status,'<table><tr><td>','</td></tr></table>'],['Price breakdown','<pre>','</pre>'],['Configuration','<div class="prose">','</div>'],
  ];
  for(const [i,[value,prefix,suffix]]of scenarios.entries()) {
    host.innerHTML=`${prefix}<button aria-describedby="raw-tip" title="${value}" id="raw-trigger">${value}</button>${suffix}<div role="tooltip" id="raw-tip">${value}</div>`;
    const before=host.innerHTML;langfuseZhUI.setEnabled(true);check('原始数据悬停保护 '+i,text('raw-tip'),value);check('原始名称保护 '+i,text('raw-trigger'),value);langfuseZhUI.setEnabled(false);check('原始数据恢复 '+i,host.innerHTML,before);
  }
  // Tooltip actions in data tables translate, while their values stay untouched.
  host.innerHTML='<table><tr><td><button aria-describedby="copy-tip" aria-label="Copy to clipboard" id="copy"></button><span id="data">Input</span></td></tr></table><div role="tooltip" id="copy-tip">Copy to clipboard</div>';
  langfuseZhUI.setEnabled(true);check('数据表复制动作悬停',text('copy-tip'),'复制到剪贴板');check('数据表真实值',text('data'),'Input');langfuseZhUI.setEnabled(false);
  host.innerHTML='<button aria-controls="late" aria-label="More information"></button>';langfuseZhUI.setEnabled(true);
  const tip=document.createElement('div');tip.id='late';tip.role='dialog';tip.setAttribute('data-floating-ui-focusable','');tip.innerHTML=`<div class="font-mono" id="late-text">${status}</div><a href="https://langfuse.com/docs">Read docs</a><code id="code">Status</code>`;host.append(tip);await tick();
  check('延迟创建悬停说明',text('late-text'),langfuseZhDictionary[status]);check('提示中的代码保留',text('code'),'Status');
  document.getElementById('late-text').textContent='Use a statusMessage to e.g. provide additional information on a status such as level=ERROR.';await tick();check('同一悬停浮层内容切换',text('late-text'),langfuseZhDictionary['Use a statusMessage to e.g. provide additional information on a status such as level=ERROR.']);
  langfuseZhUI.setEnabled(false);check('浮层切换后恢复新原文',text('late-text'),'Use a statusMessage to e.g. provide additional information on a status such as level=ERROR.');
  const fragments=[
    'A trace represents a single function/api invocation. Traces contain observations. See',
    'A session is a collection of related traces, such as a conversation or thread. To begin, add a sessionId to the trace. See',
    'Attribute data in Langfuse to a user by adding a userId to your traces. See',
  ];
  for(const key of fragments){host.innerHTML='<button aria-controls="fragment" aria-label="More information"></button><div role="dialog" data-floating-ui-focusable id="fragment"><span id="prefix"></span> <a href="https://langfuse.com/docs">docs</a> <span>to learn more.</span></div>';document.getElementById('prefix').textContent=key;const before=host.innerHTML;langfuseZhUI.setEnabled(true);check('含链接的说明正文 '+key.slice(0,20),text('prefix'),langfuseZhDictionary[key]);langfuseZhUI.setEnabled(false);check('含链接的说明恢复 '+key.slice(0,20),host.innerHTML,before);}
  host.innerHTML='<div role="tooltip" id="no-id-test"></div>';const anonymous=document.getElementById('no-id-test');anonymous.removeAttribute('id');anonymous.textContent=status;langfuseZhUI.setEnabled(true);check('无ID的悬停浮层不报错且可翻译',anonymous.textContent,langfuseZhDictionary[status]);langfuseZhUI.setEnabled(false);
  return {passed:checks.filter(c=>c.pass).length,total:checks.length,hoverKeys:keys.length,checks};
}
