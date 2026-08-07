import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import TopicPage from './pages/TopicPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/track/:trackId/topic/:topicId" element={<TopicPage />} />
      </Routes>
    </BrowserRouter>
  );
}
