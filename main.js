(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const fmt = new Intl.NumberFormat('en-US');
  const easeOutExpo = t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

  /* Reveal on scroll, staggered children */
  $$('[data-stagger]').forEach(group => {
    [...group.children].forEach((child, i) => child.style.setProperty('--d', `${i * 80}ms`));
  });
  $$('.split-head, .calc__head, .hero__copy, .faq__head, .contact__copy, .commit__copy').forEach(group => {
    $$(':scope > [data-reveal]', group).forEach((el, i) => el.style.setProperty('--d', `${i * 90}ms`));
  });
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  $$('[data-reveal], [data-stagger], .board').forEach(el => revealIO.observe(el));

  /* Animated counters */
  const runCount = el => {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const sep = el.hasAttribute('data-sep');
    const show = v => { el.textContent = sep ? fmt.format(Math.round(v)) : v.toFixed(dec); };
    if (reduce) return show(target);
    const dur = 1800, start = performance.now();
    const tick = now => {
      const t = Math.min(1, (now - start) / dur);
      show(target * easeOutExpo(t));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const countIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const delay = e.target.closest('.board') ? 700 : 150;
        setTimeout(() => runCount(e.target), delay);
        countIO.unobserve(e.target);
      }
    });
  }, { threshold: 0.4 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* Bars stagger */
  $$('.bars span').forEach((b, i) => { b.style.transitionDelay = `${600 + i * 55}ms`; });

  /* Nav state, progress bar, parallax */
  const nav = $('#nav');
  const bar = $('.progress span');
  const parallax = $$('[data-parallax]');
  let lastY = window.scrollY, ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    nav.classList.toggle('is-scrolled', y > 24);
    if (!nav.classList.contains('is-open')) nav.classList.toggle('is-hidden', y > 480 && y > lastY + 4);
    if (y < lastY - 4) nav.classList.remove('is-hidden');
    lastY = y;
    if (!reduce) parallax.forEach(img => {
      const r = img.parentElement.getBoundingClientRect();
      const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      img.style.transform = `translateY(${p * -40}px)`;
    });
    updateLoop();
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });

  /* Current section in nav */
  const links = $$('.nav__links a');
  const secIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) links.forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === `#${e.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => secIO.observe(s));

  /* Mobile menu */
  const toggle = $('.nav__toggle');
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  $$('.mobile-menu a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }));

  /* Button fill follows the pointer */
  $$('.btn').forEach(btn => btn.addEventListener('pointerenter', e => {
    const r = btn.getBoundingClientRect();
    btn.style.setProperty('--mx', `${e.clientX - r.left}px`);
    btn.style.setProperty('--my', `${e.clientY - r.top}px`);
  }));

  /* Savings calculator */
  const inputs = { people: $('#c-people'), hours: $('#c-hours'), rate: $('#c-rate'), share: $('#c-share') };
  const outs = { save: $('#r-save'), cost: $('#r-cost'), after: $('#r-after'), hours: $('#r-hours'), fte: $('#r-fte'), wait: $('#r-wait') };
  const shown = { save: 0, cost: 0, after: 0, hours: 0, fte: 0, wait: 0 };
  let tweenId = 0;
  const compact = v => v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : fmt.format(Math.round(v));
  const paintRange = el => el.style.setProperty('--p', `${((el.value - el.min) / (el.max - el.min)) * 100}%`);
  const calc = () => {
    const people = +inputs.people.value, hours = +inputs.hours.value, rate = +inputs.rate.value, share = +inputs.share.value / 100;
    $('#o-people').textContent = people;
    $('#o-hours').textContent = `${hours} h`;
    $('#o-rate').textContent = `$${rate}`;
    $('#o-share').textContent = `${Math.round(share * 100)}%`;
    Object.values(inputs).forEach(paintRange);

    const yearlyHours = people * hours * 48;
    const cost = yearlyHours * rate;
    const target = {
      cost, save: cost * share, after: cost * (1 - share),
      hours: yearlyHours * share, fte: (yearlyHours * share) / 1760, wait: (cost * share) / 12
    };
    $('#b-today').style.transform = 'scaleX(1)';
    $('#b-after').style.transform = `scaleX(${1 - share})`;

    const from = { ...shown }, id = ++tweenId, start = performance.now(), dur = reduce ? 1 : 650;
    const step = now => {
      if (id !== tweenId) return;
      const t = Math.min(1, (now - start) / dur), k = easeOutExpo(t);
      Object.keys(target).forEach(key => { shown[key] = from[key] + (target[key] - from[key]) * k; });
      outs.save.textContent = compact(shown.save);
      outs.cost.textContent = compact(shown.cost);
      outs.after.textContent = compact(shown.after);
      outs.hours.textContent = fmt.format(Math.round(shown.hours));
      outs.fte.textContent = shown.fte.toFixed(1);
      outs.wait.textContent = compact(shown.wait);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  Object.values(inputs).forEach(el => el.addEventListener('input', calc));
  let calcStarted = false;
  new IntersectionObserver((entries, io) => {
    if (entries[0].isIntersecting && !calcStarted) { calcStarted = true; calc(); io.disconnect(); }
  }, { threshold: 0.25 }).observe($('#calculator'));
  Object.values(inputs).forEach(paintRange);

  /* Solutions tabs with gentle auto advance */
  const sol = $('.sol');
  const tabs = $$('.sol__tabs [role=tab]');
  const panels = $$('.sol__panel');
  let solIndex = 0, solTimer = null, solVisible = false, flowTimers = [];
  const AUTO = 9000;
  sol.style.setProperty('--auto', `${AUTO}ms`);
  const runFlow = panel => {
    flowTimers.forEach(clearTimeout); flowTimers = [];
    const items = $$('.flow li', panel);
    items.forEach(li => li.classList.remove('done'));
    items.forEach((li, i) => flowTimers.push(setTimeout(() => li.classList.add('done'), 500 + i * 520)));
  };
  const selectTab = (i, focus = false) => {
    solIndex = i;
    tabs.forEach((t, j) => {
      const on = j === i;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach((p, j) => {
      const on = j === i;
      p.hidden = !on;
      p.classList.toggle('is-active', on);
    });
    runFlow(panels[i]);
    if (focus) tabs[i].focus();
    if (window.innerWidth <= 1100) tabs[i].scrollIntoView({ block: 'nearest', inline: 'start', behavior: reduce ? 'auto' : 'smooth' });
  };
  const schedule = () => {
    clearInterval(solTimer);
    if (reduce || sol.classList.contains('is-paused')) return;
    solTimer = setInterval(() => { if (solVisible) selectTab((solIndex + 1) % tabs.length); }, AUTO);
  };
  const pause = () => { sol.classList.add('is-paused'); clearInterval(solTimer); };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { pause(); selectTab(i); });
    t.addEventListener('keydown', e => {
      const k = e.key;
      if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'].includes(k)) {
        e.preventDefault(); pause();
        let n = i;
        if (k === 'ArrowDown' || k === 'ArrowRight') n = (i + 1) % tabs.length;
        if (k === 'ArrowUp' || k === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
        if (k === 'Home') n = 0;
        if (k === 'End') n = tabs.length - 1;
        selectTab(n, true);
      }
    });
  });
  sol.addEventListener('pointerdown', pause, { once: true });
  new IntersectionObserver(entries => {
    solVisible = entries[0].isIntersecting;
    if (solVisible && !sol.dataset.started) { sol.dataset.started = '1'; runFlow(panels[0]); schedule(); }
  }, { threshold: 0.3 }).observe(sol);
  if (reduce) sol.classList.add('is-paused');

  /* Approach loop: a dot travels the Verzent loop as you scroll */
  const loop = $('.loop');
  const path = $('#loop-path');
  const draw = $('.loop__draw');
  const dot = $('.loop__dot');
  const nodesG = $('.loop__nodes');
  const steps = $$('.loop__steps li');
  const readout = $('#loop-stage');
  const L = path.getTotalLength();
  const names = steps.map(s => $('h3', s).textContent);
  draw.style.strokeDasharray = L;
  draw.style.strokeDashoffset = L;
  const nodes = names.map((_, i) => {
    const pt = path.getPointAtLength((L * i) / names.length);
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y); c.setAttribute('r', 12);
    nodesG.appendChild(c);
    return c;
  });
  let lastStage = -1;
  const setStage = idx => {
    if (idx === lastStage) return;
    lastStage = idx;
    steps.forEach((s, i) => s.classList.toggle('on', i === idx));
    nodes.forEach((n, i) => n.classList.toggle('on', i <= idx));
    if (!reduce) {
      readout.animate([{ opacity: 0, transform: 'translateY(8px)', filter: 'blur(3px)' }, { opacity: 1, transform: 'none', filter: 'none' }], { duration: 380, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    }
    readout.textContent = names[idx];
  };
  function updateLoop() {
    const r = loop.getBoundingClientRect();
    const startAt = innerHeight * 0.65;
    const total = r.height - innerHeight * 0.3;
    const p = Math.min(1, Math.max(0, (startAt - r.top) / Math.max(total, 1)));
    const len = p * L * 0.999;
    const pt = path.getPointAtLength(len);
    dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
    draw.style.strokeDashoffset = L - len;
    setStage(Math.min(names.length - 1, Math.floor(p * names.length)));
  }
  steps.forEach((s, i) => {
    s.addEventListener('click', () => setStage(i));
  });

  /* Maturity scale */
  const stages = [
    { t: 'Manual', d: 'Spreadsheets, paper and chat threads hold the business together. Knowledge lives in a few people’s heads and every report is built by hand.',
      s: ['Data typed more than once', 'Reports take days to prepare', 'Leads tracked in notebooks or chats'],
      n: 'Map your core processes and centralize customer and sales data in one place.', g: 'Typical first win: 20% to 30% fewer hours on admin work' },
    { t: 'Organized', d: 'Core tools are in place, like accounting software or a CRM, but they are used inconsistently and do not talk to each other.',
      s: ['The same client exists in three systems', 'Each team has its own version of the numbers', 'Tools paid for but half used'],
      n: 'Define the KPIs that matter, clean the data and set clear routines for each tool.', g: 'Typical win: one trusted set of numbers every week' },
    { t: 'Connected', d: 'Your systems share data and leadership sees one version of the truth. The next bottleneck is the repetitive work still done by people.',
      s: ['Live dashboards replace weekly spreadsheets', 'Handoffs between teams still need reminders', 'Growth means hiring more admin staff'],
      n: 'Automate the high volume flows: orders, invoices, follow ups and approvals.', g: 'Typical win: growth without adding headcount' },
    { t: 'Automated', d: 'Routine work runs on its own and your team handles the exceptions. Now the opportunity is in faster, better decisions.',
      s: ['Most transactions need no manual touch', 'Errors are caught automatically', 'Your team has time for higher value work'],
      n: 'Add intelligent assistants for customer service, triage and document work.', g: 'Typical win: answers in seconds, around the clock' },
    { t: 'Intelligent', d: 'AI supports daily decisions: forecasting demand, answering customers and flagging risks early. Improvement becomes a monthly habit.',
      s: ['Forecasts guide purchasing and staffing', 'Assistants resolve routine requests', 'Every process has an owner and a KPI'],
      n: 'Keep compounding with monthly reviews and a steady roadmap of improvements.', g: 'Typical win: continuous gains, measured every month' }
  ];
  const matBtns = $$('.mat__scale button');
  const matCard = $('.mat__card');
  const matFill = $('.mat__fill');
  const setMat = (i, focus) => {
    const st = stages[i];
    matBtns.forEach((b, j) => {
      b.setAttribute('aria-selected', j === i);
      b.tabIndex = j === i ? 0 : -1;
      b.classList.toggle('passed', j < i);
    });
    matFill.style.width = `${(i / (stages.length - 1)) * 80}%`;
    $('#m-title').textContent = st.t;
    $('#m-desc').textContent = st.d;
    $('#m-signs').innerHTML = st.s.map(x => `<li>${x}</li>`).join('');
    $('#m-next').textContent = st.n;
    $('#m-gain').textContent = st.g;
    matCard.classList.remove('swap'); void matCard.offsetWidth; matCard.classList.add('swap');
    if (focus) matBtns[i].focus();
  };
  matBtns.forEach((b, i) => {
    b.addEventListener('click', () => setMat(i));
    b.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); setMat(Math.min(i + 1, 4), true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setMat(Math.max(i - 1, 0), true); }
    });
  });
  setMat(0);

  /* FAQ accordion */
  $$('.acc__item').forEach(item => {
    const btn = $('button', item);
    btn.addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      $$('.acc__item.is-open').forEach(o => { o.classList.remove('is-open'); $('button', o).setAttribute('aria-expanded', 'false'); });
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open);
    });
  });

  /* Contact form: sent through Web3Forms, which emails each request to the inbox tied to the key */
  const WEB3FORMS_KEY = '9fa72e59-be36-4b5b-afcd-167686faa552';
  const form = $('#contact-form');
  const note = $('#form-note');
  const submitBtn = $('button[type=submit]', form);
  const submitLabel = $('span', submitBtn);
  const setNote = (text, state) => {
    note.textContent = text;
    note.classList.toggle('ok', state === 'ok');
    note.classList.toggle('err', state === 'err');
  };
  const mailtoFallback = data => {
    const body = [
      `Name: ${data.get('name')}`, `Company: ${data.get('company')}`, `Email: ${data.get('email')}`,
      `Phone: ${data.get('phone')}`, `Main challenge: ${data.get('topic')}`, '', data.get('message')
    ].join('\n');
    location.href = `mailto:sebastian@verzentconsulting.com?cc=admin@verzentconsulting.com&subject=${encodeURIComponent('Free diagnostic request')}&body=${encodeURIComponent(body)}`;
  };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = new FormData(form);
    let ok = true;
    ['name', 'email'].forEach(n => {
      const el = form.elements[n];
      const bad = !el.value.trim() || (n === 'email' && !/^\S+@\S+\.\S+$/.test(el.value));
      el.classList.toggle('invalid', bad);
      if (bad) ok = false;
    });
    if (!ok) return setNote('Please add your name and a valid email.', 'err');
    if (data.get('botcheck')) return;

    if (WEB3FORMS_KEY.startsWith('PASTE_')) {
      mailtoFallback(data);
      return setNote('Thank you. Your email app is opening with the details ready to send.', 'ok');
    }

    submitBtn.disabled = true;
    form.classList.add('is-sending');
    submitLabel.textContent = 'Sending…';
    setNote('', null);
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `Free diagnostic request from ${data.get('name')}${data.get('company') ? `, ${data.get('company')}` : ''}`,
          from_name: 'Verzent website',
          replyto: data.get('email'),
          name: data.get('name'),
          company: data.get('company'),
          email: data.get('email'),
          phone: data.get('phone'),
          main_challenge: data.get('topic'),
          message: data.get('message')
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Request failed');
      form.reset();
      form.classList.add('is-sent');
      setNote('Thank you. Your request is in, and we will reply within one business day.', 'ok');
    } catch (err) {
      setNote('Something went wrong sending your request. Please email sebastian@verzentconsulting.com or message us on WhatsApp.', 'err');
    } finally {
      submitBtn.disabled = false;
      form.classList.remove('is-sending');
      submitLabel.textContent = 'Request my free diagnostic';
    }
  });

  onScroll();
})();
