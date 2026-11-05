// Run in the dedicated browser fixture page with { dictionary, translator,
// popup } source strings. No app credentials, API calls or user data needed.
async function runAcceptance({dictionary,translator,popup}) {
  const checks=[];
  const check=(name,actual,expected)=>checks.push({name,pass:JSON.stringify(actual)===JSON.stringify(expected),...(JSON.stringify(actual)!==JSON.stringify(expected)?{actual,expected}:{})});
  const text=id=>document.getElementById(id).textContent.trim();
  const attr=(id,name)=>document.getElementById(id).getAttribute(name);
  const tick=()=>new Promise(r=>setTimeout(r,65));
  const protectedHTML=()=>[...document.querySelectorAll('[data-protected]')].map(e=>e.outerHTML);
  const before=protectedHTML(),body=document.body.innerHTML;
  const native=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');let valueAccess=0;
  Object.defineProperty(HTMLInputElement.prototype,'value',{configurable:true,get(){valueAccess++;return native.get.call(this);},set(v){valueAccess++;native.set.call(this,v);}});
  (0,eval)(dictionary);(0,eval)(translator);
  check('加载代码不会自动改页面',document.body.innerHTML,body);
  check('识别 Langfuse',langfuseZhUI.setEnabled(true),true);
  const expected={nav:'执行记录',skills:'技能',heading:'执行记录',quality:'回答质量',save:'保存',
    'root-label':'顶层步骤（完整执行）','root-true':'是（完整执行）','root-false':'否（内部步骤）',
    type:'模型调用',level:'错误',only:'仅此项','table-head':'输入',rows:'每页行数',
    page:'第 2 / 10 页',total:'共 123 条',tokens:'3,338 Token',error:'错误',
    'tool-label':'工具：request_competition','user-message':'用户消息',thread:'调用轮次 1',json:'消息以 JSON 保存，点击展开'};
  for(const[id,value]of Object.entries(expected))check('翻译 '+id,text(id),value);
  check('搜索提示',text('hint').startsWith('搜索，例如'),true);
  check('搜索框占位',attr('search','placeholder'),'搜索筛选条件');
  check('文本框占位',attr('message','placeholder'),'在此填写用户消息。');
  check('文本框原文',text('message'),'Output');
  check('弹窗标题',text('dialog-title'),'显示列');check('弹窗小标题',text('select-title'),'选择');check('功能预告',text('soon'),'即将推出');
  check('日期选项',text('date-option'),'过去 30 分钟');
  check('真实大小写文案',text('soon-case'),'即将推出');check('筛选弹层标题',text('quality-caption'),'回答质量');
  check('列设置标题',text('column-caption'),'显示列');check('列设置大小写',text('select-case'),'选择');
  check('原文区界面操作',attr('json-action','aria-label'),'查看完整 JSON 数据');check('数据字段展开说明',attr('expand-field','aria-label'),'展开output_field');
  check('无障碍工具说明',attr('tool-label','aria-label'),'工具：request_competition');
  check('动态子轮次说明',attr('nested','aria-label'),'已隐藏 6 个子调用轮次');
  check('动态说明保留自定义名',attr('collapse','aria-label'),'收起完整执行 Output');
  check('原文与同名数据保护',protectedHTML(),before);
  check('不读写输入框值',valueAccess,0);
  langfuseZhUI.setEnabled(false);
  check('逐字恢复含空白与属性',document.body.innerHTML,body);
  langfuseZhUI.setEnabled(true);langfuseZhUI.setEnabled(true);
  document.getElementById('live').firstChild.data='Cancel';
  document.getElementById('slot').innerHTML='<button id="inserted">Open observation</button>';
  document.getElementById('search').setAttribute('placeholder','Search session');
  document.getElementById('live-attribute').setAttribute('aria-label','Collapse Input');
  await tick();
  check('React 同节点更新',text('live'),'取消');check('新面板',text('inserted'),'查看执行步骤');
  check('动态占位',attr('search','placeholder'),'搜索本次对话');
  check('动态无障碍',attr('live-attribute','aria-label'),'收起输入');
  // The app reuses a formerly translated node in a custom-name filter.
  const reused=document.getElementById('live');
  const field=document.querySelector('[data-facet-column="name"] fieldset');field.append(reused);
  await tick();check('移动进数据区后恢复原名',text('live'),'Cancel');
  document.getElementById('slot').append(reused);await tick();check('移动回按钮区重译',text('live'),'取消');
  let mutations=0;const observer=new MutationObserver(rs=>mutations+=rs.length);
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true});
  for(let i=0;i<65;i++) {reused.firstChild.data=i%2?'Save':'Cancel';await new Promise(r=>setTimeout(r,10));}
  reused.firstChild.data='Delete';await tick();const settled=mutations;await tick();observer.disconnect();
  check('连续更新后稳定',text('live'),'删除');check('空闲无修改循环',mutations-settled,0);
  check('更新量有界',mutations<500,true);
  // A synchronous disable must not overwrite an app update awaiting its observer.
  reused.firstChild.data='Application updated label';
  document.getElementById('live-attribute').removeAttribute('aria-label');
  langfuseZhUI.setEnabled(false);
  check('关闭不覆盖新内容',text('live'),'Application updated label');
  check('关闭不恢复已删属性',attr('live-attribute','aria-label'),null);
  check('关闭后数据保护',protectedHTML(),before);
  check('全程不读写输入值',valueAccess,0);
  Object.defineProperty(HTMLInputElement.prototype,'value',native);
  // Detail-page custom headings, links and tree names retain their exact name.
  history.replaceState(null,'','/project/fixture/traces/custom');
  document.body.innerHTML='<h1 id="custom" title="Settings">Settings</h1><button class="peer"><span title="Input" id="tree-name">Input</span></button><a href="/project/fixture/traces/abc" id="entity">Output</a><div role="tablist"><button role="tab" title="Preview" id="detail-tab"><span title="Preview">Preview</span></button></div>';
  langfuseZhUI.setEnabled(true);
  check('实体标题',text('custom'),'Settings');check('树节点名称',text('tree-name'),'Input');check('实体链接',text('entity'),'Output');check('带 title 页签',text('detail-tab'),'预览');
  langfuseZhUI.setEnabled(false);
  history.replaceState(null,'','/project/fixture/sessions/custom');
  document.body.innerHTML='<span class="font-mono" id="trace-count">2 traces</span><span class="font-mono" id="nested-count">2 <span>traces</span></span><article data-session-message-bubble><div class="text-2xs font-mono"><button id="open-step">Open observation</button></div><div class="whitespace-pre-wrap"><button id="user-button">Open observation</button></div></article>';
  langfuseZhUI.setEnabled(true);check('对话执行次数',text('trace-count'),'2 次完整执行');check('真实嵌套执行次数',text('nested-count'),'2 次完整执行');check('消息页脚操作',text('open-step'),'查看执行步骤');check('消息内同名按钮',text('user-button'),'Open observation');langfuseZhUI.setEnabled(false);
  history.replaceState(null,'','/project/fixture/playground');
  document.body.innerHTML='<button id="system">System</button><button id="submit">Submit</button><textarea id="prompt" placeholder="Enter a system message here.">Input</textarea><p class="font-bold" id="model">Model</p>';
  langfuseZhUI.setEnabled(true);
  check('按场景翻译 System',text('system'),'系统指令');check('按场景翻译 Submit',text('submit'),'运行测试');check('试用模型标签',text('model'),'模型');
  check('系统输入提示',attr('prompt','placeholder'),'在此填写系统指令。');check('系统输入原文',text('prompt'),'Input');
  langfuseZhUI.setEnabled(false);
  history.replaceState(null,'','/project/fixture/settings');document.body.innerHTML='<button id="theme">System</button>';
  langfuseZhUI.setEnabled(true);check('主题场景 System',text('theme'),'跟随系统');langfuseZhUI.setEnabled(false);
  history.replaceState(null,'','/project/fixture');
  document.body.innerHTML='<button role="combobox"><span title="Langfuse Home">Langfuse Home</span></button><div class="bg-card"><h3>Observations by time</h3><span id="legend" title="ERROR (Sum: 9)">ERROR</span></div><svg><text data-x-axis-label id="axis">Nov 4, 5:00 PM</text></svg><select><option id="home-option">50th Percentile</option></select><div class="cm-editor"><span class="cm-placeholder" contenteditable="false" id="cm-hint">Enter a user message here.</span><div id="cm-value">Input</div></div>';
  langfuseZhUI.setEnabled(true);check('首页轴时间',text('axis'),'11月4日 17:00');check('首页状态图例',text('legend'),'错误');check('首页图例说明',attr('legend','title'),'错误（合计：9）');check('首页固定选择项',text('home-option'),'中位数（P50）');check('编辑器占位',text('cm-hint'),'在此填写用户消息。');check('编辑器正文',text('cm-value'),'Input');langfuseZhUI.setEnabled(false);
  // Non-Langfuse pages must remain inert, even with exact dictionary words.
  history.replaceState(null,'','/unrelated');document.title='Other product';document.body.innerHTML='<button>Save</button>';
  check('拒绝无关页面',langfuseZhUI.setEnabled(true),false);check('无关页面内容',document.body.textContent,'Save');
  // Real popup script with a transport stub. This exercises success/failure
  // handling, not the native toolbar gesture or activeTab grant.
  document.body.innerHTML='<button id="translate">切换为中文</button><button id="restore">恢复英文</button><p id="status"></p>';
  let mode='ok',calls=[];
  const transport={tabs:{query:async()=>mode==='no-tab'?[]:[{id:17,url:mode==='wrong-url'?'chrome://extensions':'http://127.0.0.1/project/fixture/traces'}]},scripting:{executeScript:async req=>{if(mode==='denied')throw Error('injection denied');calls.push({files:req.files,args:req.args,tab:req.target.tabId});return [{result:mode!=='unrecognized'}];}}};
  const previous=globalThis.chrome;globalThis.chrome=transport;(0,eval)(popup);
  for(const[state,result]of [['ok','中文已启用。'],['unrecognized','当前页面未识别为 Langfuse。'],['no-tab','请先打开 Langfuse 网页。'],['wrong-url','请先打开 Langfuse 网页。'],['denied','未能翻译。请刷新 Langfuse 页面后重试。']]){
    mode=state;document.getElementById('translate').click();await tick();check('弹窗 '+state,text('status'),result);
  }
  mode='ok';document.getElementById('restore').click();await tick();check('弹窗恢复',text('status'),'已恢复英文。');
  check('只注入离线文件',calls.filter(c=>c.files).every(c=>JSON.stringify(c.files)==='["dictionary.js","translate.js"]'&&c.tab===17),true);
  globalThis.chrome=previous;
  return {checks,passed:checks.filter(c=>c.pass).length,total:checks.length,mutations};
}
