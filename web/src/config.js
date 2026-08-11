// Compile service URL. Reads from a Vite environment variable
// (VITE_COMPILE_SERVICE_URL) at build time, falling back to localhost for
// local development so nothing needs to change to work in both places.
//
// To point a production build at a deployed backend, create a file named
// .env.production in web/ containing:
//   VITE_COMPILE_SERVICE_URL=https://your-backend.onrender.com
// then run `npm run build` -- Vite bakes the value in at build time.
export const COMPILE_SERVICE_URL = import.meta.env.VITE_COMPILE_SERVICE_URL || 'http://localhost:4000';