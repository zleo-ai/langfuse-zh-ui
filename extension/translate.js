"use strict";

// Derived from zleo-ai/langfuse-zh-ui (MIT). UI only: never inspect input.value,
// send requests, translate arbitrary substrings, or write application data.
(() => {
  const version = "0.4.0";
  if (globalThis.langfuseZhUI?.version === version) return;
  globalThis.langfuseZhUI?.setEnabled(false);
  const dictionary = globalThis.langfuseZhDictionary;
  const originals = new Map();
  const pending = new Set();
  let enabled = false;
  let timer;
  let supportRoot;
  const secondary = globalThis.langfuseZhSecondaryKeys || new Set();
  const hoverKeys = globalThis.langfuseZhHoverKeys || new Set();
  const community = globalThis.langfuseZhCommunityKeys || new Set();
  const templateRules = (globalThis.langfuseZhTemplateRules || []).map(r=>({...r,pattern:new RegExp(r.pattern)}));
  const slotWords = {Start:'开始',End:'结束',Close:'关闭',Open:'打开',Expand:'展开',Collapse:'收起',Enable:'启用',Disable:'停用',Hide:'隐藏',Show:'显示',Restore:'恢复',Delete:'删除',trace:'完整执行',Trace:'完整执行',observation:'执行步骤',Observation:'执行步骤',project:'项目',organization:'组织',personal:'个人',Project:'项目',Organization:'组织',Personal:'个人',enabled:'已启用',disabled:'已停用',updated:'更新',created:'创建',positive:'正向',negative:'负向',file:'文件',folder:'文件夹',requested:'请求',loaded:'加载',ERROR:'错误',WARNING:'警告',DEBUG:'调试',DEFAULT:'常规'};
  let lastTemplateKey,lastTemplateValue;
  function templateReplacement(key,depth=0) {
    if(!templateRules.length||depth>2)return null;
    if(depth===0&&key===lastTemplateKey)return lastTemplateValue;
    const ui=value=>slotWords[value]||dictionary[value]||templateReplacement(value,depth+1)||value;
    let result=null;
    for(const rule of templateRules){const m=key.match(rule.pattern);if(m){result=rule.translation.replace(/\{(\d+)(:ui)?\}/g,(_,n,translate)=>translate?ui(m[+n+1]||''):(m[+n+1]||''));break;}}
    if(!result){let m;if((m=key.match(/^ \| Most frequent: (.+) \((.+)\)$/)))result=`｜最常见：${m[1]}（${m[2]}）`;else if((m=key.match(/^ \| Average: (.+)$/)))result=`｜平均值：${m[1]}`;else if((m=key.match(/^ in (.+)$/)))result=`，位置：${m[1]}`;}
    if(depth===0){lastTemplateKey=key;lastTemplateValue=result;}return result;
  }
  const surfaces = 'form,[role="dialog"],[role="alertdialog"],[role="menu"],[role="tooltip"],[data-radix-popper-content-wrapper],[data-slot="sheet-content"],[data-slot="drawer-content"],[data-slot="popover-content"]';
  const controls = 'button,label,th,dt,[role="columnheader"],[role="tab"],[role="menuitem"],[role="menuitemcheckbox"],[data-sidebar="group-label"]';
  const hard = 'script,style,noscript,code,pre,textarea,select,[contenteditable]:not([contenteditable="false"]),[translate="no"],[data-no-translate],.cm-editor,.monaco-editor,.prose,.markdown,.react-json-view,.json-view';
  const cells = 'td,[role="cell"],[role="gridcell"]';
  const soft = '.font-mono,.whitespace-pre-wrap';
  const routes = /^(?:\/(?:setup|auth\/[^/]+)|\/organization\/[^/]+\/(?:setup|settings)(?:\/[^/]+)*|\/project\/[^/]+(?:\/(?:traces|observations|sessions|users|scores|prompts|skills|datasets|experiments|evals|evaluators|dashboards|metrics|alerts|annotation-queues|playground|automations)|\/settings(?:\/[^/]+)*)?)\/?$/;
  const detailRoute = /\/(?:prompts|skills|datasets|traces|observations|sessions|users|experiments|dashboards)\/[^/]+/;
  const staticLabels = new Set([
    'Filters','Rows','Rows per page','Page','of','Total','Thread','Only',
    'Observability','Prompt Management','Evaluation','Session messages and tools',
    'Session turns','Session conversation timeline','Account Settings',
  ]);
  const headings = new Set([
    'Sign in to your account','Create an account','Reset password','Organizations','Projects',
    'Home','Langfuse Home','Tracing','Traces','Observations','Sessions','Users','Scores',
    'Prompts','Skills','Datasets','Experiments','Evaluators','Evaluation','Dashboards',
    'Overview','Settings','Project Settings','Organization Settings','General','Members',
    'API Keys','LLM Connections','Models','Integrations','Profile','Danger Zone',
    'Host Name','Project Name','Debug Information','Transfer ownership','Delete this project',
    'Get Started with Datasets & Experiments','Get Started with Scores','Continuous improvement',
    'Pre-deployment testing','Structured testing','Custom workflows','Collect user feedback',
    'Run model-based evaluations','Track quality metrics','Use custom metrics',
    'Catch issues before they impact your users','Choose where alerts should go','Decide what to monitor',
    'Get Started with Skills','Manage Skills','Track skill usage','Version and iterate','Use via CLI or SDK',
    'No LLM Connection Configured','Turn traces into quality signals','Recommended starting points',
    'Get Started with Annotation Queues','Manage scoring workflows','Collaborate with annotators',
    'Track annotation metrics','Baseline evaluation efforts','Annotation Queues',
    'Playground','Get Started with Prompt Management','Decoupled from code','Edit in UI or programmatically','Performance optimized','Compare metrics',
    'Model costs','Observations by time','Model Usage','User consumption','Moving average per score',
    'Root observation latency percentiles','Generation latency percentiles','Observation latency percentiles','Model latencies','Scores Analytics',
  ]);
  const enumWords = {
    isRootObservation: {True:'是（完整执行）',False:'否（内部步骤）'},
    type: {GENERATION:'模型调用',SPAN:'处理步骤',AGENT:'智能体',TOOL:'工具',EVENT:'事件',RETRIEVER:'资料检索',EMBEDDING:'向量计算',CHAIN:'处理流程',EVALUATOR:'自动评分',GUARDRAIL:'安全检查',text:'纯文本',chat:'对话'},
    level: {ERROR:'错误',WARNING:'警告',DEBUG:'调试',DEFAULT:'常规'},
  };
  const dataActions = new Set(['Copy cell value','Value actions','Expand all rows','Collapse all rows','Copy to clipboard','Edit name','Open actions menu','Open menu','Copy value','Copy full value','Copy as JSON','Copy as JSON (cache only)','View as code','View JSON','Select row','Select all','Show password','Hide password','Delete API key']);
  const navigation = new Set(['Home','Dashboards','Observability','Tracing','Traces','Observations','Sessions','Users','Alerts','Skills','Beta','Prompts','Playground','Scores','Evaluators','Human Annotation','Annotation Queues','Datasets','Experiments','Settings','General','API Keys','MCP & CLI','LLM Connections','LLM Connection Settings','Model Definitions','Scores Configs','Members','Integrations','Exports','Batch Actions','Audit Logs','Notifications','Organizations','Organization Settings','Projects','Automations','Rules','Create an account','forgot password?','Forgot password?','Reset password']);
  const homeLabels = new Set(['Total traces tracked','Total cost','Total scores tracked','No data','Select a tab','Observations by Level','Observations tracked','Model Usage','Cost by model','Cost by type','Usage by model','Usage by type','Cost','Token cost','Count of Traces','Sum','Latencies (seconds) per LLM generation','50th Percentile','75th Percentile','90th Percentile','95th Percentile','99th Percentile']);
  const sessionControls = new Set(['JSON-only message detected','Open observation','Open trace','Show more','Show less']);
  const keyOf = text => text.trim().replace(/\s+/g,' ');
  const sourceAttribute = (element, key) => originals.get(element)?.get(key)?.source ?? element.getAttribute(key);
  const choiceGroups = [
    [['Data type','Data Type'],['NUMERIC','CATEGORICAL','BOOLEAN','TEXT','Numeric','Categorical','Boolean','Text']],
    [['Data source','Data Source'],['Observations','Scores Numeric','Scores Categorical','Scores Boolean']],
    [['Metric','Metrics','Chart metric'],['Count','Sum','Average','Min','Max','Latency','Total Cost','Cost ($)','Total tokens','Input tokens','Output tokens']],
    [['Aggregation'],['Count','Sum','Average','Min','Max','Median','50th Percentile','75th Percentile','90th Percentile','95th Percentile','99th Percentile']],
    [['Group by','Group By','Dimension','Dimensions','Breakdown Dimension (Optional)'],['None','Name','Model','Environment','User ID','Session ID','Type','Level','Date','Prompt Name']],
    [['Chart type','Chart Type'],['Line Chart','Line chart','Bar Chart','Vertical Bar Chart','Horizontal Bar Chart','Histogram','Pie Chart','Number','Table','Pivot Table']],
    [['Export Frequency'],['Every 20 Minutes','Hourly','Daily','Weekly']],
    [['Export Mode'],['Full history','Today','Custom date']],
    [['LLM adapter'],['other model']],
    [['Mixpanel Region'],['US (api.mixpanel.com)','EU (api-eu.mixpanel.com)']],
    [['Role','Organization Role','Project Role','Organization role','Project role'],['Owner','Admin','Member','Viewer','None']],
  ];
  function fixedChoice(element,key) {
    const dateButton=element.closest('button[aria-label]');
    if (dateButton && ['Date range','Date Range','日期范围'].includes(sourceAttribute(dateButton,'aria-label')) && /^Past \d+ (?:min|hours?|days?)$/.test(key)) return true;
    const list=element.closest('[role="listbox"]');
    const trigger=element.closest('button[role="combobox"]') || (list && [...document.querySelectorAll('button[role="combobox"][aria-controls]')].find(e=>e.getAttribute('aria-controls')===list.id));
    if(!trigger) return false;
    const label=trigger.id && document.querySelector(`label[for="${CSS.escape(trigger.id)}"]`);
    const labels=[keyOf(label?.textContent || ''),sourceAttribute(trigger,'aria-label')];
    const invite=trigger.closest('[role="dialog"]');
    if (!trigger.id && invite && trigger.querySelector('svg.lucide-user,svg.lucide-shield,svg.lucide-crown,svg.lucide-eye') && /^(?:向(?:组织|项目)添加成员|Add new member to the (?:organization|project))/.test(invite.querySelector('h1,h2,h3')?.textContent.trim() || '')) labels.push('Role');
    if(trigger.id==='metrics-select')labels.push('Metric');
    if (/\/widgets\/(?:new|[^/]+\/edit)\/?$/.test(location.pathname) && (labels.includes('View')||labels.includes(dictionary.View))) labels.push('Data source');
    return choiceGroups.some(([fields,values])=>values.includes(key) && fields.some(field=>labels.includes(field)||labels.includes(dictionary[field])));
  }
  function messageRole(element,key) {
    const button=element.closest('button');
    return /\/(?:playground|prompts)(?:\/|$)/.test(location.pathname) && ['System','Developer','Assistant','User','Tool','Placeholder'].includes(key) && button && !button.matches('[role^="menuitem"]');
  }

  function recognized() {
    const appRoute = /^(?:\/$|\/(?:auth|project|organization|setup|account)(?:\/|$))/.test(location.pathname);
    return appRoute && (/(?:^|\|\s*)Langfuse(?: Cloud)?\s*$/i.test(document.title.trim()) || Boolean(document.querySelector('a[href="https://langfuse.com"]')));
  }

  function hoverContext(element,key) {
    if(element.closest(cells+', [role="option"]'))return undefined;
    const tooltip=element.closest('[role="tooltip"]');
    const card=element.closest('[role="dialog"][data-floating-ui-focusable]');
    const root=tooltip || (card?.querySelector('a[href^="https://langfuse.com/docs"]') ? card : null);
    if(!root)return undefined;
    const trigger=root.id ? [...document.querySelectorAll('[aria-describedby],[aria-controls]')].find(e=>['aria-describedby','aria-controls'].some(a=>(e.getAttribute(a)||'').split(/\s+/).includes(root.id))) : null;
    if(trigger?.closest(hard))return 'data';
    const dataTrigger=trigger?.closest(cells+',[role="option"],[data-facet-column] fieldset,[data-session-message-bubble],[aria-label="breadcrumb"],[aria-label="Breadcrumb"],[aria-label="导航路径"]');
    if(dataTrigger) {
      // A tooltip that repeats a custom value remains data, even if named Save.
      const sameValue=keyOf(trigger.textContent)===key || keyOf(sourceAttribute(trigger,'title') || '')===key;
      const uiAction=trigger.matches('button[aria-label]') && dataActions.has(key) && sourceAttribute(trigger,'aria-label')===key;
      if(!uiAction && (sameValue || !hoverKeys.has(key)))return 'data';
    }
    return hoverKeys.has(key) ? 'ui' : undefined;
  }

  function context(element, key, attribute) {
    if (!element) return null;
    if(element.matches('title') && /\| Langfuse(?: Cloud)?$/.test(key) && Object.hasOwn(dictionary,key))return 'ui';
    if (element.matches('.cm-placeholder[contenteditable="false"]') && /^Enter an? (?:system|developer|assistant|user|tool|model) message here\.$/.test(key)) return 'ui';
    if (attribute==='placeholder' && element.matches('textarea') && !element.parentElement.closest(hard)) return 'ui';
    const home = /^\/project\/[^/]+\/?$/.test(location.pathname) && !!document.querySelector('button[role="combobox"] [title="Langfuse Home"],button[role="combobox"] [title="Langfuse 首页"]');
    if (home && element.matches('option') && homeLabels.has(key)) return 'ui';
    if (element.closest(hard)) return null;
    const hover=hoverContext(element,key);
    if(hover==='data')return null;
    if(hover==='ui')return 'ui';
    if (/\/organization\/[^/]+\/settings\/feature-previews\/?$/.test(location.pathname) && (attribute || element.closest(cells)) && Object.hasOwn(dictionary,key)) return 'ui';
    // Names shown next to a rename form are application data, including placeholders.
    if (attribute==='placeholder' && element.closest('#rename-project-form,#rename-organization-form')) return null;
    const renameParagraph=element.closest('p');
    if (renameParagraph?.querySelector('b') && [...renameParagraph.childNodes].some(n=>n.nodeType===Node.TEXT_NODE && /^Your (?:Project|Organization) (?:is currently named|will be renamed)/.test(keyOf(originals.get(n)?.get('text')?.source || n.textContent)))) {
      return element===renameParagraph && /^Your (?:Project|Organization) (?:is currently named|will be renamed)/.test(key) ? 'ui' : null;
    }
    const inSupport = supportRoot?.isConnected && supportRoot.contains(element);
    const surface = inSupport || element.closest(surfaces);
    const settings = /\/(?:settings|setup)(?:\/|$)/.test(location.pathname);
    const editorPage = /\/(?:new|create|playground)\/?$/.test(location.pathname);
    const bubble = element.closest('[data-session-message-bubble]');
    if (bubble) {
      const button = element.closest('button');
      const messageToggle = button?.hasAttribute('aria-controls') && ['Show more','Show less'].includes(key);
      const footerAction = ['Open observation','Open trace'].includes(key) && button?.parentElement.matches('.text-2xs.font-mono');
      if (!button || !sessionControls.has(key) || (button.parentElement !== bubble && !messageToggle && !footerAction)) return null;
    }
    const facet = element.closest('[data-facet-column]');
    const facetValues = facet && element.closest('[role="region"],fieldset');
    if (facetValues) {
      const field = facet.getAttribute('data-facet-column');
      if(attribute==='placeholder' && element.matches('input') && key==='Filter values')return 'ui';
      if (element.closest('[role="tab"],label') || key === 'Only') return 'ui';
      if (element.closest('button[aria-label]') && ['Show more values','Show fewer values','Clear filter search'].includes(key)) return 'ui';
      if (Object.hasOwn(enumWords[field] || {}, key)) return field;
      // Custom filter values remain data even when named Input, Error or Save.
      return null;
    }
    if (element.closest(cells) && !facet) {
      if (attribute==='title' && element.matches('button') && /^Add a model definition for ".+"$/.test(key)) return 'ui';
      if (attribute==='aria-label' && element.matches('button') && /^(?:Expand|Collapse|Resize) .+/.test(key)) return 'ui';
      return attribute && element.matches('button[aria-label]') && dataActions.has(key) ? 'ui' : null;
    }
    if (home && element.matches('p') && homeLabels.has(key)) return 'ui';
    if (home && key==='Moving average per score') return 'ui';
    if (home && element.closest('[role="tablist"]') && homeLabels.has(key)) return 'ui';
    if (home && element.matches('text[data-x-axis-label]') && /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}, \d{1,2}:\d{2} [AP]M$/.test(key)) return 'ui';
    const widgetHeading=element.closest('.bg-card')?.querySelector('h3');
    if (home && ['Observations by time','执行步骤随时间变化'].includes(widgetHeading?.textContent) && /^(?:DEFAULT|ERROR|WARNING|DEBUG)(?: \(Sum: [\d,.]+\))?$/.test(key)) return 'level';
    const anchor = element.closest('a[href]');
    if (anchor) {
      const url = new URL(anchor.href, location.href);
      // Official support links are UI; entity links and arbitrary Markdown remain data.
      if (secondary.has(key) && (inSupport || (url.origin !== location.origin && /(^|\.)(?:langfuse\.com|github\.com|discord\.gg|json-schema\.org)$/.test(url.hostname)))) return 'ui';
      if (url.origin===location.origin && /\/(?:settings|setup)(?:\/|$)/.test(url.pathname) && (navigation.has(key) || secondary.has(key))) return 'ui';
      if (url.origin===location.origin && /\/(?:settings|setup)(?:\/|$)/.test(url.pathname) && (['New Project','New Organization'].includes(key) || attribute==='aria-label' && /^Go to settings for /.test(key))) return 'ui';
      if (url.origin===location.origin && /^\/organization\/[^/]+\/?$/.test(url.pathname) && key==='Projects') return 'ui';
      if (url.origin===location.origin && /^\/organization\/[^/]+\/usage\/?$/.test(url.pathname) && key==='Usage') return 'ui';
      if (url.origin===location.origin && /^\/account\/settings\/?$/.test(url.pathname) && key==='General') return 'ui';
      if (url.origin===location.origin && /\/(?:widgets|evals\/rules)\/?$/.test(url.pathname) && ['Widgets','Rules'].includes(key)) return 'ui';
      if (url.origin===location.origin && url.pathname==='/auth/reset-password' && key==='Change Password') return 'ui';
      if (url.origin===location.origin && /^\/project\/[^/]+\/?$/.test(url.pathname)) return key==='Home' && anchor.closest('[data-sidebar]') ? 'ui' : null;
      if (url.origin === location.origin && (url.pathname === '/' || routes.test(url.pathname)) && navigation.has(key)) return 'ui';
      if (url.origin===location.origin && /\/(?:prompts|skills|dashboards|alerts)\/(?:new|create)\/?$/.test(url.pathname) && ['New prompt','New skill','New dashboard','Create Alert'].includes(key)) return 'ui';
      if (url.origin===location.origin && /\/prompts\/new\/?$/.test(url.pathname) && key==='Create Prompt') return 'ui';
      if (key==='Edit this dashboard in Dashboards' && url.origin===location.origin && /\/dashboards\//.test(url.pathname)) return 'ui';
      if (['Learn more','Learn More','Documentation','Book a call','How evaluators work.'].includes(key)) return 'ui';
      return key === 'session' && /\/sessions\/[^/]+\/?$/.test(url.pathname) ? 'ui' : null;
    }
    if (inSupport && key==='Support') return 'ui';
    if (element.closest('[aria-label="breadcrumb"] button,[aria-label="Breadcrumb"] button,[aria-label="导航路径"] button,[data-sidebar="menu-button"][aria-haspopup]')) return null;
    const choice=fixedChoice(element,key);
    const option=element.closest('[role="option"]');
    if (option) {
      const builtInView=sourceAttribute(option,'title')==='Reflects your current table settings without applying any saved custom table views';
      return choice || builtInView && ['My view (default)','Your working view','Reflects your current table settings without applying any saved custom table views'].includes(key) ? 'ui' : null;
    }
    const draftButton=element.closest('button[aria-label]');
    if (/\/skills\//.test(location.pathname) && draftButton && sourceAttribute(draftButton,'aria-label')==='Open local draft' && ['Draft','Unreleased local changes'].includes(key)) return 'ui';
    if (editorPage && ['New prompt','New skill','New Widget','New evaluator','Create Dashboard'].includes(key)) return 'ui';
    if (element.closest('[aria-current="page"]:not(a),[aria-current="true"]:not(a)') && !attribute) return null;
    const heading = element.closest('h1,h2,h3,h4,h5,h6');
    if (heading) {
      if (heading.hasAttribute('title') && keyOf(sourceAttribute(heading,'title') || '')===key && (detailRoute.test(location.pathname) && !editorPage || !Object.hasOwn(dictionary,key))) return null;
      if (attribute && element.matches('button[aria-label]')) return 'ui';
      if (['Columns','Quality','Select'].includes(key) && heading.closest('[role="dialog"]')) return 'ui';
      if (facet && !facetValues && element.closest('button')) return 'ui';
      if (/^Thread(?: \d+)?$/.test(key) && heading.closest('[data-session-item-id]')) return 'ui';
      if (surface || settings || editorPage) return 'ui';
      return (headings.has(key) || navigation.has(key) || secondary.has(key)) && !detailRoute.test(location.pathname) && !element.closest('[role="dialog"]') ? 'ui' : null;
    }
    // Title/ellipsis pairs are custom entity names outside semantic UI labels.
    const searchHint = element.matches('[data-testid="search-bar-surface"] > [title]');
    const metricTitle = keyOf(sourceAttribute(element,'title') || '');
    const metric = element.closest('.font-mono') && ['Total tokens','Own span duration'].includes(metricTitle);
    const sessionTool = /^(?:Tool|tool): /.test(key) && element.closest('[aria-label="Session turns"],[aria-label="对话轮次"]');
    const sessionMessage = ['User message','Assistant message','System message','Tool message'].includes(key) && element.closest('[aria-label="Session turns"],[aria-label="对话轮次"]');
    const errorBadge = key === 'Error' && element.closest('[class~="group/badge"][class*="text-red-"]');
    const uiBadge = (['Beta','NEW'].includes(key) || /\/skills\//.test(location.pathname) && ['Editing draft','Viewing'].includes(key)) && element.closest('[class~="group/badge"]');
    const evaluatorTemplate = /\/evals(?:\/|$)/.test(location.pathname) && element.closest('button') && Object.hasOwn(dictionary,key);
    const titled = element.closest('[title]');
    const uploadChrome = ['Upload files','Drag and drop or click to upload'].includes(key) && element.closest('button')?.querySelector('input[type="file"]');
    const iconTooltip = attribute==='title' && !element.textContent.trim() && element.querySelector('svg') && Object.hasOwn(dictionary,key);
    const reviewedTooltip = attribute==='title' && element.matches('button') && hoverKeys.has(key) && keyOf(element.textContent)!==key;
    const menuAction = ['Make Public','Make Private','Copy session ID','Copy trace ID','Copy observation ID','Delete session','Delete trace'].includes(key) && element.closest('[role="menuitem"] button');
    if (titled && keyOf(sourceAttribute(titled,'title') || '') === key &&
        !searchHint && !metric && !sessionTool && !sessionMessage && !errorBadge && !uiBadge && !evaluatorTemplate && !choice && !uploadChrome && !iconTooltip && !reviewedTooltip && !menuAction &&
        !(key==='Langfuse Home' && element.closest('button[role="combobox"]') && /\/project\/[^/]+\/?$/.test(location.pathname)) &&
        !(key==='My Views' && element.closest('button[title]') && !element.closest('button.peer')) &&
        !element.closest('th,[role="columnheader"],[role="tab"],[data-sidebar],[role="menuitemcheckbox"]') && !facet) return null;
    if (attribute && element.matches('input,textarea')) return 'ui';
    if (attribute==='aria-label' && element.matches('button') && (/^(?:Expand|Collapse) /.test(key) || ['Correct output','Show passthrough JSON data','Expand all rows','Collapse all rows'].includes(key))) return 'ui';
    const counter = /^[\d,.]+[kmb]? tokens$/i.test(key) && element.closest('button');
    const traceCount = /^(?:\d+ )?traces$/.test(key) &&
      [element.textContent,element.parentElement?.textContent].some(text=>/^\d+\s+traces$/.test(text?.trim() || '')) && /\/sessions\/[^/]+/.test(location.pathname);
    const roleLabel = messageRole(element,key);
    if (element.closest(soft) && !searchHint && !sessionControls.has(key) && !metric && !counter && !traceCount && !roleLabel && !choice && !uiBadge) return null;
    if (element.closest('button.peer') && !['Error','tokens','Total tokens','Own span duration'].includes(key) && !metric && !(attribute==='aria-label' && dataActions.has(key))) return null;
    if (traceCount) return 'ui';
    if (attribute && element.hasAttribute(attribute)) return 'ui';
    if (choice || element.closest(controls)) return 'ui';
    if (surface || settings || editorPage) return 'ui';
    if (uiBadge) return 'ui';
    if (/^soon$/i.test(key) && element.closest('[role="dialog"]')) return 'ui';
    if (['Quality','Columns','Select'].includes(key) && element.matches('div.font-bold,p.font-bold') && element.closest('[role="dialog"]')) return 'ui';
    if (key==='select' && element.closest('[role="dialog"] .capitalize')) return 'ui';
    if (community.has(key) || secondary.has(key) || Object.hasOwn(dictionary,key) && /\s/.test(key) && /[.!:]$/.test(key) || templateReplacement(key)) return 'ui';
    if ((/^Past \d+ (?:min|hours?|days?)$/.test(key) || key==='Select from calendar') && element.closest('[role="dialog"] .cursor-pointer')) return 'ui';
    if (element.closest('.io-message-header')) return 'ui';
    if (/\/playground\/?$/.test(location.pathname) && element.matches('p.font-bold')) return 'ui';
    if (/\/settings\/?$/.test(location.pathname) && key==='Your Project is currently named "' && element.matches('p')) return 'ui';
    if (/\/playground\/?$/.test(location.pathname) && key==='window' && /^\d+/.test(element.textContent)) return 'ui';
    if (searchHint) return 'ui';
    if (key==='Total ≈' && element.closest('[class*="/pagination"]')) return 'ui';
    if (/^(?:Page \d+(?: of \d+)?|Total [\d,]+)$/.test(key) && element.closest('[class*="/pagination"]')) return 'ui';
    if (staticLabels.has(key)) {
      if (['Rows','Rows per page','Page','of','Total'].includes(key)) return element.closest('[class*="/pagination"]') ? 'ui' : null;
      if (key === 'Only') return facet ? 'ui' : null;
      return 'ui';
    }
    // Exact, reviewed product descriptions; never translate arbitrary prose.
    if (key.length >= 35 && Object.hasOwn(dictionary,key)) return 'ui';
    return null;
  }

  function replacement(key, scope, element, attribute) {
    let match;
    if (scope==='level' && (match=key.match(/^(DEFAULT|ERROR|WARNING|DEBUG) \(Sum: ([\d,.]+)\)$/))) return `${enumWords.level[match[1]]}（合计：${match[2]}）`;
    if (scope !== 'ui') return enumWords[scope]?.[key] ?? null;
    if (fixedChoice(element,key)) {
      const types={NUMERIC:'数值',CATEGORICAL:'分类',BOOLEAN:'是非',TEXT:'文本'};
      if(types[key])return types[key];
    }
    if (['True','False'].includes(key)) return null;
    if (/^soon$/i.test(key) && element.closest('[role="dialog"]')) return '即将推出';
    if (key==='select' && element.closest('[role="dialog"] .capitalize')) return '选择';
    if (key==='System' && messageRole(element,key)) return '系统指令';
    if (/\/playground\/?$/.test(location.pathname) && key==='Submit') return '运行测试';
    if (/\/playground\/?$/.test(location.pathname) && key==='window') return '个窗口';
    if (key==='traces') return '次完整执行';
    if (/\/sessions\/[^/]+/.test(location.pathname) && (match=key.match(/^(\d+) traces$/))) return `${match[1]} 次完整执行`;
    if (Object.hasOwn(dictionary,key)) return dictionary[key];
    if ((match=key.match(/^(Collapse|Expand) (Input|Output|Metadata|Attributes|Usage|Scores)$/))) return (match[1]==='Collapse'?'收起':'展开')+(dictionary[match[2]] || match[2]);
    if (attribute==='aria-label' && (match=key.match(/^(Collapse|Expand) (trace )?(.+)$/))) return `${match[1]==='Collapse'?'收起':'展开'}${match[2]?'完整执行 ':''}${match[3]}`;
    const reviewedTemplate=templateReplacement(key);if(reviewedTemplate)return reviewedTemplate;
    const dynamic = dynamicReplacement(key, element, attribute);
    if (dynamic) return dynamic;
    if ((match=key.match(/^Search [—–-] e\.g\. level:ERROR, -env:dev, latency:>2s?, scores\.accuracy:>0\.8$/))) return '搜索，例如 level:ERROR（错误）、latency:>2（耗时超过 2 秒）';
    if ((match=key.match(/^(Collapse|Expand) (Input|Output|Metadata|Attributes|Usage|Scores)$/))) return (match[1]==='Collapse'?'收起':'展开')+(dictionary[match[2]] || match[2]);
    if ((match=key.match(/^(\d+) nested threads hidden$/))) return `已隐藏 ${match[1]} 个子调用轮次`;
    if ((match=key.match(/^Thread (\d+)$/)) && element.closest('[data-session-item-id]')) return `调用轮次 ${match[1]}`;
    if ((match=key.match(/^Page (\d+)(?: of (\d+))?$/)) && element.closest('[class*="/pagination"]')) return match[2]?`第 ${match[1]} / ${match[2]} 页`:`第 ${match[1]} 页`;
    if ((match=key.match(/^Total ([\d,]+)$/)) && element.closest('[class*="/pagination"]')) return `共 ${match[1]} 条`;
    if ((match=key.match(/^([\d,.]+[kmb]?) tokens$/i))) return `${match[1]} Token`;
    if ((match=key.match(/^(?:Tool|tool): (.+)$/)) && element.closest('[aria-label="Session turns"],[aria-label="对话轮次"],[data-session-message-row]')) return `工具：${match[1]}`;
    if ((match=key.match(/^Tool status: (ERROR|WARNING|DEFAULT|DEBUG)$/))) return `工具状态：${enumWords.level[match[1]]}`;
    if ((match=key.match(/^Add a model definition for "(.+)"$/))) return `为“${match[1]}”设置模型与价格`;
    if ((match=key.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}), (\d{1,2}):(\d{2}) ([AP]M)$/))) {
      const month=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(match[1])+1;
      const hour=Number(match[3])%12+(match[5]==='PM'?12:0);
      return `${month}月${match[2]}日 ${String(hour).padStart(2,'0')}:${match[4]}`;
    }
    if (attribute === 'aria-label' && (match=key.match(/^(Collapse|Expand) (trace )?(.+)$/))) return `${match[1]==='Collapse'?'收起':'展开'}${match[2]?'完整执行 ':''}${match[3]}`;
    return null;
  }

  // Anchored product templates only. Captures are user names, never translated.
  function dynamicReplacement(key, element, attribute) {
    const word=s=>dictionary[s] || s;
    const rules=[
      [/^About (.+)$/,m=>`关于 ${word(m[1])}`],
      [/^(Close|Open) Halo(.*)$/,m=>`${m[1]==='Close'?'关闭':'打开'} Halo${m[2]}`],
      [/^(Trace|Observation)-level score$/,m=>`${m[1]==='Trace'?'完整执行':'执行步骤'}级评分`],
      [/^Set as (project|organization|personal) default$/i,m=>`设为${word(m[1][0].toUpperCase()+m[1].slice(1))}默认视图`],
      [/^(Project|Organization|Personal) default view cleared$/i,m=>`已清除${word(m[1])}默认视图`],
      [/^(.+) has been updated to reflect your current table state$/,m=>`已按当前表格状态更新“${m[1]}”`],
      [/^(.+) shared publicly$/,m=>`已公开分享${m[1]}`],
      [/^Please enter your email address: (.+)$/,m=>`请输入您的邮箱地址：${m[1]}`],
      [/^Whenever a new (.+) version is created$/,m=>`每当创建${word(m[1])}的新版本时`],
      [/^Whenever tags or labels on a (.+) version are updated$/,m=>`每当更新${word(m[1])}版本的标签时`],
      [/^Whenever a (.+) version is deleted$/,m=>`每当删除${word(m[1])}版本时`],
      [/^Successfully (updated|created) automation "(.+)"\.$/,m=>`已${m[1]==='updated'?'更新':'创建'}自动化“${m[2]}”。`],
      [/^(Input|Output|Metadata|Expected output) mapping$/,m=>`${word(m[1])}映射`],
      [/^Use observation (input|output|metadata)$/,m=>`使用执行步骤的 ${m[1]}`],
      [/^(.+) mapping$/,m=>`${word(m[1])}对应关系`],
      [/^Remove (.+) filter$/,m=>`移除${word(m[1])}筛选`],
      [/^(.+) filter$/,m=>`${word(m[1])}筛选`],
      [/^(Dashboard|Project Settings|Organization Settings|Account Settings) > (.+)$/,m=>`${word(m[1])} > ${m[1]==='Dashboard'?m[2]:word(m[2])}`],
      [/^Evaluator "(.+)" was deleted\.$/,m=>`已删除评估器“${m[1]}”。`],
      [/^Enter (Python|TypeScript|JavaScript) source code$/,m=>`输入 ${m[1]} 源代码`],
      [/^Created by (.+)$/,m=>`创建者：${m[1]}`],
      [/^Saved (\d.+)$/,m=>`保存时间：${m[1]}`],
      [/^Restore version (\d+)(\?)?$/,m=>`恢复版本 ${m[1]}${m[2]?'？':''}`],
      [/^This will replace the current evaluator definition with version (\d+)\. It won't be saved until you click "Save changes"\.$/,m=>`这会用版本 ${m[1]} 替换当前评估器定义。点击“保存更改”后才会保存。`],
      [/^(.+) is active\.$/,m=>`${m[1]} 已启用。`],
      [/^(.+) has errors$/,m=>`${word(m[1])}存在错误`],
      [/^(.+) was (enabled|disabled) for this organization\.$/,m=>`已为此组织${m[2]==='enabled'?'启用':'禁用'}${word(m[1])}。`],
      [/^Toggle (.+) organization default$/,m=>`切换${word(m[1])}的组织默认设置`],
      [/^Unavailable experiment \((.+)\)$/,m=>`实验不可用（${m[1]}）`],
      [/^"(.+)" is set by Langfuse and cannot be overridden$/,m=>`“${m[1]}”由 Langfuse 设置，无法覆盖`],
      [/^Model (updated|created)$/,m=>`模型已${m[1]==='updated'?'更新':'创建'}`],
      [/^The model '(.+)' has been successfully (updated|created)\. New generations will use these model prices\.$/,m=>`已${m[2]==='updated'?'更新':'创建'}模型“${m[1]}”。后续模型调用将使用这些价格。`],
      [/^Automation "(.+)" was created$/,m=>`已创建自动化“${m[1]}”`],
      [/^"(.+)" is now active\.$/,m=>`“${m[1]}”现已启用。`],
      [/^Your changes to "(.+)" have been applied\.$/,m=>`已应用对“${m[1]}”的更改。`],
      [/^Please confirm with "(.+)"$/,m=>`请输入“${m[1]}”以确认`],
      [/^Organization connections are shared with every project in (.+)\.$/,m=>`组织连接供 ${m[1]} 中的所有项目共用。`],
      [/^Project connections are only available in (.+) and take precedence over organization connections with the same provider\.$/,m=>`项目级连接仅供 ${m[1]} 使用；与组织连接的服务商相同时，优先使用项目连接。`],
      [/^Resize (.+) column$/,m=>`调整${word(m[1])}列宽`],
      [/^Sort by (.+)$/,m=>`按${word(m[1])}排序`],
      [/^Go to settings for (.+)$/,m=>`前往 ${m[1]} 的设置`],
      [/^Sample: (.+)\. Select a different row above to change it\.$/,m=>`当前样本：${m[1]}。可在上方选择其他行来更换。`],
      [/^(\d+)\/(\d+) enabled$/,m=>`已启用 ${m[1]}/${m[2]} 项`],
      [/^\((\d+) matches\)$/,m=>`（${m[1]} 条匹配）`],
      [/^(Edit|Remove) (tool|schema) (.+)$/,m=>`${m[1]==='Edit'?'编辑':'移除'}${m[2]==='tool'?'工具':'结构'} ${m[3]}`],
      [/^Maximum window limit of (\d+) reached$/,m=>`已达到 ${m[1]} 个窗口的上限`],
      [/^(.+) \(not available on this deployment\)$/,m=>`${word(m[1])}（当前部署不可用）`],
      [/^Add new member to the (project|organization)$/,m=>`向${m[1]==='project'?'项目':'组织'}添加成员`],
      [/^This is how the (category|boolean) label is mapped to an integer value internally\.$/,m=>`这里展示${m[1]==='category'?'类别':'布尔'}标签在内部如何映射为整数。`],
      [/^Remove category (\d+)$/,m=>`移除类别 ${m[1]}`],
      [/^Filter (trace|observation) (.+)$/,m=>`筛选${m[1]==='trace'?'完整执行':'执行步骤'} ${m[2]}`],
      [/^Imported (\d+) skills?$/,m=>`已导入 ${m[1]} 个技能`],
      [/^Import (\d+) skills?$/,m=>`导入 ${m[1]} 个技能`],
      [/^Filter by name:(.+)$/,m=>`按名称筛选：${m[1]}`],
      [/^Filter by (.+)$/,m=>`按${word(m[1])}筛选`],
      [/^(Your widgets|Home cards) \((\d+)\)$/,m=>`${m[1]==='Your widgets'?'您的组件':'首页卡片'}（${m[2]}）`],
      [/^A pivot table supports at most (\d+) (metrics|dimensions)\.$/,m=>`交叉表最多支持 ${m[1]} 个${m[2]==='metrics'?'指标':'维度'}。`],
    ];
    // Generic action labels are permitted only on controls, never bare custom names.
    if (element.closest('button,[role="menuitem"]') || attribute) rules.push(
      [/^(Remove|Preview|Select|Enable|Copy|Call) (.+)$/,m=>`${{Remove:'移除',Preview:'预览',Select:'选择',Enable:'启用',Copy:'复制',Call:'调用'}[m[1]]} ${m[2]}`],
    );
    for(const [pattern,render] of rules){const match=key.match(pattern);if(match)return render(match);}
    return null;
  }

  function restoreField(node,key,entry) {
    if (key==='text') { if(node.nodeValue===entry.translated) node.nodeValue=entry.source; }
    else if(node.getAttribute(key)===entry.translated) node.setAttribute(key,entry.source);
  }
  function apply(target,field,element) {
    const uiPlaceholder=element?.matches('.cm-placeholder[contenteditable="false"]');
    const homeOption=element?.matches('option') && /^\/project\/[^/]+\/?$/.test(location.pathname);
    if(field==='text' && (!element || !uiPlaceholder && !homeOption && element.closest(hard) || element.closest(cells) && !element.closest('[data-facet-column]') && !/\/settings\/feature-previews\/?$/.test(location.pathname)))return;
    const source=field==='text'?target.nodeValue:target.getAttribute(field);
    if (!source?.trim()) return;
    const tracked=originals.get(target)?.get(field);
    const original=tracked && source===tracked.translated?tracked.source:source;
    const key=keyOf(original), scope=context(element,key,field==='text'?null:field);
    if (!scope) {
      if(tracked) {restoreField(target,field,tracked);originals.get(target).delete(field);}
      return;
    }
    const value=replacement(key,scope,element,field==='text'?null:field);
    if (!value || value===key) return;
    const translated=original.slice(0,original.length-original.trimStart().length)+value+original.slice(original.trimEnd().length);
    if (source===translated) return;
    let fields=originals.get(target);if(!fields) originals.set(target,fields=new Map());
    fields.set(field,{source:original,translated});
    if(field==='text') target.nodeValue=translated;else target.setAttribute(field,translated);
  }
  function visit(root) {
    if(!root.isConnected) return;
    // The installed Support drawer is a plain div, without dialog semantics.
    // Find it by its official help anchor + close control, not fragile CSS classes.
    if (!supportRoot?.isConnected) {
      supportRoot = undefined;
      for(let e=document.querySelector('a[href="https://langfuse.com/docs/ask-ai"]');e&&e!==document.body;e=e.parentElement) {
        if(e.querySelector('button[aria-label="Close"],button[aria-label="关闭"]') && !e.querySelector('[data-sidebar="sidebar"]')) {supportRoot=e;break;}
      }
    }
    if(root.nodeType===Node.TEXT_NODE) {apply(root,'text',root.parentElement);return;}
    if(root.nodeType!==Node.ELEMENT_NODE) return;
    const pageTitle=document.querySelector('title');if(pageTitle?.firstChild?.nodeType===Node.TEXT_NODE)apply(pageTitle.firstChild,'text',pageTitle);
    const inspect=element=>{for(const field of ['placeholder','title','aria-label'])if(element.hasAttribute(field))apply(element,field,element);};
    inspect(root);
    // Textarea contents remain excluded; only their UI placeholder is visited.
    for(const element of root.querySelectorAll('textarea[placeholder]')) apply(element,'placeholder',element);
    for(const element of root.querySelectorAll('.cm-placeholder[contenteditable="false"]')) if(element.firstChild?.nodeType===Node.TEXT_NODE)apply(element.firstChild,'text',element);
    for(const element of root.querySelectorAll('select option')) if(element.firstChild?.nodeType===Node.TEXT_NODE)apply(element.firstChild,'text',element);
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{
      acceptNode:node=>node.nodeType===Node.ELEMENT_NODE&&node.matches(hard)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT,
    });
    while(walker.nextNode()) {
      const node=walker.currentNode;
      if(node.nodeType===Node.TEXT_NODE)apply(node,'text',node.parentElement);else inspect(node);
    }
  }
  function flush() {
    timer=undefined;if(!enabled){pending.clear();return;}
    const roots=[...pending];pending.clear();
    for(const root of roots)if(!roots.some(other=>other!==root&&other.contains(root)))visit(root);
    for(const node of originals.keys())if(!node.isConnected)originals.delete(node);
  }
  const observer=new MutationObserver(records=>{
    for(const record of records) {
      const field=record.type==='characterData'?'text':record.attributeName;
      const tracked=originals.get(record.target)?.get(field);
      const current=field==='text'?record.target.nodeValue:record.type==='attributes'?record.target.getAttribute(field):null;
      if(tracked&&current===tracked.translated)continue;
      pending.add(record.target);
    }
    if(pending.size&&timer===undefined)timer=setTimeout(flush,16);
  });
  globalThis.langfuseZhUI=Object.freeze({
    version,
    getStatus:()=>({version,enabled,translatedNodes:originals.size}),
    setEnabled(value) {
      if(value&&!recognized())return false;
      observer.disconnect();clearTimeout(timer);timer=undefined;pending.clear();enabled=Boolean(value);
      if(enabled) {
        visit(document.body);
        observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,
          attributeFilter:['placeholder','title','aria-label','class','role','data-facet-column','translate','data-no-translate']});
        observer.observe(document.head,{subtree:true,childList:true,characterData:true});
      }else{
        for(const [node,fields]of originals)if(node.isConnected)for(const [key,entry]of fields)restoreField(node,key,entry);
        originals.clear();
      }
      return true;
    },
  });
})();
