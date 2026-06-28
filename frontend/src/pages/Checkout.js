import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Checkout is no longer a separate page.
// All order placement happens directly in the Cart page.
// This component simply redirects anyone who lands here.
const Checkout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/cart', { replace: true });
  }, [navigate]);

  return null;
};

export default Checkout;