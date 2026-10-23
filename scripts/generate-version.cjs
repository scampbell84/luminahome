/**
 * Automated Version & Build Info Generator for Lumina Home
 * Runs automatically before every production build and dev startup
 * Generates version.json with version, build number, timestamp, git info, and release notes.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getGitInfo() {
  try {
    const isGit = fs.existsSync(path.resolve(__dirname, '..', '.git'));
    if (!isGit) {
      return { commit: 'latest', branch: 'main' };
    }
    const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    return { commit, branch };
  } catch {
    return { commit: 'latest', branch: 'main' };
  }
}

function extractReleaseNotes() {
  try {
    const versionTsPath = path.resolve(__dirname, '..', 'src', 'constants', 'version.ts');
    if (fs.existsSync(versionTsPath)) {
      const content = fs.readFileSync(versionTsPath, 'utf-8');
      
      // Parse RELEASE_NOTES array using regex/eval or structure
      const notesMatch = content.match(/export const RELEASE_NOTES:\s*ReleaseNote\[\]\s*=\s*(\[[\s\S]*?\]);\s*\n\s*export/);
      if (notesMatch && notesMatch[1]) {
        // Strip TS comments and parse loosely
        const jsonLike = notesMatch[1]
          .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1')
          .replace(/,\s*([\]}])/g, '$1');
        
        // Use a safe Function constructor to parse the JS array object
        const parsed = new Function(`return ${jsonLike};`)();
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('[Version Generator] Note extraction warning:', err.message);
  }

  return [
    {
      version: 'v3.1.0',
      releaseDate: 'October 2026',
      title: 'Resilient Multi-iCal Sync & Enhanced Weather Legibility',
      isCurrent: true,
      highlights: [
        'Fault-tolerant iCloud & iCal sync with automatic retry backoff and rate-limit defense',
        'Persistent disk & memory caching (stale-while-revalidate) preventing blank schedule displays',
        'Staggered feed pacing to eliminate Apple CalDAV morning peak 503 throttling',
        'Enlarged high-contrast temperature and precipitation indicators on weather trend graphs',
        'Circadian Smart Briefing fused with both local touch events and cached external iCal feeds',
      ],
      details: [
        'iCloud & CalDAV Fault Tolerance: Implemented automatic exponential backoff with jitter and Retry-After header compliance for Apple CalDAV edge clusters, defending against high-volume morning 503 rate limits.',
        'Persistent Stale-While-Revalidate Caching: Added persistent storage (~/.luminahome/calendar_cache.json) and memory caching so wall displays seamlessly retain and serve family schedules even during upstream cloud outages.',
        'Staggered Multi-Feed Pacing: Automatically staggers requests across multiple calendar feeds with polite 350-500ms pacing, preventing burst firewall flags on Apple servers.',
        'Weather Graph Legibility: Redesigned the temperature and precipitation complication indicators on the right side of the 24-hour weather trend graphs with enlarged typography and high-contrast pill styling for effortless readability from across the room.',
        'Briefing Schedule Fusion: Unified the daily smart circadian briefing engine to aggregate both direct kiosk touch events and cached external iCal subscriptions for accurate morning and evening summaries.',
      ],
    },
  ];
}

function generateVersion() {
  const rootDir = path.resolve(__dirname, '..');
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const version = pkg.version || '3.1.0';

  const gitInfo = getGitInfo();

  // Load previous build number if version.json exists
  let buildNumber = 1;
  const existingVersionFile = path.join(rootDir, 'version.json');
  if (fs.existsSync(existingVersionFile)) {
    try {
      const prev = JSON.parse(fs.readFileSync(existingVersionFile, 'utf-8'));
      if (typeof prev.buildNumber === 'number') {
        buildNumber = prev.buildNumber + 1;
      }
    } catch {}
  }

  const buildTime = new Date().toISOString();
  const buildDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const releaseNotes = extractReleaseNotes();

  const versionData = {
    appName: 'Lumina Home',
    version,
    versionTag: `v${version}`,
    buildNumber,
    buildTime,
    buildDate,
    gitCommit: gitInfo.commit,
    gitBranch: gitInfo.branch,
    nodeVersion: process.version,
    releaseDate: 'October 2026',
    currentRelease: releaseNotes[0] || null,
    releaseNotes,
  };

  const jsonString = JSON.stringify(versionData, null, 2);

  // 1. Root /version.json
  fs.writeFileSync(path.join(rootDir, 'version.json'), jsonString, 'utf-8');

  // 2. /public/version.json (for static fetch in dev & prod)
  const publicDir = path.join(rootDir, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  fs.writeFileSync(path.join(publicDir, 'version.json'), jsonString, 'utf-8');

  // 3. /src/constants/version.json (for direct TS import if needed)
  const constantsDir = path.join(rootDir, 'src', 'constants');
  if (!fs.existsSync(constantsDir)) {
    fs.mkdirSync(constantsDir, { recursive: true });
  }
  fs.writeFileSync(path.join(constantsDir, 'version.json'), jsonString, 'utf-8');

  console.log(`[Version Generator] ✅ Successfully generated version.json (v${version}, build #${buildNumber}) at ${buildTime}`);
}

generateVersion();
