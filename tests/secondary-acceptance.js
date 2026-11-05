// UI regression fixtures only. Does not require Langfuse credentials or a model.
async function runSecondaryAcceptance({dictionary,translator}) {
  const checks=[],check=(name,actual,expected)=>checks.push({name,pass:JSON.stringify(actual)===JSON.stringify(expected),...(JSON.stringify(actual)!==JSON.stringify(expected)?{actual,expected}:{})});
  const text=id=>document.getElementById(id).textContent.trim();
  const tick=()=>new Promise(resolve=>setTimeout(resolve,65));
  globalThis.langfuseZhUI?.setEnabled(false);delete globalThis.langfuseZhUI;
  document.title='Settings | Langfuse';history.replaceState(null,'','/project/fixture/playground');
  document.body.innerHTML=`<a href="https://langfuse.com">Langfuse</a>
    <aside id="support"><header><nav aria-label="breadcrumb"><span aria-current="page" id="support-title">Support</span></nav><button aria-label="Close">Close</button></header>
    <h2 id="ask">Ask AI</h2><p id="help-description">Get instant, helpful answers. Our AI knows the docs, examples, and best practices to guide you fast.</p><a id="ask-link" href="https://langfuse.com/docs/ask-ai">Chat with AI</a>
    <h3 id="support-docs">Docs</h3><a id="hours" href="https://lu.ma/langfuse">Community Hours ↗</a><a href="https://github.com/langfuse/langfuse" id="github">GitHub ↗</a></aside>
    <div role="dialog"><h2 id="schema">Structured Output</h2><p id="schema-desc">Configure JSON schema for structured output.</p><p id="schema-empty">No schema provided.</p><input id="schema-search" placeholder="Search schemas..." value="Save"><button id="schema-create">Create new schema</button>
    <div role="listbox"><div role="option" id="schema-custom" title="Structured Output">Structured Output</div><div role="option" id="schema-custom2">Input</div></div>
    <div class="cm-editor"><div class="cm-placeholder" contenteditable="false" id="editor-hint">Enter an assistant message here.</div><div contenteditable="true" id="editor-data">Structured Output Save</div></div><pre id="json">{"Input":"Save"}</pre>
    <label for="fixed">Data type</label><button role="combobox" id="fixed" title="NUMERIC" aria-controls="types"><span title="NUMERIC" id="selected">NUMERIC</span></button>
    <label for="custom">Model</label><button role="combobox" id="custom" title="Input" aria-controls="models"><span title="Input" id="model-name">Input</span></button>
    </div><div role="listbox" id="types"><div role="option" id="numeric" title="NUMERIC">NUMERIC</div><div role="option" id="category">CATEGORICAL</div><div role="option" id="boolean">BOOLEAN</div><div role="option" id="type-text">TEXT</div></div>
    <div role="listbox" id="models"><div role="option" id="model-option">Input</div></div>
    <button class="font-mono" id="assistant">Assistant</button><button class="font-mono" id="developer">Developer</button>
    <button id="copy" aria-label="Copy to clipboard">Copy to clipboard</button><button id="copy-code">Copy code</button>
    <section role="dialog"><h3 id="pricing">Pricing Tiers</h3><p id="pricing-desc">Define pricing rules evaluated in priority order. Tiers are checked from top to bottom until conditions match.</p><input id="key" type="password" value="private-input"></section>
    <nav aria-label="breadcrumb"><button id="org">Support</button></nav><a href="/project/custom" id="custom-link">Support</a><h1 title="Settings" id="custom-heading">Settings</h1>
    <div class="prose" id="markdown"><h2>Support</h2><p>Copy to clipboard</p></div><table><tr><td id="table-data">Structured Output</td></tr></table>`;
  const original=document.body.innerHTML;
  (0,eval)(dictionary);(0,eval)(translator);check('启用',langfuseZhUI.setEnabled(true),true);
  const expected={'support-title':'帮助与支持',ask:'咨询 AI 助手','ask-link':'与 AI 助手交流','support-docs':'使用文档',hours:'社区交流活动 ↗',github:'GitHub ↗',schema:'结构化输出','schema-desc':'用 JSON Schema 规定模型回答的数据格式。','schema-empty':'尚未设置输出格式。','schema-create':'创建新输出格式',selected:'数值',numeric:'数值',category:'分类',boolean:'是非','type-text':'文本',assistant:'助手',developer:'开发者指令',copy:'复制到剪贴板','copy-code':'复制代码',pricing:'分档价格','editor-hint':'在此填写助手消息。'};
  for(const [id,value]of Object.entries(expected))check('二级界面 '+id,text(id),value);
  check('帮助描述不残留英文',text('help-description').includes('Get instant'),false);
  check('搜索占位',document.getElementById('schema-search').getAttribute('placeholder'),'搜索输出格式…');
  for(const [id,value]of Object.entries({'schema-custom':'Structured Output','schema-custom2':'Input','editor-data':'Structured Output Save',json:'{"Input":"Save"}','model-name':'Input','model-option':'Input',org:'Support','custom-link':'Support',markdown:'SupportCopy to clipboard','table-data':'Structured Output'}))check('保护 '+id,text(id),value);
  check('输入框值未改变',document.getElementById('schema-search').value,'Save');check('密钥未改变',document.getElementById('key').value,'private-input');
  langfuseZhUI.setEnabled(false);check('整个二级界面逐字恢复',document.body.innerHTML,original);
  document.body.innerHTML='<button id="message-system">System</button><div role="menu"><button role="menuitemradio" id="theme-system">System</button></div>';langfuseZhUI.setEnabled(true);check('试用页的消息角色',text('message-system'),'系统指令');check('试用页主题跟随系统',text('theme-system'),'跟随系统');langfuseZhUI.setEnabled(false);
  history.replaceState(null,'','/project/fixture/prompts/example');document.body.innerHTML='<button class="font-mono" id="prompt-role">System</button>';langfuseZhUI.setEnabled(true);check('提示词详情的消息角色',text('prompt-role'),'系统指令');langfuseZhUI.setEnabled(false);
  history.replaceState(null,'','/project/fixture/skills/new');document.body.innerHTML='<button aria-label="Open local draft" aria-current="page"><span title="Draft" id="skill-draft">Draft</span><span title="Unreleased local changes" id="skill-changes">Unreleased local changes</span></button><span class="group/badge" title="Editing draft" id="skill-mode">Editing draft</span><span class="font-mono" title="Draft" id="file-name">Draft</span>';langfuseZhUI.setEnabled(true);check('技能草稿标记',text('skill-draft'),'草稿');check('技能未发布提示',text('skill-changes'),'尚未发布的本地更改');check('技能编辑状态',text('skill-mode'),'正在编辑草稿');check('同名文件保护',text('file-name'),'Draft');langfuseZhUI.setEnabled(false);
  document.body.innerHTML='<div role="dialog"><button role="presentation"><input type="file"><p title="Upload files" id="upload-title">Upload files</p><p title="Drag and drop or click to upload" id="upload-help">Drag and drop or click to upload</p><span title="Input" id="upload-filename">Input</span></button></div>';langfuseZhUI.setEnabled(true);check('上传区域标题',text('upload-title'),'上传文件');check('上传区域操作提示',text('upload-help'),'拖放文件或点击上传');check('上传文件名称保护',text('upload-filename'),'Input');langfuseZhUI.setEnabled(false);
  document.body.innerHTML='<div role="menu"><div role="menuitem"><div title="Light mode" id="icon-tooltip"><svg></svg></div></div></div><div role="dialog"><h2>Add new member to the organization</h2><button role="combobox" aria-controls="roles"><svg class="lucide-user"></svg><span title="Member" id="invite-role">Member</span></button></div><div role="listbox" id="roles"><div role="option" id="invite-role-option">Member</div></div><div role="option" title="Reflects your current table settings without applying any saved custom table views"><span id="system-view">My view (default)</span></div><div role="option" title="My view (default)" id="named-view">My view (default)</div>';
  langfuseZhUI.setEnabled(true);check('无文字图标提示',document.getElementById('icon-tooltip').getAttribute('title'),'浅色模式');check('邀请表单角色',text('invite-role'),'成员');check('邀请角色选项',text('invite-role-option'),'成员');check('系统默认视图名称',text('system-view'),'我的视图（默认）');check('自定义视图名称保留',text('named-view'),'My view (default)');langfuseZhUI.setEnabled(false);
  history.replaceState(null,'','/organization/fixture/settings/feature-previews');document.body.innerHTML='<table><tr><td id="feature-label">Session Timeline</td><td><button role="switch" aria-label="Toggle Session Timeline organization default" id="feature-toggle"></button></td></tr></table>';langfuseZhUI.setEnabled(true);check('固定功能设置矩阵',text('feature-label'),'会话时间线');check('功能开关说明',document.getElementById('feature-toggle').getAttribute('aria-label'),'切换会话时间线的组织默认设置');langfuseZhUI.setEnabled(false);
  history.replaceState(null,'','/account/settings');document.body.innerHTML='<h1>Account Settings</h1><a href="/account/settings">General</a><a href="/auth/reset-password">Change Password</a>';
  check('识别账户设置',langfuseZhUI.setEnabled(true),true);check('账户设置与子导航',document.body.innerText,'账户设置\n常规修改密码');langfuseZhUI.setEnabled(false);
  history.replaceState(null,'','/organization/fixture/settings');document.body.innerHTML='<p>Your Organization is currently named "<b id="org-data">Save</b>".</p><form id="rename-organization-form"><input id="rename-name" placeholder="Input"></form>';
  langfuseZhUI.setEnabled(true);check('设置说明内的组织名保留',text('org-data'),'Save');check('名称占位提示保留',document.getElementById('rename-name').getAttribute('placeholder'),'Input');langfuseZhUI.setEnabled(false);
  history.replaceState(null,'','/project/fixture/widgets/new');document.body.innerHTML='<label for="source">View</label><button role="combobox" id="source" aria-controls="source-options" title="Observations"><span title="Observations">Observations</span></button><div role="listbox" id="source-options"><div role="option" id="source-choice">Scores Numeric</div></div><label for="breakdown">Breakdown Dimension (Optional)</label><button role="combobox" id="breakdown" title="None">None</button><button aria-label="Date range" title="Past 7 days" id="date-preset">Past 7 days</button>';
  langfuseZhUI.setEnabled(true);check('图表数据来源选项',text('source'),'执行步骤');check('图表类型下拉项',text('source-choice'),'数值评分');check('图表空分组选项',text('breakdown'),'无');check('日期范围按钮',text('date-preset'),'过去 7 天');langfuseZhUI.setEnabled(false);
  history.replaceState(null,'','/project/fixture/settings/models');document.body.innerHTML='<section role="dialog" id="dynamic"></section>';
  const cases=[
   ['Edit tool Input','编辑工具 Input'],['Remove schema Save','移除输出结构 Save'],['Organization connections are shared with every project in Save.','组织连接供 Save 中的所有项目共用。'],
   ['Project connections are only available in Input and take precedence over organization connections with the same provider.','项目级连接仅供 Input 使用；与组织连接的服务商相同时，优先使用项目连接。'],
   ['Maximum window limit of 4 reached','已达到 4 个窗口的上限'],['Restore version 12?','恢复版本 12？'],['Please confirm with "Delete"','请输入“Delete”以确认'],
   ['Imported 2 skills','已导入 2 个技能'],['Import 1 skill','导入 1 个技能'],['Copy Output','复制 Output'],['Created by Save','创建者：Save'],['Resize Input column','调整输入列宽'],
   ['Sort by Created At','按创建时间排序'],['2/4 enabled','已启用 2/4 项'],['A pivot table supports at most 3 metrics.','交叉表最多支持 3 个指标。'],
  ];
  const box=document.getElementById('dynamic');for(const [source]of cases){const e=document.createElement('button');e.textContent=source;box.append(e);}
  langfuseZhUI.setEnabled(true);for(let i=0;i<cases.length;i++)check('动态文案 '+cases[i][0],box.children[i].textContent,cases[i][1]);
  langfuseZhUI.setEnabled(false);
  // Test every reviewed static key in both a dialog and a protected data cell.
  const keys=[...langfuseZhSecondaryKeys].filter(k=>!['True','False','System','Submit','window','traces'].includes(k));
  document.body.innerHTML='<div role="dialog" id="catalog"></div><table><tbody id="raw"></tbody></table>';
  const ui=document.getElementById('catalog'),raw=document.getElementById('raw');
  for(const key of keys){const p=document.createElement('p');p.textContent=key;ui.append(p);const tr=document.createElement('tr'),td=document.createElement('td');td.textContent=key;tr.append(td);raw.append(tr);}
  const data=raw.innerHTML;langfuseZhUI.setEnabled(true);
  const missing=keys.filter((key,i)=>ui.children[i].textContent!==langfuseZhDictionary[key]);
  check('已审核静态词条在弹窗中全部匹配',missing,[]);check('同名数据完整保留',raw.innerHTML,data);
  const node=document.createElement('p');node.textContent='No schema provided.';ui.append(node);await tick();check('延迟打开的新界面',node.textContent,'尚未设置输出格式。');
  langfuseZhUI.setEnabled(false);check('关闭恢复全部词条',keys.every((key,i)=>ui.children[i].textContent===key),true);
  return {passed:checks.filter(c=>c.pass).length,total:checks.length,catalogKeys:keys.length,checks};
}
