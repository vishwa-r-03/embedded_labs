import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import CodeEditor from '../components/CodeEditor';
import CircuitSimulator from '../components/CircuitSimulator';
import { findTopic, getAllTopicsFlat } from '../data/curriculum';
import { getLessonContent } from '../data/lessons';
import { useProgress } from '../hooks/useProgress';
import { runFastForward } from '../lib/simulationEngine';
import { hexToProgram } from '../lib/intelHex';
import { arduinoPinToPort } from '../lib/pinMap';
import { COMPILE_SERVICE_URL } from '../config';
import './TopicPage.css';

const CHECK_WINDOW_MS = 4000; // how much simulated chip-time we fast-forward through to grade

export default function TopicPage() {
  const { trackId, topicId } = useParams();
  const topic = findTopic(trackId, topicId);
  const lesson = topic ? getLessonContent(trackId, topicId) : null;

  if (!topic) {
    return (
      <Layout activeTrackId={trackId}>
        <p>Topic not found.</p>
        <Link to="/">Return home</Link>
      </Layout>
    );
  }

  return (
    <Layout activeTrackId={trackId}>
      {lesson ? <Workspace topic={topic} lesson={lesson} /> : <ComingSoon topic={topic} />}
    </Layout>
  );
}

function ComingSoon({ topic }) {
  const { isComplete, markComplete, clearComplete } = useProgress();
  const done = isComplete(topic.id);
  return (
    <div className="topic-page">
      <Breadcrumb topic={topic} />
      <h1 className="topic-title">{topic.title}</h1>
      <p className="topic-focus">{topic.focus}</p>
      <div className="topic-placeholder">
        <p>Lesson content for this topic isn't authored yet -- coming soon.</p>
      </div>
      <div className="topic-actions">
        <button
          className={`topic-complete-btn ${done ? 'topic-complete-btn-done' : ''}`}
          onClick={() => (done ? clearComplete(topic.id) : markComplete(topic.id))}
        >
          {done ? '✓ Completed -- click to unmark' : 'Mark as complete'}
        </button>
      </div>
      <TopicNav topic={topic} />
    </div>
  );
}

function Workspace({ topic, lesson }) {
  const { isComplete, markComplete } = useProgress();
  const [code, setCode] = useState(lesson.starterCode);
  const [compiling, setCompiling] = useState(false);
  const [compileError, setCompileError] = useState(null);
  const [hex, setHex] = useState(null);
  const [checkResult, setCheckResult] = useState(null);

  // Reset the workspace whenever the learner navigates to a different topic.
  useEffect(() => {
    setCode(lesson.starterCode);
    setCompileError(null);
    setHex(null);
    setCheckResult(null);
  }, [lesson]);

  const done = isComplete(topic.id);

  async function handleCompile() {
    setCompiling(true);
    setCompileError(null);
    setCheckResult(null);
    setHex(null);

    try {
      const res = await fetch(`${COMPILE_SERVICE_URL}/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (!data.success) {
        setCompileError(data.error || 'Compilation failed.');
        setCompiling(false);
        return;
      }

      // Grade first (fast, headless), then hand the hex to the live visual simulator.
      if (lesson.circuit && lesson.check) {
        const { port, bit } = arduinoPinToPort(lesson.circuit.pin);
        const program = hexToProgram(data.hex);
        const events = runFastForward(program, CHECK_WINDOW_MS, [{ port, bit, label: lesson.circuit.label }]);
        const result = lesson.check(events);
        setCheckResult(result);
        if (result.pass) markComplete(topic.id);
      }

      setHex(data.hex);
    } catch (err) {
      setCompileError(`Couldn't reach the compile service. Is it running at ${COMPILE_SERVICE_URL}?\n\n(${err.message})`);
    } finally {
      setCompiling(false);
    }
  }

  return (
    <div className="workspace">
      <div className="workspace-left">
        <Breadcrumb topic={topic} />
        <h1 className="topic-title">{topic.title}</h1>

        <section className="workspace-section">
          <h2 className="workspace-section-title">Theory</h2>
          <p className="workspace-text">{lesson.theory}</p>
        </section>

        <section className="workspace-section">
          <h2 className="workspace-section-title">Problem Statement</h2>
          <p className="workspace-text">{lesson.problemStatement}</p>
        </section>

        {done && <div className="workspace-done-badge">✓ Completed</div>}

        <TopicNav topic={topic} />
      </div>

      <div className="workspace-right">
        <div className="workspace-editor-panel">
          <div className="workspace-panel-header">
            <span>sketch.ino</span>
            <button className="btn btn-primary workspace-compile-btn" onClick={handleCompile} disabled={compiling}>
              {compiling ? 'Compiling…' : 'Compile & Run'}
            </button>
          </div>
          <CodeEditor value={code} onChange={setCode} />
        </div>

        {compileError && (
          <div className="workspace-output workspace-output-error">
            <div className="workspace-output-label">Compiler output</div>
            <pre>{compileError}</pre>
          </div>
        )}

        {checkResult && (
          <div className={`workspace-output ${checkResult.pass ? 'workspace-output-pass' : 'workspace-output-fail'}`}>
            <div className="workspace-output-label">{checkResult.pass ? 'Passed' : 'Not quite'}</div>
            <p>{checkResult.message}</p>
          </div>
        )}

        <div className="workspace-circuit-panel">
          <div className="workspace-panel-header">
            <span>Circuit</span>
          </div>
          <CircuitSimulator hex={hex} circuit={lesson.circuit} />
        </div>
      </div>
    </div>
  );
}

function Breadcrumb({ topic }) {
  return (
    <div className="topic-breadcrumb">
      {topic.trackName} / {topic.moduleName}
    </div>
  );
}

function TopicNav({ topic }) {
  const flat = getAllTopicsFlat();
  const currentIndex = flat.findIndex((t) => t.trackId === topic.trackId && t.id === topic.id);
  const prevTopic = currentIndex > 0 ? flat[currentIndex - 1] : null;
  const nextTopic = currentIndex < flat.length - 1 ? flat[currentIndex + 1] : null;

  return (
    <div className="topic-nav">
      {prevTopic ? (
        <Link className="topic-nav-link" to={`/track/${prevTopic.trackId}/topic/${prevTopic.id}`}>
          ← {prevTopic.title}
        </Link>
      ) : (
        <span />
      )}
      {nextTopic ? (
        <Link className="topic-nav-link topic-nav-link-next" to={`/track/${nextTopic.trackId}/topic/${nextTopic.id}`}>
          {nextTopic.title} →
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}