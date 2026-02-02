import React, { useEffect, useRef } from 'react';

interface SummernoteEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

declare global {
  interface Window {
    $: any;
    jQuery: any;
  }
}

const SummernoteEditor: React.FC<SummernoteEditorProps> = ({ value, onChange, placeholder }) => {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (editorRef.current && window.$) {
      const $editor = window.$(editorRef.current);
      
      $editor.summernote({
        placeholder: placeholder || 'Enter description...',
        tabsize: 2,
        height: 120,
        toolbar: [
          ['style', ['style']],
          ['font', ['bold', 'underline', 'clear']],
          ['color', ['color']],
          ['para', ['ul', 'ol', 'paragraph']],
          ['table', ['table']],
          ['insert', ['link', 'picture', 'video']],
          ['view', ['fullscreen', 'codeview', 'help']]
        ],
        callbacks: {
          onChange: (contents: string) => {
            onChangeRef.current(contents);
          }
        }
      });

      // Set initial value
      $editor.summernote('code', value);

      return () => {
        $editor.summernote('destroy');
      };
    }
  }, []);

  // Update summernote when value changes from outside (optional, be careful with loops)
  useEffect(() => {
    if (editorRef.current && window.$) {
      const $editor = window.$(editorRef.current);
      if ($editor.summernote('code') !== value) {
        $editor.summernote('code', value);
      }
    }
  }, [value]);

  return (
    <div className="summernote-editor">
      <textarea ref={editorRef} />
    </div>
  );
};

export default SummernoteEditor;
