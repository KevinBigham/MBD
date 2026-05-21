import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = '/Users/kevin/MBD-main';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://127.0.0.1:5176/MBD';
const OUT_DIR = path.join(ROOT, '.logs');
const SHOT_DIR = path.join(OUT_DIR, 'screenshots');
const PROFILE_DIR = path.join(OUT_DIR, 'chrome-final-profile');
const PORT = 9326;

await fs.mkdir(SHOT_DIR, { recursive: true });
await fs.rm(PROFILE_DIR, { recursive: true, force: true });

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE_DIR}`,
  '--disable-gpu',
  '--disable-extensions',
  '--disable-background-networking',
  '--no-first-run',
  '--no-default-browser-check',
  '--window-size=1280,900',
  'about:blank',
], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

const chromeLogs = [];
chrome.stderr.on('data', (chunk) => {
  chromeLogs.push(chunk.toString());
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJsonVersion() {
  const url = `http://127.0.0.1:${PORT}/json/version`;
  const deadline = Date.now() + 15_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw new Error(`Chrome did not expose CDP: ${lastError?.message ?? 'timeout'}`);
}

async function createPage() {
  const response = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
  if (!response.ok) {
    throw new Error(`Could not create CDP page: ${response.status} ${await response.text()}`);
  }
  return await response.json();
}

