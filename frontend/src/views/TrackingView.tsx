import React from 'react';
import { useNavigate } from 'react-router-dom';
import TrackingModal from '../components/TrackingModal';

export const TrackingView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[85vh] bg-gray-50 flex items-center justify-center p-4">
      <TrackingModal onClose={() => navigate('/')} />
    </div>
  );
};
