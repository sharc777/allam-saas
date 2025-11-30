import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Menu, X, GraduationCap, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NotificationCenter } from "@/components/NotificationCenter";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut, user } = useAuth(false);

  const { data: isAdmin } = useQuery({
    queryKey: ['is-admin', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase.rpc('is_admin', {
        user_id: user.id
      });
      if (error) throw error;
      return data;
    }
  });

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-elegant group-hover:shadow-glow transition-smooth">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              دربني
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <NotificationCenter />
            <Link to="/" className="text-foreground hover:text-primary transition-smooth font-medium">
              الرئيسية
            </Link>
            <Link to="/stats" className="text-foreground hover:text-primary transition-smooth font-medium">
              الإحصائيات
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" className="text-foreground hover:text-primary transition-smooth font-medium">
                  لوحة التحكم
                </Link>
                <Link to="/exercise-history" className="text-foreground hover:text-primary transition-smooth font-medium">
                  سجل التمارين
                </Link>
                <Link to="/weakness-analysis" className="text-foreground hover:text-primary transition-smooth font-medium">
                  نقاط القوة والضعف
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="text-foreground hover:text-primary transition-smooth font-medium">
                    الإدارة
                  </Link>
                )}
                <Button variant="outline" onClick={signOut}>
                  <LogOut className="ml-2 h-4 w-4" />
                  تسجيل خروج
                </Button>
              </>
            ) : (
              <Button className="gradient-primary text-primary-foreground shadow-elegant hover:shadow-glow transition-smooth" asChild>
                <Link to="/auth">تسجيل الدخول</Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-3">
            <Link
              to="/"
              className="block py-2 text-foreground hover:text-primary transition-smooth font-medium"
              onClick={() => setIsOpen(false)}
            >
              الرئيسية
            </Link>
            <Link
              to="/stats"
              className="block py-2 text-foreground hover:text-primary transition-smooth font-medium"
              onClick={() => setIsOpen(false)}
            >
              الإحصائيات
            </Link>
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="block py-2 text-foreground hover:text-primary transition-smooth font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  لوحة التحكم
                </Link>
                <Link
                  to="/exercise-history"
                  className="block py-2 text-foreground hover:text-primary transition-smooth font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  سجل التمارين
                </Link>
                <Link
                  to="/weakness-analysis"
                  className="block py-2 text-foreground hover:text-primary transition-smooth font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  نقاط القوة والضعف
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="block py-2 text-foreground hover:text-primary transition-smooth font-medium"
                    onClick={() => setIsOpen(false)}
                  >
                    الإدارة
                  </Link>
                )}
                <Button className="w-full" variant="outline" onClick={signOut}>
                  <LogOut className="ml-2 h-4 w-4" />
                  تسجيل خروج
                </Button>
              </>
            ) : (
              <Button className="w-full gradient-primary text-primary-foreground" asChild>
                <Link to="/auth">تسجيل الدخول</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
