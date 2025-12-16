import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Subscription = () => {
  const navigate = useNavigate();
  
  // إعادة توجيه تلقائي للوحة التحكم - الباقات مخفية حالياً
  useEffect(() => {
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  return null;
};

export default Subscription;