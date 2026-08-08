const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

const BUILD_SCRIPT = toPosixPath(path.join(__dirname, '..', 'build.sh'));
const COMPILE_TIMEOUT_MS = 10_000;
const BASH_PATH = resolveBashPath();

function toPosixPath(p) {
  return p.replace(/\\/g, '/');
}

// On Windows, the bare command "bash" can resolve to WSL's bash stub
// (C:\Windows\System32\bash.exe) instead of Git Bash, depending on what's on
// PATH and in what order. WSL's bash can't see Windows-style paths at all
// (it needs /mnt/c/... instead of C:/...), which silently breaks this even
// though the file genuinely exists. Git Bash, unlike WSL, understands
// Windows-style paths directly -- so we look for it explicitly by its known
// install locations rather than trusting whatever "bash" happens to resolve
// to on a given machine.
function resolveBashPath() {
  if (process.platform !== 'win32') return 'bash';

  const candidates = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  console.warn(
    'Warning: Git Bash not found at the usual install locations. Falling back to "bash" on PATH, ' +
    'which may resolve to WSL and fail on Windows-style paths. If compiles fail with ' +
    '"No such file or directory" despite the file existing, this is likely why.'
  );
  return 'bash';
}

app.post('/compile', (req, res) => {
  const { code } = req.body;
  if (typeof code !== 'string' || code.trim().length === 0) {
    return res.status(400).json({ error: 'Request body must include a non-empty "code" string.' });
  }

  const jobDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sketch-'));
  const inoPath = toPosixPath(path.join(jobDir, 'sketch.ino'));
  const hexPath = toPosixPath(path.join(jobDir, 'sketch.hex'));
  fs.writeFileSync(inoPath, code);

  execFile(
    BASH_PATH,
    [BUILD_SCRIPT, inoPath, hexPath],
    { timeout: COMPILE_TIMEOUT_MS },
    (err, stdout, stderr) => {
      if (err) {
        fs.rmSync(jobDir, { recursive: true, force: true });
        return res.status(200).json({ success: false, error: stderr || err.message });
      }
      const hex = fs.readFileSync(hexPath, 'utf8');
      fs.rmSync(jobDir, { recursive: true, force: true });
      res.status(200).json({ success: true, hex });
    }
  );
});

app.get('/health', (req, res) => res.json({ status: 'ok', bashPath: BASH_PATH }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Compile service listening on http://localhost:${PORT}`);
  console.log(`Using bash at: ${BASH_PATH}`);
});