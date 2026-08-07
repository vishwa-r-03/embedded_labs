import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { findTopic, getAllTopicsFlat } from '../data/curriculum';
import { useProgress } from '../hooks/useProgress';
import './TopicPage.css';

export default function TopicPage() {
  const { trackId, topicId } = useParams();
  const topic = findTopic(trackId, topicId);
  const { isComplete, markComplete, clearComplete } = useProgress();

  if (!topic) {
    return (
      <Layout activeTrackId={trackId}>
        <p>Topic not found.</p>
        <Link to="/">Return home</Link>
      </Layout>
    );
  }

  const flat = getAllTopicsFlat();
  const currentIndex = flat.findIndex((t) => t.trackId === trackId && t.id === topicId);
  const prevTopic = currentIndex > 0 ? flat[currentIndex - 1] : null;
  const nextTopic = currentIndex < flat.length - 1 ? flat[currentIndex + 1] : null;
  const done = isComplete(topic.id);

  return (
    <Layout activeTrackId={trackId}>
      <div className="topic-page">
        <div className="topic-breadcrumb">
          {topic.trackName} / {topic.moduleName}
        </div>
        <h1 className="topic-title">{topic.title}</h1>
        <p className="topic-focus">{topic.focus}</p>

        <div className="topic-placeholder">
          <p>
            Lesson content (theory, code editor, and live circuit simulation) isn't built yet --
            this page is wired up for navigation and progress tracking so the rest of the site can
            be tested end-to-end while lesson content comes online topic by topic.
          </p>
        </div>

        <div className="topic-actions">
          <button
            className={`topic-complete-btn ${done ? 'topic-complete-btn-done' : ''}`}
            onClick={() => (done ? clearComplete(topic.id) : markComplete(topic.id))}
          >
            {done ? '✓ Completed -- click to unmark' : 'Mark as complete'}
          </button>
        </div>

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
      </div>
    </Layout>
  );
}
