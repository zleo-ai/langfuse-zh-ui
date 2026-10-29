"use strict";

(() => {
  if (globalThis.langfuseZhUI) return;
  const dictionary = globalThis.langfuseZhDictionary;
  const originals = new Map();
  let enabled = false;
  let scheduled = false;
  const pending = new Set();

  // Translate controls, never scan free-form page text for word replacements.
  const controls = 'button,label,th,[role="columnheader"],[role="tab"],[role="menuitem"],[data-sidebar="group-label"],h1,h2,h3';
  const protectedContent = 'script,style,code,pre,[contenteditable]:not([contenteditable="false"]),[translate="no"],[data-no-translate],td,[role="cell"],[role="gridcell"],.cm-editor,.monaco-editor,.prose,.markdown,.react-json-view,.json-view,.font-mono,.whitespace-pre-wrap';
  const excluded = protectedContent + ',textarea,input';
  const headings = new Set([
    "Sign in to your account", "Create an account", "Reset password", "Organizations", "Projects",
    "Traces", "Observations", "Sessions", "Users", "Scores", "Prompts", "Datasets", "Experiments",
    "Evaluators", "Evaluation", "Dashboards", "Overview", "Settings", "General", "Members",
    "API Keys", "LLM Connections", "Models", "Integrations", "Profile", "Danger Zone", "Home", "Langfuse Home", "Tracing",
  ]);
  const routes = /^(?:\/(?:setup|auth\/[^/]+)|\/organization\/[^/]+\/(?:setup|settings)(?:\/[^/]+)?|\/project\/[^/]+(?:\/(?:traces|observations|sessions|users|scores|prompts|datasets|experiments|evals|evaluators|dashboards|metrics|alerts|annotation-queues|playground|settings)(?:\/(?:general|members|api-keys|llm-connections|models|integrations))?)?)\/?$/;

  function recognized() {
    const appRoute = /^(?:\/$|\/(?:auth|project|organization|setup)(?:\/|$))/.test(location.pathname);
    const productTitle = /(?:^|\|\s*)Langfuse\s*$/i.test(document.title.trim());
    return appRoute && (productTitle || Boolean(document.querySelector('a[href="https://langfuse.com"]')));
  }

  function translate(text) {
    const key = text.trim().replace(/\s+/g, " ");
    if (!Object.hasOwn(dictionary, key) || dictionary[key] === key) return null;
    return text.slice(0, text.length - text.trimStart().length) + dictionary[key] + text.slice(text.trimEnd().length);
  }

  function allowed(element, text) {
    if (!element || element.closest(excluded)) return false;
    const anchor = element.closest("a[href]");
    if (anchor) {
      const url = new URL(anchor.href, location.href);
      // Match known navigation/action labels on known routes. Entity links are data.
      return (url.origin === location.origin && (url.pathname === "/" || routes.test(url.pathname))) ||
        ["Learn more", "Documentation", "Book a call"].includes(text.trim());
    }
    const control = element.closest(controls);
    if (!control) return false;
    if (/^H[123]$/.test(control.tagName)) {
      // Detail-page headings are often user-created names.
      return headings.has(text.trim()) && !/\/(?:prompts|datasets|traces|observations|sessions|experiments)\/[^/]+/.test(location.pathname);
    }
    // The org/project/account switchers display user-created names.
    if (control.matches('[data-sidebar="menu-button"][aria-haspopup]')) return false;
    return true;
  }

  function remember(target, key, source, translated) {
    let fields = originals.get(target);
    if (!fields) originals.set(target, fields = new Map());
    fields.set(key, { source, translated });
  }

  function visit(root) {
    if (!root.isConnected) return;
    const elements = [];
    if (root.nodeType === Node.ELEMENT_NODE) elements.push(root);
    if (root.querySelectorAll) elements.push(...root.querySelectorAll(controls + ',a[href],input[placeholder]'));
    for (const element of elements) {
      if (element.closest(protectedContent)) continue;
      for (const attribute of ["aria-label", "title", "placeholder"]) {
        const source = element.getAttribute(attribute);
        if (!source) continue;
        // Read only placeholder labels, never input values (including passwords).
        const canTranslate = attribute === "placeholder" && element.matches('input,textarea')
          ? true
          : allowed(element, source);
        const translated = canTranslate && translate(source);
        if (translated) {
          remember(element, attribute, source, translated);
          element.setAttribute(attribute, translated);
        }
      }
    }
    const nodes = [];
    if (root.nodeType === Node.TEXT_NODE) nodes.push(root);
    else {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: node => node.parentElement?.closest(excluded) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
      });
      while (walker.nextNode()) nodes.push(walker.currentNode);
    }
    for (const node of nodes) {
      if (node.parentElement?.closest(excluded)) continue;
      const source = node.nodeValue;
      if (!allowed(node.parentElement, source)) continue;
      const translated = translate(source);
      if (translated) {
        remember(node, "text", source, translated);
        node.nodeValue = translated;
      }
    }
  }

  function flush() {
    scheduled = false;
    if (!enabled) { pending.clear(); return; }
    for (const root of pending) visit(root);
    pending.clear();
    // Detached React nodes must not accumulate across route changes.
    for (const node of originals.keys()) if (!node.isConnected) originals.delete(node);
  }

  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === "childList") for (const node of record.addedNodes) pending.add(node);
      else pending.add(record.target);
    }
    if (pending.size && !scheduled) {
      scheduled = true;
      queueMicrotask(flush);
    }
  });

  globalThis.langfuseZhUI = Object.freeze({
    setEnabled(value) {
      if (value && !recognized()) return false;
      observer.disconnect();
      pending.clear();
      enabled = Boolean(value);
      if (enabled) {
        visit(document.body);
        observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "title", "aria-label"] });
      } else {
        for (const [node, fields] of originals) {
          if (!node.isConnected) continue;
          for (const [key, { source, translated }] of fields) {
            if (key === "text") {
              if (node.nodeValue === translated) node.nodeValue = source;
            } else if (node.getAttribute(key) === translated) node.setAttribute(key, source);
          }
        }
        originals.clear();
      }
      return true;
    },
  });
})();
