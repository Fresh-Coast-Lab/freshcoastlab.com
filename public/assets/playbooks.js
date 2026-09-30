// "Playbooks": the patterns from the house, pointed at work and life.
// Every card says honestly whether it is running, built, being built, or a blueprint.
(() => {
  const root = document.getElementById('pb');
  if (!root) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STATUS = { run: 'RUNNING', built: 'BUILT, PARKED', wip: 'BUILDING', plan: 'BLUEPRINT' };
  const P = [
    { id: 'brief', s: 'wip', k: 'Productivity', t: 'The morning brief',
      one: 'One screen that answers “what needs me today?”',
      what: 'One scheduled agent reads three Google accounts, a work calendar feed and my reminders, then writes a single brief to my Home Assistant dashboard: meetings, what needs a reply, what is overdue, what the house needs. It drafts. It never sends.',
      how: ['Claude', 'Google Calendar + Gmail', 'Apple Reminders', 'Home Assistant markdown card', 'Uptime Kuma heartbeats'],
      biz: 'An owner’s daily brief: today’s jobs, overdue invoices, customers waiting on an answer, and the one thing that will bite you if nobody looks.' },
    { id: 'cos', s: 'built', k: 'Business', t: 'A chief of staff in a browser tab',
      one: 'Inbox, calendar, CRM and a daily briefing that knows my voice.',
      what: 'Podium, my own web app. It reads Gmail and my calendar, keeps a lightweight CRM (snap a business card and it becomes a contact), tracks follow-ups and expenses, drafts replies and review responses, and posts a daily briefing to Slack. It writes speeches, decks and social posts in my voice.',
      how: ['Python + Flask', 'Claude API', 'MCP bridge to Gmail + Calendar', 'Vision for business cards', 'pptxgenjs for decks', 'Slack API'],
      biz: 'A front office in a box for a two to ten person business: every lead captured, every follow-up remembered, every review answered the same day.' },
    { id: 'interview', s: 'run', k: 'Business', t: 'The automation interview',
      one: 'The first hour of every automation project, done by an agent.',
      what: 'A structured discovery interview: one question at a time, never advising early. Identity, team and tools, pain points, a depth drill on time and cost, constraints. Then it writes an Automation Design Brief with opportunities, hours saved, complexity, compliance notes, and a ready-to-paste build prompt.',
      how: ['A system prompt that works in any model', 'Claude', 'Structured output'],
      biz: 'Try the pocket version below, or copy the real prompt and run it yourself.', demo: true },
    { id: 'strategist', s: 'run', k: 'Productivity', t: 'My AI channel strategist',
      one: 'Talk tracks and decks that sound like me, plus a news brief every morning.',
      what: 'Built from scratch over a few weeks of late nights. It knows my voice, my audience and what is happening in cybersecurity, drafts presentations and talk tracks, and briefs me on MSP news each morning. I once checked in on it from a dentist’s chair.',
      how: ['Python', 'Claude API', 'A curated voice and audience profile', 'Scheduled news brief'],
      biz: 'Every sales team has one person whose emails and decks just land. Capture how they write and let everyone start from that.' },
    { id: 'travel', s: 'run', k: 'Productivity', t: 'Travel on autopilot',
      one: 'Book a flight once. Every calendar that needs it, has it.',
      what: 'Flight and hotel confirmations land in Gmail and go straight onto my calendar. A filter forwards them to my work address so coworkers can see when I’m on the road, and a shared schedule keeps home in the loop. Nobody types an itinerary twice.',
      how: ['Gmail filters', 'Google Calendar', 'TripIt', 'Google Sheets'],
      biz: 'Team travel visibility with zero admin: who is where, which client, and who is covering.' },
    { id: 'audit', s: 'wip', k: 'Reliability', t: 'The silent-failure audit',
      one: 'Healthy-looking systems that stopped working. Caught weekly.',
      what: 'Born from a camera that went quiet for six days while every dashboard said healthy. Always-on checks compare signals that should agree, and flag anything that should have fired by now. A weekly agent reviews every automation and reports only what changed. It never fixes anything on its own.',
      how: ['Home Assistant', 'Paired-signal checks', 'A weekly audit agent', 'An off-box dead-man’s switch'],
      biz: 'The question every business should ask about its backups, alarms and monitoring: is it actually running, or does it just look like it is?' },
    { id: 'memory', s: 'run', k: 'AI', t: 'One memory for every AI',
      one: 'Switch models without starting over.',
      what: 'Everything my assistants need to know lives in one private git repo of plain markdown, read first by every tool through a single AGENTS.md. It syncs across two Macs every two hours, and every commit is scanned for secrets before it is saved.',
      how: ['Git + GitHub', 'AGENTS.md', 'Claude Code hooks', 'gitleaks', 'launchd'],
      biz: 'A company knowledge base your AI tools can actually read, with the passwords kept out of it.' },
    { id: 'triage', s: 'run', k: 'Productivity', t: 'Nine hundred reminders, triaged',
      one: 'A junk-drawer list became six clean ones. Now it stays that way.',
      what: 'A catch-all list with 900 items got sorted into six lists with real priorities in one sitting. Every morning an assistant reads all of them and answers one question: what needs to be done today?',
      how: ['Apple Reminders', 'Claude', 'Kanban-style priorities'],
      biz: 'The same pass works on a shared inbox, a ticket queue or a CRM full of stale deals.' },
    { id: 'watch', s: 'run', k: 'Reliability', t: 'Monitoring with manners',
      one: 'Wake me for a fire. Tell me about the rest at breakfast.',
      what: 'Monitors on every service, routed through Home Assistant into three alert tiers. Critical breaks through Do Not Disturb. Warnings are suppressed when the thing they depend on is already down, so one failure means one alert, not twelve. Verified end to end on my phone.',
      how: ['Uptime Kuma', 'Home Assistant', 'Tiered iOS alerts', 'A private mesh VPN'],
      biz: 'MSP-grade monitoring sized for a five-person office, without the alert fatigue.' },
    { id: 'textback', s: 'plan', k: 'Blueprint', t: 'The front desk that never misses a call',
      one: 'Missed call, instant text, booked appointment.',
      what: 'The pattern: a missed call triggers a friendly text within seconds, an agent answers the common questions, offers real open slots from the calendar, and books it. Anything unusual goes to a human with the whole conversation attached.',
      how: ['Phone system webhooks', 'An SMS provider', 'Calendar booking', 'Claude with guardrails'],
      biz: 'Built for trades, clinics and salons, where every missed call is a customer calling the next name on the list.' },
    { id: 'chaser', s: 'plan', k: 'Blueprint', t: 'The polite invoice chaser',
      one: 'Tiered nudges, the same way my house handles alerts.',
      what: 'The house alert tiers, applied to money: a friendly reminder before the due date, a firmer one after, and a heads-up to the owner only when it actually needs a human. Every message drafted, logged, and stopped the moment the payment lands.',
      how: ['Accounting system API', 'Email + SMS', 'Claude for tone', 'A human approval step'],
      biz: 'Cash flow without the awkward phone calls.' },
    { id: 'edge', s: 'built', k: 'Just for fun', t: 'Fantasy Edge',
      one: 'A draft-day cheat sheet in Lions colors.',
      what: 'A small web app that pulls live average draft position data and tells me who is falling and who is a reach, styled in Honolulu blue and silver. I am a self-described fantasy beginner. The app is not.',
      how: ['Python + Flask', 'A public ADP API'],
      biz: 'Proof that the fastest way to learn a tool is to build something you care about.' },
  ];
  const TONE = { run: 'var(--aurora)', built: 'var(--aqua)', wip: '#FFC061', plan: '#B7AEFF' };
  const grid = root.querySelector('.pb-grid');
  grid.innerHTML = P.map((p, i) => `<button type="button" class="pb-card" data-i="${i}" style="--tone:${TONE[p.s]}">
    <span class="pb-st mono"><i></i>${STATUS[p.s]}</span><span class="pb-k mono">${p.k}</span>
    <h3></h3><p></p><span class="pb-go mono">${p.demo ? 'TRY IT' : 'OPEN'} <span aria-hidden="true">&rarr;</span></span></button>`).join('');
  grid.querySelectorAll('.pb-card').forEach((c, i) => { c.querySelector('h3').textContent = P[i].t; c.querySelector('p').textContent = P[i].one; });

  // ---------- detail sheet (bottom sheet on phones, dialog on desktop) ----------
  const dlg = document.getElementById('pb-dlg'), body = dlg.querySelector('.pb-body');
  let lastFocus = null;
  const close = () => { dlg.classList.remove('open'); document.body.classList.remove('locked'); if (lastFocus) lastFocus.focus({ preventScroll: true }); };
  const open = (i) => {
    const p = P[i]; lastFocus = document.activeElement;
    body.innerHTML = `<span class="pb-st mono" style="--tone:${TONE[p.s]}"><i></i>${STATUS[p.s]}</span>
      <h3 id="pb-h"></h3><p class="pb-one"></p>
      <div class="pb-sec"><span class="mono">WHAT IT DOES</span><p class="w"></p></div>
      <div class="pb-sec"><span class="mono">HOW IT'S BUILT</span><ul class="pb-tags">${p.how.map(() => '<li></li>').join('')}</ul></div>
      <div class="pb-sec pb-biz"><span class="mono">${p.s === 'plan' ? 'WHO IT’S FOR' : 'THE BUSINESS VERSION'}</span><p class="b"></p></div>
      ${p.demo ? demoHTML : ''}
      <div class="pb-cta"><a class="btn btn-glow" href="#contact">Build one for my business <span aria-hidden="true">&rarr;</span></a></div>`;
    body.querySelector('#pb-h').textContent = p.t; body.querySelector('.pb-one').textContent = p.one;
    body.querySelector('.w').textContent = p.what; body.querySelector('.b').textContent = p.biz;
    body.querySelectorAll('.pb-tags li').forEach((li, k) => { li.textContent = p.how[k]; });
    body.querySelector('.pb-cta a').addEventListener('click', close);
    if (p.demo) wireDemo();
    dlg.classList.add('open'); document.body.classList.add('locked');
    body.scrollTop = 0;
    setTimeout(() => dlg.querySelector('.x').focus({ preventScroll: true }), 60);
  };
  grid.addEventListener('click', (e) => { const c = e.target.closest('.pb-card'); if (c) open(Number(c.dataset.i)); });
  dlg.querySelector('.x').addEventListener('click', close);
  dlg.querySelector('.pb-bg').addEventListener('click', close);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && dlg.classList.contains('open')) close(); });
  const panel = dlg.querySelector('.pb-panel'); let y0 = null;
  panel.addEventListener('pointerdown', (e) => { if (!e.target.closest('.grab') || !matchMedia('(max-width: 760px)').matches) return; y0 = e.clientY; panel.style.transition = 'none'; panel.setPointerCapture(e.pointerId); });
  panel.addEventListener('pointermove', (e) => { if (y0 !== null) panel.style.transform = `translateY(${Math.max(0, e.clientY - y0)}px)`; });
  panel.addEventListener('pointerup', (e) => { if (y0 === null) return; const dy = e.clientY - y0; y0 = null; panel.style.transition = ''; panel.style.transform = ''; if (dy > 80) close(); });

  // ---------- the pocket automation interview ----------
  const INDUSTRY = { trades: 'Trades and field service', clinic: 'Clinic or dental office', pro: 'Law, accounting or finance', retail: 'Retail or restaurant', realty: 'Real estate', msp: 'IT or MSP' };
  const PAIN = { sched: 'Scheduling and no-shows', email: 'Email and follow-ups', money: 'Invoicing and getting paid', paper: 'Paperwork and data entry', reviews: 'Reviews and marketing' };
  const SIZE = { s: ['1 to 5 people', 1], m: ['6 to 20 people', 2.4], l: ['21 to 50 people', 4.5] };
  const IDEAS = {
    sched: [['Missed-call text back that books the slot', 3, 'Low'], ['Reminders that confirm, reschedule and fill cancellations', 4, 'Low'], ['One shared calendar view for the whole team', 2, 'Low']],
    email: [['An inbox agent that drafts replies for a human to approve', 5, 'Medium'], ['Automatic follow-ups on quotes nobody answered', 3, 'Low'], ['A daily brief of who is waiting on you', 2, 'Low']],
    money: [['Tiered invoice reminders that stop the moment it’s paid', 4, 'Low'], ['Receipts and expenses captured from a photo', 2, 'Low'], ['A weekly cash snapshot in plain English', 1, 'Low']],
    paper: [['Intake forms that fill the system of record for you', 5, 'Medium'], ['Documents read, sorted and filed by an agent', 4, 'Medium'], ['Kill the double entry between two systems', 3, 'Medium']],
    reviews: [['A review request after every finished job', 2, 'Low'], ['Replies to every review, drafted in your voice', 2, 'Low'], ['One post a week, drafted from your real work', 2, 'Low']],
  };
  const FLAVOR = { trades: 'on the job site', clinic: 'at the front desk', pro: 'for billable staff', retail: 'on the floor', realty: 'between showings', msp: 'on the service desk' };
  const COMPLY = { clinic: 'Patient data means HIPAA: keep AI tools on business agreements and out of chart notes by default.', pro: 'Client confidentiality comes first: no client data in consumer AI tools, ever.', msp: 'You hold the keys to other people’s businesses. Least privilege for every agent.', trades: 'Keep customer addresses and gate codes out of shared AI tools.', retail: 'Card data never touches the AI layer.', realty: 'Watch fair-housing language in anything an agent writes.' };
  const PROMPT = `You are conducting a structured AI Automation Discovery Interview. Interview the user about a client business to gather info for an Automation Design Brief.

PHASES, one question at a time:
1. IDENTITY: business name, industry
2. TEAM & TOOLS: staff count, software used, cloud/storage
3. PAIN POINTS (industry-specific): biggest time-wasters, manual processes
4. DEPTH DRILL: time spent, who does it, what breaks
5. CONSTRAINTS: budget comfort, compliance needs, tech comfort 1-5
6. OUTPUT: say 'I have everything I need. Generating your Automation Design Brief...' then produce ## Automation Design Brief with: Current Stack, Key Pain Points, Automation Opportunities (tool + hours saved + complexity), Compliance Notes, and a ready-to-paste Implementation Prompt.

Rules: ONE question per message. Acknowledge each answer briefly. Never advise until phase 6.`;
  const opts = (name, map) => Object.entries(map).map(([k, v]) => `<button type="button" data-q="${name}" data-v="${k}">${Array.isArray(v) ? v[0] : v}</button>`).join('');
  const demoHTML = `<div class="pb-demo" aria-live="polite">
    <div class="pb-q" data-step="0"><span class="mono">1 / 3 &middot; WHAT KIND OF BUSINESS?</span><div class="pb-opts">${opts('ind', INDUSTRY)}</div></div>
    <div class="pb-q" data-step="1" hidden><span class="mono">2 / 3 &middot; WHERE DOES THE TIME GO?</span><div class="pb-opts">${opts('pain', PAIN)}</div></div>
    <div class="pb-q" data-step="2" hidden><span class="mono">3 / 3 &middot; HOW BIG IS THE TEAM?</span><div class="pb-opts">${opts('size', SIZE)}</div></div>
    <div class="pb-brief" hidden></div>
  </div>`;
  function wireDemo() {
    const d = body.querySelector('.pb-demo'), ans = {};
    d.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-q]'); if (!b) return;
      ans[b.dataset.q] = b.dataset.v;
      b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      const step = Number(b.closest('.pb-q').dataset.step);
      const next = d.querySelector(`.pb-q[data-step="${step + 1}"]`);
      if (next) { next.hidden = false; setTimeout(() => next.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }), 60); }
      if (ans.ind && ans.pain && ans.size) brief(d.querySelector('.pb-brief'), ans);
    });
  }
  function brief(out, a) {
    const [sizeName, mult] = SIZE[a.size];
    const rows = IDEAS[a.pain].map(([t, h, cx]) => { const lo = Math.max(1, Math.round(h * mult * 0.7)), hi = Math.round(h * mult * 1.3) + 1; return { t, r: `${lo} to ${hi} h/week`, cx, hi }; });
    const total = rows.reduce((s, r) => s + r.hi, 0);
    out.hidden = false;
    out.innerHTML = `<div class="pb-bh"><span class="mono">AUTOMATION DESIGN BRIEF &middot; POCKET EDITION</span><b></b><small></small></div>
      <ol>${rows.map((r) => `<li><span class="t"></span><span class="m mono">${r.r} &middot; ${r.cx} lift</span></li>`).join('')}</ol>
      <p class="pb-comply"><span class="mono">COMPLIANCE NOTE</span> ${COMPLY[a.ind]}</p>
      <p class="pb-fine">Rough, rule-based estimates, not AI and not a quote. Up to about ${total} hours a week back for a team of ${sizeName.replace(' people', '')}. The real interview goes deeper.</p>
      <div class="pb-actions"><button type="button" class="btn btn-ghost pb-copy">Copy the full interview prompt</button></div>`;
    out.querySelector('b').textContent = `${INDUSTRY[a.ind]}: ${PAIN[a.pain].toLowerCase()}`;
    out.querySelector('small').textContent = `Where an agent earns its keep ${FLAVOR[a.ind]}.`;
    out.querySelectorAll('ol .t').forEach((el, i) => { el.textContent = rows[i].t; });
    out.querySelector('.pb-copy').addEventListener('click', async (e) => {
      try { await navigator.clipboard.writeText(PROMPT); e.target.textContent = 'Copied. Paste it into any AI chat.'; }
      catch (err) { e.target.textContent = 'Copy blocked by the browser'; }
    });
    setTimeout(() => out.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }), 80);
  }
})();
