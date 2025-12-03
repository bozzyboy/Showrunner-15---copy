import React from 'react';

interface JsonViewerProps {
  data: object;
}

const JsonViewer: React.FC<JsonViewerProps> = ({ data }) => {
  if (!data) {
    return null;
  }

  return (
    <pre className="bg-neutral-900/50 p-4 rounded-lg text-xs text-primary-text whitespace-pre-wrap border border-subtle">
      <code>{JSON.stringify(data, null, 2)}</code>
    </pre>
  );
};

export default JsonViewer;
