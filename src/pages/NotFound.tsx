import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <img src="/logo.png" alt="Survivors Ready" className="h-24 w-auto mb-6" />
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold text-foreground">Lost on the Island</h1>
        <p className="text-lg text-muted-foreground">This page has been voted out. The tribe has spoken.</p>
        <Link to="/" className="inline-block text-primary hover:text-accent underline underline-offset-4 transition-colors">
          Return to Camp
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
