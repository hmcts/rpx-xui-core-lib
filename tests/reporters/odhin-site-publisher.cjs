const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const lanes = ['browser', 'cache-upgrade'];
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

function slugifyBranch(branch) {
  const raw = String(branch);
  if (raw === 'master') return raw;
  const readable = raw.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[.-]+|[.-]+$/g, '').slice(0, 96) || 'branch';
  return `${readable}-${crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16)}`;
}

function rejectLinks(directory) {
  const stat = fs.lstatSync(directory);
  if (stat.isSymbolicLink()) throw new Error('Report trees must not contain symbolic links');
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(directory)) rejectLinks(path.join(directory, name));
  } else if (!stat.isFile()) throw new Error('Report trees must contain only regular files');
}

function validateSource(sourceDir) {
  rejectLinks(sourceDir);
  const available = lanes.filter(lane => fs.existsSync(path.join(sourceDir, lane, 'index.html')));
  if (!available.length) throw new Error('No browser Odhín report is available');
  for (const lane of available) {
    const html = fs.readFileSync(path.join(sourceDir, lane, 'index.html'), 'utf8');
    if (!/<body\b/i.test(html) || !html.includes('odhin-feature-summary') || !html.includes('id="core-lib-report-ui" src="./presentation/report.js"')) throw new Error(`Incomplete ${lane} Odhín report`);
    for (const asset of ['presentation/report.css', 'presentation/report.js', 'presentation/feature.css', 'js/chartjs.js']) {
      if (!fs.statSync(path.join(sourceDir, lane, asset)).isFile() || !fs.statSync(path.join(sourceDir, lane, asset)).size) throw new Error(`Missing ${lane} presentation asset`);
    }
  }
  return available;
}