class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    this.logs = [];
    this.ws.addEventListener('message', (event) => this.handleMessage(event));
  }

  async open() {
    if (this.ws.readyState === WebSocket.OPEN) {
      return;
    }
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP websocket open timeout')), 10_000);
      this.ws.addEventListener('open', () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      this.ws.addEventListener('error', () => {
        clearTimeout(timer);
        reject(new Error('CDP websocket error'));
      }, { once: true });
    });
  }

  handleMessage(event) {
    const message = JSON.parse(event.data);
    if (message.id && this.pending.has(message.id)) {
      const { resolve, reject, timer } = this.pending.get(message.id);
      clearTimeout(timer);
      this.pending.delete(message.id);
      if (message.error) {
        reject(new Error(`${message.error.message}${message.error.data ? `: ${message.error.data}` : ''}`));
      } else {
        resolve(message.result ?? {});
      }
      return;
    }
    if (message.method) {
      this.events.push(message);
      if (message.method === 'Runtime.consoleAPICalled') {
        this.logs.push({
          level: message.params.type,
          text: message.params.args?.map((arg) => arg.value ?? arg.description ?? '').join(' '),
        });
      }
      if (message.method === 'Runtime.exceptionThrown') {
        this.logs.push({
          level: 'error',
          text: message.params.exceptionDetails?.text ?? message.params.exceptionDetails?.exception?.description ?? 'Runtime exception',
        });
      }
      if (message.method === 'Log.entryAdded') {
        this.logs.push({
          level: message.params.entry.level,
          text: message.params.entry.text,
        });
      }
    }
  }

  send(method, params = {}, timeoutMs = 30_000) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP ${method} timeout`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
    });
  }

  async close() {
    this.ws.close();
  }
}

const metricsScript = String.raw`
(() => {
  const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const rectOf = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      left: Math.round(r.left),
      right: Math.round(r.right),
      width: Math.round(r.width),
      height: Math.round(r.height),
    };
  };
  const visible = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return r.width > 0
      && r.height > 0
      && style.visibility !== 'hidden'
      && style.display !== 'none'
      && r.bottom > 0
      && r.top < window.innerHeight
      && r.right > 0
      && r.left < window.innerWidth;
  };
  const mobileNavEl = document.querySelector('.fixed.bottom-0');
  const controlsRoot = document.querySelector('[data-tour="sim-controls"]');
  const mobileNav = Array.from(document.querySelectorAll('.fixed.bottom-0 a, .fixed.bottom-0 button'))
    .filter(visible)
    .map((el) => normalize(el.textContent) || el.getAttribute('aria-label'))
    .filter(Boolean);
  const simTargets = [
    { label: 'Day', aria: 'Sim Day' },
    { label: 'Week', aria: 'Sim Week' },
    { label: 'Month', aria: 'Next Month' },
    { label: 'Playoffs', aria: 'playoff' },
  ];
  const simButtons = simTargets.map(({ label, aria }) => {
    const button = Array.from(controlsRoot?.querySelectorAll('button') ?? []).find((el) => {
      const text = normalize(el.textContent);
      const ariaLabel = el.getAttribute('aria-label') || '';
      return text === label || text.includes(label) || ariaLabel.includes(aria);
    });
    return button ? {
      label,
      rect: rectOf(button),
      disabled: button.disabled,
      visible: visible(button),
    } : { label, missing: true };
  });
  const firstSimButton = controlsRoot?.querySelector('button');
  const demoteButtons = Array.from(document.querySelectorAll('button')).filter((el) => normalize(el.textContent).includes('Demote'));
  const promoteButtons = Array.from(document.querySelectorAll('button')).filter((el) => normalize(el.textContent).includes('Promote'));
  const dialogs = Array.from(document.querySelectorAll('[role="dialog"]')).map((el) => ({
    text: normalize(el.textContent).slice(0, 80),
    ariaModal: el.getAttribute('aria-modal'),
    ariaHidden: el.getAttribute('aria-hidden'),
    hidden: el.hidden,
    inert: el.inert === true,
    rect: rectOf(el),
    visible: visible(el),
  }));
  const overflow = Array.from(document.querySelectorAll('body *')).map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && r.height > 0 && (r.right > window.innerWidth + 2 || r.left < -2))
    .slice(0, 12)
    .map(({ el, r }) => ({
      tag: el.tagName.toLowerCase(),
      text: normalize(el.textContent).slice(0, 70),
      className: String(el.className || '').slice(0, 100),
      left: Math.round(r.left),
      right: Math.round(r.right),
      width: Math.round(r.width),
    }));
  const hasLayout = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return r.width > 0 && r.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  };
  const buttonState = (text) => {
    const matches = Array.from(document.querySelectorAll('button, a'))
      .filter((node) => normalize(node.textContent) === text || normalize(node.textContent).includes(text));
    const el = matches.find(visible) || matches.find(hasLayout) || matches[0];
    return el ? {
      text,
      visible: visible(el),
      disabled: el.disabled === true,
      rect: rectOf(el),
      tag: el.tagName.toLowerCase(),
      href: el.getAttribute('href'),
    } : { text, missing: true };
  };
  return {
    url: location.href,
    title: normalize(document.querySelector('h1')?.textContent || document.title),
    viewport: { width: window.innerWidth, height: window.innerHeight },
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
    mobileNav,
    mobileNavRect: rectOf(mobileNavEl),
    simControlsRect: rectOf(controlsRoot ?? firstSimButton?.closest('[data-tour="sim-controls"]')),
    simButtons,
    responsiveCardCount: document.querySelectorAll('.md\\:hidden.space-y-2 > div.rounded-lg, .md\\:hidden.space-y-2 > div').length,
    visibleTableCount: Array.from(document.querySelectorAll('table')).filter(visible).length,
    visibleDemoteButtons: demoteButtons.filter(visible).map((el) => rectOf(el)).slice(0, 5),
    visiblePromoteButtons: promoteButtons.filter(visible).map((el) => rectOf(el)).slice(0, 5),
    dialogs,
    helpButtons: Array.from(document.querySelectorAll('button[aria-haspopup="dialog"]')).map((el) => ({
      label: el.getAttribute('aria-label') || normalize(el.textContent),
      expanded: el.getAttribute('aria-expanded'),
      visible: visible(el),
    })),
    moreMenuItems: Array.from(document.querySelectorAll('a, button'))
      .filter((el) => visible(el))
      .map((el) => normalize(el.textContent) || el.getAttribute('aria-label'))
      .filter(Boolean)
      .filter((text) => !mobileNav.includes(text))
      .slice(0, 50),
    keyControls: {
      newDynasty: buttonState('New Dynasty'),
      returnDashboard: buttonState('Return to Dashboard'),
      demote: buttonState('Demote'),
      promote: buttonState('Promote'),
      more: buttonState('More'),
      trade: buttonState('Trade'),
    },
    overflow,
  };
})()
`;

async function evaluate(cdp, expression, timeoutMs = 30_000) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, timeoutMs);
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? result.exceptionDetails.exception?.description ?? 'Runtime.evaluate failed');
  }
  return result.result?.value;
}

async function setViewport(cdp, width, height) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width <= 480,
    screenWidth: width,
    screenHeight: height,
  });
}

async function goto(cdp, route) {
  const url = `${BASE_URL}${route}`;
  await cdp.send('Page.navigate', { url });
}

async function waitForText(cdp, text, timeoutMs = 30_000) {
  const expression = `
    new Promise((resolve) => {
      const deadline = Date.now() + ${timeoutMs};
      const target = ${JSON.stringify(text)};
      const tick = () => {
        if ((document.body?.innerText || '').includes(target)) {
          resolve(true);
          return;
        }
        if (Date.now() > deadline) {
          resolve(false);
          return;
        }
        setTimeout(tick, 100);
      };
      tick();
    })
  `;
  const found = await evaluate(cdp, expression, timeoutMs + 5_000);
  if (!found) {
    const body = await evaluate(cdp, `(document.body?.innerText || '').slice(0, 600)`, 5_000);
    throw new Error(`Timed out waiting for "${text}". Body: ${body}`);
  }
}

async function waitForButtonEnabled(cdp, text, timeoutMs = 60_000) {
  const expression = `
    new Promise((resolve) => {
      const deadline = Date.now() + ${timeoutMs};
      const target = ${JSON.stringify(text)};
      const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim();
      const tick = () => {
        const button = Array.from(document.querySelectorAll('button')).find((el) => normalize(el.textContent).includes(target));
        if (button && !button.disabled) {
          resolve(true);
          return;
        }
        if (Date.now() > deadline) {
          resolve(false);
          return;
        }
        setTimeout(tick, 150);
      };
      tick();
    })
  `;
  const found = await evaluate(cdp, expression, timeoutMs + 5_000);
  if (!found) {
    throw new Error(`Timed out waiting for enabled button "${text}"`);
  }
}

async function clickText(cdp, text, selector = 'button, a') {
  const clicked = await evaluate(cdp, `
    (() => {
      const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim();
      const visible = (el) => {
        const r = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return r.width > 0 && r.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };
      const target = ${JSON.stringify(text)};
      const nodes = Array.from(document.querySelectorAll(${JSON.stringify(selector)})).filter(visible);
      const exact = nodes.find((el) => normalize(el.textContent) === target);
      const partial = nodes.find((el) => normalize(el.textContent).includes(target));
      const el = exact || partial;
      if (!el) return { clicked: false, candidates: nodes.map((node) => normalize(node.textContent)).slice(0, 30) };
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
      el.click();
      const r = el.getBoundingClientRect();
      return { clicked: true, text: normalize(el.textContent), rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height) } };
    })()
  `, 10_000);
  if (!clicked?.clicked) {
    throw new Error(`Could not click "${text}": ${JSON.stringify(clicked)}`);
  }
  return clicked;
}

async function capture(cdp, name) {
  const result = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  }, 30_000);
  const file = path.join(SHOT_DIR, name);
  await fs.writeFile(file, Buffer.from(result.data, 'base64'));
  return file;
}

async function collectPage(cdp, evidence, key, route, text, width, height, screenshotName) {
  await setViewport(cdp, width, height);
  await goto(cdp, route);
  await waitForText(cdp, text, 40_000);
  evidence.pages[key] = await evaluate(cdp, metricsScript, 10_000);
  evidence.screenshots[key] = await capture(cdp, screenshotName);
}

let cdp;
const evidence = {
  startedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  pages: {},
  screenshots: {},
  setupActions: [],
  console: {},
  chromeLogs,
};

try {
  await waitForJsonVersion();
  const page = await createPage();
  cdp = new CDP(page.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');

  await collectPage(cdp, evidence, 'savehub-desktop', '/', 'New Dynasty', 1280, 900, 'final-savehub-desktop.png');
  await collectPage(cdp, evidence, 'savehub-mobile', '/', 'New Dynasty', 375, 812, 'final-savehub-mobile.png');

  evidence.setupActions.push(await clickText(cdp, 'New Dynasty', 'button'));
  await waitForText(cdp, 'Begin Season 1', 40_000);
  evidence.pages['savehub-mobile-wizard'] = await evaluate(cdp, `
    (() => {
      const section = document.querySelector('#new-dynasty-setup');
      const r = section?.getBoundingClientRect();
      const active = document.activeElement;
      const newButton = Array.from(document.querySelectorAll('button')).find((el) => (el.textContent || '').replace(/\\s+/g, ' ').trim() === 'New Dynasty');
      const br = newButton?.getBoundingClientRect();
      return {
        url: location.href,
        activeId: active?.id || null,
        sectionTop: r ? Math.round(r.top) : null,
        sectionBottom: r ? Math.round(r.bottom) : null,
        scrollTop: Math.round(document.scrollingElement?.scrollTop || 0),
        newDynastyButtonRect: br ? {
          top: Math.round(br.top),
          bottom: Math.round(br.bottom),
          width: Math.round(br.width),
          height: Math.round(br.height),
        } : null,
      };
    })()
  `, 10_000);
  evidence.screenshots['savehub-mobile-wizard'] = await capture(cdp, 'final-savehub-mobile-wizard.png');

  await waitForButtonEnabled(cdp, 'Begin Season 1', 90_000);
  evidence.setupActions.push(await clickText(cdp, 'Quick Start', 'button'));
  evidence.setupActions.push(await clickText(cdp, 'Begin Season 1', 'button'));
  await waitForText(cdp, 'SIM DAY', 90_000).catch(async () => {
    await goto(cdp, '/dashboard');
    await waitForText(cdp, 'SIM DAY', 60_000);
  });

  await collectPage(cdp, evidence, 'dashboard-desktop', '/dashboard', 'SIM DAY', 1280, 900, 'final-dashboard-desktop.png');
  await collectPage(cdp, evidence, 'dashboard-mobile', '/dashboard', 'SIM DAY', 375, 812, 'final-dashboard-mobile.png');
  await collectPage(cdp, evidence, 'roster-desktop', '/roster', 'Roster', 1280, 900, 'final-roster-desktop.png');
  await collectPage(cdp, evidence, 'roster-mobile', '/roster', 'Roster', 375, 812, 'final-roster-mobile.png');

  await evaluate(cdp, `
    (() => {
      const button = Array.from(document.querySelectorAll('button')).find((el) => {
        const style = window.getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return (el.textContent || '').includes('Demote')
          && style.display !== 'none'
          && style.visibility !== 'hidden'
          && r.width > 0
          && r.height > 0;
      });
      button?.scrollIntoView({ block: 'center', inline: 'nearest' });
      return Boolean(button);
    })()
  `, 10_000);
  evidence.pages['roster-mobile-demote'] = await evaluate(cdp, metricsScript, 10_000);
  evidence.screenshots['roster-mobile-demote'] = await capture(cdp, 'final-roster-mobile-demote.png');

  await collectPage(cdp, evidence, 'trade-desktop', '/trade', 'Trade', 1280, 900, 'final-trade-desktop.png');
  await collectPage(cdp, evidence, 'trade-mobile', '/trade', 'Trade', 375, 812, 'final-trade-mobile.png');

  await setViewport(cdp, 375, 812);
  await goto(cdp, '/dashboard');
  await waitForText(cdp, 'SIM DAY', 40_000);
  evidence.setupActions.push(await clickText(cdp, 'More', 'button'));
  await waitForText(cdp, 'Free Agency', 10_000);
  evidence.pages['mobile-more-open'] = await evaluate(cdp, metricsScript, 10_000);
  evidence.screenshots['mobile-more-open'] = await capture(cdp, 'final-mobile-more-open.png');

  evidence.console.errors = cdp.logs.filter((entry) => entry.level === 'error');
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(OUT_DIR, 'final-browser-evidence.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  try {
    await cdp?.send('Browser.close', {}, 5_000);
  } catch {
    chrome.kill('SIGTERM');
  }
  try {
    await cdp?.close();
  } catch {
    // no-op
  }
  try {
    await fs.rm(PROFILE_DIR, { recursive: true, force: true });
  } catch {
    // no-op
  }
  setTimeout(() => chrome.kill('SIGKILL'), 2_000).unref();
}
