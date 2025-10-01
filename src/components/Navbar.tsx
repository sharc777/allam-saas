import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Menu, X, BookOpen, Target, Trophy } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-elegant group-hover:shadow-glow transition-smooth">
              <Target className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              تحدي الـ30 يوم
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-foreground hover:text-primary transition-smooth font-medium">
              الرئيسية
            </Link>
            <Link to="/dashboard" className="text-foreground hover:text-primary transition-smooth font-medium">
              لوحة التحكم
            </Link>
            <Link to="/about" className="text-foreground hover:text-primary transition-smooth font-medium">
              عن التحدي
            </Link>
            <Button className="gradient-primary text-primary-foreground shadow-elegant hover:shadow-glow transition-smooth">
              ابدأ الآن
            </Button>
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
              to="/dashboard"
              className="block py-2 text-foreground hover:text-primary transition-smooth font-medium"
              onClick={() => setIsOpen(false)}
            >
              لوحة التحكم
            </Link>
            <Link
              to="/about"
              className="block py-2 text-foreground hover:text-primary transition-smooth font-medium"
              onClick={() => setIsOpen(false)}
            >
              عن التحدي
            </Link>
            <Button className="w-full gradient-primary text-primary-foreground">
              ابدأ الآن
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
