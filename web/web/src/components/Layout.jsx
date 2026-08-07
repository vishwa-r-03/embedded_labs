import Sidebar from './Sidebar';
import './Layout.css';

export default function Layout({ activeTrackId, children }) {
  return (
    <div className="layout">
      <Sidebar activeTrackId={activeTrackId} />
      <main className="layout-main">{children}</main>
    </div>
  );
}
