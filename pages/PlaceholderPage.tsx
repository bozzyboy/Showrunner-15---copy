import React from 'react';

interface PlaceholderPageProps {
  title: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title }) => {
  return (
    <div>
      <h1 className="text-3xl font-black text-primary mb-4">{title}</h1>
      <div className="bg-surface border border-subtle rounded-xl p-12 text-center border-dashed">
        <p className="text-muted">The "{title}" module is under construction.</p>
        <p className="text-sm text-muted/70 mt-2">Check back in a future update for this feature!</p>
      </div>
    </div>
  );
};

export default PlaceholderPage;