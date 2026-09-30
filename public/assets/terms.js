// Tap-to-define: the first mention of a piece of jargon in each block gets a dotted underline;
// one tap shows a plain-English sentence. Bringing people along is part of the job.
(() => {
  const DEF = [
    ['Model Context Protocol', 'A standard plug that lets an AI assistant use specific tools and data, and only the ones you allow.'],
    ['MCP', 'Model Context Protocol: a standard plug that lets an AI assistant use specific tools and data, and only the ones you allow.'],
    ['MSPs', 'Managed service providers: the outside IT teams small businesses pay to run their tech and security.'],
    ['MSP', 'Managed service provider: the outside IT team a small business pays to run its tech and security.'],
    ['AI agents', 'AI that doesn’t just answer questions but takes actions: sends email, moves files, changes settings.'],
    ['Home Assistant', 'Open-source software that runs a smart home on your own hardware, instead of in someone else’s cloud.'],
    ['Zigbee2MQTT', 'Software that translates the Zigbee radio mesh into MQTT messages Home Assistant understands.'],
    ['Zigbee', 'A low-power wireless language smart sensors use. Every plugged-in device relays for the others, forming a mesh.'],
    ['MQTT', 'A lightweight message bus: devices post short messages to a central post office, and anything interested picks them up.'],
    ['Matter', 'A newer industry standard so smart devices from different brands can work together.'],
    ['ESPHome', 'Software that turns a cheap microcontroller board into a custom smart-home device.'],
    ['Shadow AI', 'AI tools employees use without the company knowing or approving them.'],
    ['vibe coding', 'Shipping code an AI wrote, with little or no human review.'],
    ['Zero Trust', 'A security model that checks every request, every time, instead of trusting anything already inside the network.'],
    ['Copilot', 'Microsoft’s AI assistant built into apps like Outlook, Word and Teams.'],
    ['QBR', 'Quarterly business review: the regular meeting where a provider shows a client the value delivered.'],
    ['SMB', 'Small and midsize businesses.'],
    ['lightmaps', 'Lighting worked out once, in advance, and painted onto the model, so a phone doesn’t have to calculate it live.'],
    ['WebGL', 'The browser’s direct line to your device’s graphics chip.'],
    ['gitleaks', 'A scanner that stops passwords and keys from being saved into code history by accident.'],
    ['Cloudflare Workers', 'Code that runs on Cloudflare’s global network, close to whoever is visiting.'],
    ['Plex', 'A personal streaming service: your own movies and home videos, on any screen.'],
    ['the channel', 'The partner ecosystem (MSPs, resellers, distributors) that technology vendors sell through.'],
  ];
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const SCOPE = '.sec-sub, .intro .lede, .story p, .t3 p, .pb-sec p, .prose p, .arc-side p, .tl-b p, .step p, .about p, .page-hd .sec-sub';
  let pop = null, openBtn = null, n = 0;
  const close = () => { if (!pop) return; pop.remove(); pop = null; if (openBtn) { openBtn.setAttribute('aria-expanded', 'false'); openBtn = null; } };
  const show = (b) => {
    if (openBtn === b) { close(); return; }
    close();
    pop = document.createElement('div'); pop.className = 'term-pop'; pop.id = 'term-pop'; pop.setAttribute('role', 'tooltip');
    const t = document.createElement('b'); t.textContent = b.textContent;
    const d = document.createElement('span'); d.textContent = b.dataset.def;
    pop.append(t, d); document.body.append(pop);
    b.setAttribute('aria-expanded', 'true'); b.setAttribute('aria-describedby', 'term-pop'); openBtn = b;
    const r = b.getBoundingClientRect(), w = Math.min(320, innerWidth - 24);
    pop.style.width = w + 'px';
    const left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2));
    const below = r.bottom + 10 + pop.offsetHeight < innerHeight;
    pop.style.left = left + scrollX + 'px';
    pop.style.top = (below ? r.bottom + 8 : r.top - pop.offsetHeight - 8) + scrollY + 'px';
  };
  const define = (root = document) => {
    root.querySelectorAll(SCOPE).forEach((block) => {
      if (block.closest('.term-pop')) return;
      const used = new Set();
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, { acceptNode: (x) => (x.parentElement.closest('a, button, .term, code') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
      const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        for (const [term, def] of DEF) {
          const key = def; if (used.has(key)) continue;
          const re = new RegExp(`(^|[^A-Za-z0-9])(${esc(term)})(?![A-Za-z0-9])`, term === term.toUpperCase() ? '' : '');
          const m = re.exec(node.nodeValue); if (!m) continue;
          const at = m.index + m[1].length;
          const tail = node.splitText(at); tail.nodeValue.length;
          const rest = tail.splitText(m[2].length);
          const b = document.createElement('button'); b.type = 'button'; b.className = 'term'; b.textContent = m[2]; b.dataset.def = def;
          b.setAttribute('aria-expanded', 'false'); b.id = 'term-' + (++n);
          tail.replaceWith(b);
          used.add(key);
          nodes.push(rest); // keep scanning the rest of this text for other terms
          break;
        }
      }
    });
  };
  document.addEventListener('click', (e) => { const b = e.target.closest('.term'); if (b) { e.preventDefault(); show(b); } else if (!e.target.closest('.term-pop')) close(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  addEventListener('scroll', close, { passive: true }); addEventListener('resize', close);
  window.defineTerms = define;
  define();
})();
