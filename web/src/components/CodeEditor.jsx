import Editor from '@monaco-editor/react';

function handleBeforeMount(monaco) {
  monaco.editor.defineTheme('embedded-labs-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '7c8888', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c68958' },
      { token: 'number', foreground: '7fd9a6' },
      { token: 'string', foreground: '7fd9a6' },
    ],
    colors: {
      'editor.background': '#1a2226',
      'editor.foreground': '#edefef',
      'editor.lineHighlightBackground': '#212b30',
      'editorLineNumber.foreground': '#3a464b',
      'editorLineNumber.activeForeground': '#c68958',
      'editorCursor.foreground': '#e0a877',
      'editor.selectionBackground': '#2a3438',
    },
  });
}

export default function CodeEditor({ value, onChange, height = '360px' }) {
  return (
    <Editor
      height={height}
      language="cpp"
      theme="embedded-labs-dark"
      value={value}
      onChange={(v) => onChange(v ?? '')}
      beforeMount={handleBeforeMount}
      options={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 13.5,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        padding: { top: 16 },
      }}
    />
  );
}
