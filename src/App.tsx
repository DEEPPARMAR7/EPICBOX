import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './hooks/use-theme';
import { Toaster } from './components/ui/toaster';
import LoadingPage from './components/LoadingPage';
import routes from './routes';

function AppContent() {
  const { initializing } = useAuth();

  if (initializing) {
    return <LoadingPage />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">
        <Routes>
          {routes.map((route, index) => (
            <Route
              key={index}
              path={route.path}
              element={route.element}
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