const page = (title, content) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><style>body{font:1rem system-ui;max-width:70rem;margin:auto;padding:2rem;line-height:1.6}a{overflow-wrap:anywhere}li{margin:.75rem 0}</style></head><body><main><h1>${escapeHtml(title)}</h1>${content}</main></body></html>\n`;

function sourceDigest(sourceDir, available) {
  const hash = crypto.createHash('sha256');
  for (const lane of available) {
    for (const file of fs.readdirSync(path.join(sourceDir, lane), { recursive: true }).map(String).sort()) {
      const absolute = path.join(sourceDir, lane, file);
      if (fs.statSync(absolute).isFile()) hash.update(`${lane}/${file}\0`).update(fs.readFileSync(absolute)).update('\0');
    }
  }
  return hash.digest('hex');
}

/** @param {{ sourceDir: string, siteDir: string, rawBranch: string, runKey: string, runId: string, runAttempt: string, sha: string, runUrl: string }} options */
function publishReport({ sourceDir, siteDir, rawBranch, runKey, runId, runAttempt, sha, runUrl }) {
  const available = validateSource(sourceDir);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(runKey) || !/^\d+$/.test(runId) || !/^\d+$/.test(runAttempt)) throw new Error('Invalid run identifier');
  if (new URL(runUrl).protocol !== 'https:') throw new Error('Run URL must use HTTPS');
  const site = path.resolve(siteDir);
  const source = path.resolve(sourceDir);
  if (site === source || site.startsWith(source + path.sep) || source.startsWith(site + path.sep)) throw new Error('Source and site must be separate trees');
  if (fs.existsSync(site)) rejectLinks(site);
  const branchSlug = slugifyBranch(rawBranch);
  const branchDir = path.join(site, 'reports', branchSlug);
  const runDir = path.join(branchDir, 'runs', runKey);
  const paths = { branchUrlPath: `reports/${branchSlug}/`, runUrlPath: `reports/${branchSlug}/runs/${runKey}/` };
  const identity = { rawBranch, runKey, runId, runAttempt, sha, runUrl, sourceDigest: sourceDigest(source, available) };
  if (fs.existsSync(runDir)) {
    const existing = JSON.parse(fs.readFileSync(path.join(runDir, 'odhin-run.json'), 'utf8'));
    if (!Object.entries(identity).every(([key, value]) => existing[key] === value)) throw new Error('An existing report run differs and must not be overwritten');
  } else {
    fs.mkdirSync(path.dirname(runDir), { recursive: true });
    const staging = fs.mkdtempSync(path.join(path.dirname(runDir), '.odhin-'));
    try {
      for (const lane of available) fs.cpSync(path.join(source, lane), path.join(staging, lane), { recursive: true });
      const links = available.map(lane => `<li><a href="./${lane}/index.html">${lane === 'browser' ? 'Gallery browser' : 'Installed package and cache'} report</a></li>`).join('');
      fs.writeFileSync(path.join(staging, 'index.html'), page('RPX XUI Core Odhín reports', `<p>Branch: ${escapeHtml(rawBranch)} · commit: ${escapeHtml(sha)}</p><ul>${links}</ul><p><a href="${escapeHtml(runUrl)}">Open this Actions run and all validation evidence</a></p><p>Only generated browser reports are listed. The Actions result determines whether all required checks passed.</p>`));
      fs.mkdirSync(path.join(staging, 'presentation'), { recursive: true });
      fs.copyFileSync(path.join(__dirname, 'presentation/report-navigation.css'), path.join(staging, 'presentation/report-navigation.css'));
      for (const lane of available) {
        const file = path.join(staging, lane, 'index.html');
        const nav = '<link rel="stylesheet" href="../presentation/report-navigation.css"><nav class="odhin-report-navigation" aria-label="Odhín reports"><a href="../index.html">All reports for this run</a><a href="../../../index.html">Branch history</a><a href="../../../../../index.html">Report index</a></nav>';
        fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/<body\b[^>]*>/i, match => match + nav));
      }
      fs.writeFileSync(path.join(staging, 'odhin-run.json'), JSON.stringify({ ...identity, available }, null, 2));
      fs.renameSync(staging, runDir);
    } finally {
      fs.rmSync(staging, { recursive: true, force: true });
    }
  }
  const runs = fs.readdirSync(path.join(branchDir, 'runs')).filter(name => fs.existsSync(path.join(branchDir, 'runs', name, 'odhin-run.json'))).map(name => JSON.parse(fs.readFileSync(path.join(branchDir, 'runs', name, 'odhin-run.json'), 'utf8'))).sort((a, b) => Number(b.runId) - Number(a.runId) || Number(b.runAttempt) - Number(a.runAttempt));
  fs.writeFileSync(path.join(branchDir, 'index.html'), page(`Odhín · ${rawBranch}`, `<p><a href="./runs/${runs[0].runKey}/index.html">Latest run</a></p><ul>${runs.map(run => `<li><a href="./runs/${run.runKey}/index.html">Run ${run.runKey}</a> · ${escapeHtml(run.sha)}</li>`).join('')}</ul>`));
  const branches = fs.readdirSync(path.join(site, 'reports')).sort();
  fs.writeFileSync(path.join(site, 'index.html'), page('RPX XUI Core Odhín report history', `<ul>${branches.map(branch => `<li><a href="./reports/${encodeURIComponent(branch)}/index.html">${escapeHtml(branch)}</a></li>`).join('')}</ul>`));
  fs.writeFileSync(path.join(site, '.nojekyll'), '');
  return paths;
}

if (require.main === module) {
  try {
    const args = Object.fromEntries(Array.from({ length: (process.argv.length - 2) / 2 }, (_, index) => [process.argv[2 + index * 2], process.argv[3 + index * 2]]));
    if (args['--check-source']) validateSource(args['--check-source']);
    else console.log(JSON.stringify(publishReport({ sourceDir: args['--source'], siteDir: args['--site'], rawBranch: args['--branch'], runKey: args['--run-key'], runId: args['--run-id'], runAttempt: args['--run-attempt'], sha: args['--sha'], runUrl: args['--run-url'] })));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { publishReport, slugifyBranch, validateSource };
