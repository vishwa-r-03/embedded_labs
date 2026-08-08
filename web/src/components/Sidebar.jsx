import { NavLink, Link } from 'react-router-dom';
import { tracks } from '../data/curriculum';
import { useProgress } from '../hooks/useProgress';
import './Sidebar.css';

export default function Sidebar({ activeTrackId }) {
  const { isComplete } = useProgress();
  const track = tracks.find((t) => t.id === activeTrackId) ?? tracks[0];

  return (
    <nav className="sidebar" aria-label="Curriculum topics">
      <Link to="/" className="sidebar-home-link">
        ← Home
      </Link>

      <div className="sidebar-track-switch">
        {tracks.map((t) => (
          <NavLink
            key={t.id}
            to={`/track/${t.id}/topic/${t.modules[0].topics[0].id}`}
            className={() =>
              `sidebar-track-tab ${t.id === track.id ? 'sidebar-track-tab-active' : ''}`
            }
          >
            {t.name}
          </NavLink>
        ))}
      </div>

      <div className="sidebar-modules">
        {track.modules.map((mod) => (
          <div key={mod.id} className="sidebar-module">
            <h3 className="sidebar-module-name">{mod.name}</h3>
            <ul className="sidebar-topic-list">
              {mod.topics.map((topic) => (
                <li key={topic.id}>
                  <NavLink
                    to={`/track/${track.id}/topic/${topic.id}`}
                    className={({ isActive }) =>
                      `sidebar-topic-link ${isActive ? 'sidebar-topic-link-active' : ''}`
                    }
                  >
                    <span className={`sidebar-topic-check ${isComplete(topic.id) ? 'sidebar-topic-check-done' : ''}`}>
                      {isComplete(topic.id) ? '✓' : ''}
                    </span>
                    <span className="sidebar-topic-title">{topic.title}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
