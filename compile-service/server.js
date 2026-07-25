const express = require('express');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const app = express();
app.use(express.json({ limit: '256kb' })); // sketches are small; cap request size defensively

const BUILD_SCRIPT = path.join(__dirname, '..', 'build.sh');
const COMPILE_TIMEOUT_MS = 10_000; // hard cap so one bad build can't hang a worker

app.post('/compile', (req, res) => {
  const { code } = req.body;
  if (typeof code !== 'string' || code.trim().length === 0) {
    return res.status(400).json({ error: 'Request body must include a non-empty "code" string.' });
  }

  // Each compile gets its own throwaway temp directory so concurrent requests never collide
  const jobDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sketch-'));
  const inoPath = path.join(jobDir, 'sketch.ino');
  const hexPath = path.join(jobDir, 'sketch.hex');
  fs.writeFileSync(inoPath, code);

  execFile(
    'bash',
    [BUILD_SCRIPT, inoPath, hexPath],
    { timeout: COMPILE_TIMEOUT_MS },
    (err, stdout, stderr) => {
      if (err) {
        // Compiler errors (bad code) and infra errors (timeout, crash) both land here.
        // We return them as plain text -- this is what a "your code has an error" message
        // in the editor UI will eventually be built from.
        fs.rmSync(jobDir, { recursive: true, force: true });
        return res.status(200).json({
          success: false,
          error: stderr || err.message,
        });
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