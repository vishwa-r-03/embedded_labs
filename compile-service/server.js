const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const app = express();
app.use(cors()); // the web app runs on a different port (Vite dev server) -- needs cross-origin access
app.use(express.json({ limit: '256kb' }));

const BUILD_SCRIPT = toPosixPath(path.join(__dirname, '..', 'build.sh'));
const COMPILE_TIMEOUT_MS = 10_000;

// On Windows, paths use backslashes. When handed to `bash` (Git Bash/WSL), an extra
// layer of shell parsing treats backslash as an escape character and strips it,
// corrupting the path. Forward slashes work correctly in both bash and native
// Windows path resolution.
function toPosixPath(p) {
  return p.replace(/\\/g, '/');
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
    'bash',
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

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Compile service listening on http://localhost:${PORT}`);
});
