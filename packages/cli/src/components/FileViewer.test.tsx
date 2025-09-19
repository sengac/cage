import React from 'react';
import { render } from 'ink-testing-library';
import { FileViewer } from './FileViewer';

describe('FileViewer', () => {
  describe('Basic Rendering', () => {
    it('should render file content', () => {
      const content = 'function test() {\n  return true;\n}';
      const { lastFrame } = render(<FileViewer content={content} />);

      expect(lastFrame()).toContain('function test()');
      expect(lastFrame()).toContain('return true;');
    });

    it('should display filename when provided', () => {
      const content = 'const x = 1;';
      const { lastFrame } = render(<FileViewer content={content} filename="test.js" />);

      expect(lastFrame()).toContain('test.js');
      expect(lastFrame()).toContain('const x = 1;');
    });

    it('should show line numbers by default', () => {
      const content = 'line 1\nline 2\nline 3';
      const { lastFrame } = render(<FileViewer content={content} />);

      expect(lastFrame()).toContain('1');
      expect(lastFrame()).toContain('2');
      expect(lastFrame()).toContain('3');
      expect(lastFrame()).toContain('line 1');
      expect(lastFrame()).toContain('line 2');
      expect(lastFrame()).toContain('line 3');
    });

    it('should hide line numbers when disabled', () => {
      const content = 'test line';
      const { lastFrame } = render(<FileViewer content={content} showLineNumbers={false} />);

      const frame = lastFrame();
      expect(frame).toContain('test line');
      expect(frame).not.toMatch(/^\s*1\s/);
    });

    it('should handle empty content', () => {
      const { lastFrame } = render(<FileViewer content="" />);

      expect(lastFrame()).toContain('Empty file');
    });

    it('should handle null and undefined content', () => {
      const { lastFrame: frame1 } = render(<FileViewer content={null as any} />);
      const { lastFrame: frame2 } = render(<FileViewer content={undefined as any} />);

      expect(frame1()).toContain('No content');
      expect(frame2()).toContain('No content');
    });

    it('should handle single line files', () => {
      const content = 'single line content';
      const { lastFrame } = render(<FileViewer content={content} />);

      expect(lastFrame()).toContain('single line content');
    });

    it('should handle large files', () => {
      const lines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`);
      const content = lines.join('\n');
      const { lastFrame } = render(<FileViewer content={content} />);

      expect(lastFrame()).toContain('line 1');
      expect(lastFrame()).toContain('line 100');
    });
  });

  describe('Syntax Highlighting', () => {
    it('should apply syntax highlighting when enabled', () => {
      const content = 'const x = 1;\nfunction test() { return x; }';
      const { lastFrame } = render(<FileViewer content={content} syntax={true} />);

      expect(lastFrame()).toContain('const');
      expect(lastFrame()).toContain('function');
      expect(lastFrame()).toContain('return');
    });

    it('should auto-detect language from filename', () => {
      const content = 'def test():\n    return True';
      const { lastFrame } = render(<FileViewer content={content} filename="test.py" syntax={true} />);

      expect(lastFrame()).toContain('def');
      expect(lastFrame()).toContain('return');
      expect(lastFrame()).toContain('True');
    });

    it('should use explicit language setting', () => {
      const content = 'function test() {}';
      const { lastFrame } = render(<FileViewer content={content} language="javascript" syntax={true} />);

      expect(lastFrame()).toContain('function');
      expect(lastFrame()).toContain('test');
    });

    it('should work without syntax highlighting', () => {
      const content = 'const x = 1;';
      const { lastFrame } = render(<FileViewer content={content} syntax={false} />);

      expect(lastFrame()).toContain('const x = 1;');
    });

    it('should support different themes', () => {
      const content = 'const x = 1;';
      const { lastFrame: dark } = render(<FileViewer content={content} syntax={true} theme="dark" />);
      const { lastFrame: light } = render(<FileViewer content={content} syntax={true} theme="light" />);

      expect(dark()).toContain('const x = 1;');
      expect(light()).toContain('const x = 1;');
    });
  });

  describe('Line Highlighting', () => {
    it('should highlight specific lines', () => {
      const content = 'line 1\nline 2\nline 3';
      const { lastFrame } = render(<FileViewer content={content} highlightLines={[2]} />);

      expect(lastFrame()).toContain('line 1');
      expect(lastFrame()).toContain('line 2');
      expect(lastFrame()).toContain('line 3');
    });

    it('should highlight multiple lines', () => {
      const content = 'line 1\nline 2\nline 3\nline 4';
      const { lastFrame } = render(<FileViewer content={content} highlightLines={[1, 3]} />);

      expect(lastFrame()).toContain('line 1');
      expect(lastFrame()).toContain('line 2');
      expect(lastFrame()).toContain('line 3');
      expect(lastFrame()).toContain('line 4');
    });

    it('should highlight line ranges', () => {
      const content = 'line 1\nline 2\nline 3\nline 4\nline 5';
      const { lastFrame } = render(<FileViewer content={content} highlightRange={{ start: 2, end: 4 }} />);

      expect(lastFrame()).toContain('line 1');
      expect(lastFrame()).toContain('line 2');
      expect(lastFrame()).toContain('line 3');
      expect(lastFrame()).toContain('line 4');
      expect(lastFrame()).toContain('line 5');
    });

    it('should highlight current line', () => {
      const content = 'line 1\nline 2\nline 3';
      const { lastFrame } = render(<FileViewer content={content} currentLine={2} />);

      expect(lastFrame()).toContain('line 1');
      expect(lastFrame()).toContain('line 2');
      expect(lastFrame()).toContain('line 3');
    });

    it('should show cursor indicator', () => {
      const content = 'line 1\nline 2\nline 3';
      const { lastFrame } = render(<FileViewer content={content} currentLine={2} showCursor={true} />);

      expect(lastFrame()).toContain('line 2');
      expect(lastFrame()).toContain('>');
    });
  });

  describe('Search Functionality', () => {
    it('should highlight search matches', () => {
      const content = 'function test() {\n  const test = 1;\n  return test;\n}';
      const { lastFrame } = render(<FileViewer content={content} searchTerm="test" />);

      expect(lastFrame()).toContain('function');
      expect(lastFrame()).toContain('test');
      expect(lastFrame()).toContain('const');
      expect(lastFrame()).toContain('return');
    });

    it('should show match count', () => {
      const content = 'test one\ntest two\ntest three';
      const { lastFrame } = render(<FileViewer content={content} searchTerm="test" showMatchCount={true} />);

      expect(lastFrame()).toContain('test one');
      expect(lastFrame()).toContain('test two');
      expect(lastFrame()).toContain('test three');
      expect(lastFrame()).toContain('3 matches');
    });

    it('should highlight current match', () => {
      const content = 'test one\ntest two\ntest three';
      const { lastFrame } = render(<FileViewer content={content} searchTerm="test" currentMatch={2} />);

      expect(lastFrame()).toContain('test one');
      expect(lastFrame()).toContain('test two');
      expect(lastFrame()).toContain('test three');
    });

    it('should handle case-insensitive search', () => {
      const content = 'Test ONE\ntest TWO\nTEST three';
      const { lastFrame } = render(<FileViewer content={content} searchTerm="test" caseInsensitive={true} />);

      expect(lastFrame()).toContain('Test ONE');
      expect(lastFrame()).toContain('test TWO');
      expect(lastFrame()).toContain('TEST three');
    });

    it('should handle regex search', () => {
      const content = 'function test() {}\nconst test = 1;\ntest.call()';
      const { lastFrame } = render(<FileViewer content={content} searchTerm="test\\(" regex={true} />);

      expect(lastFrame()).toContain('function test()');
      expect(lastFrame()).toContain('const test = 1');
      expect(lastFrame()).toContain('test.call()');
    });
  });

  describe('Navigation', () => {
    it('should show scrollbar for long files', () => {
      const lines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`);
      const content = lines.join('\n');
      const { lastFrame } = render(<FileViewer content={content} showScrollbar={true} height={10} />);

      expect(lastFrame()).toContain('line 1');
    });

    it('should handle viewport navigation', () => {
      const lines = Array.from({ length: 50 }, (_, i) => `line ${i + 1}`);
      const content = lines.join('\n');
      const { lastFrame } = render(<FileViewer content={content} viewportStart={10} viewportSize={5} />);

      expect(lastFrame()).toContain('line 11');
      expect(lastFrame()).toContain('line 12');
      expect(lastFrame()).toContain('line 13');
      expect(lastFrame()).toContain('line 14');
      expect(lastFrame()).toContain('line 15');
    });

    it('should show navigation hints', () => {
      const content = 'test content';
      const { lastFrame } = render(<FileViewer content={content} showNavigationHints={true} />);

      expect(lastFrame()).toContain('test content');
    });

    it('should indicate truncated content', () => {
      const lines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`);
      const content = lines.join('\n');
      const { lastFrame } = render(<FileViewer content={content} maxLines={10} />);

      expect(lastFrame()).toContain('line 1');
      expect(lastFrame()).toContain('... 90 more lines');
    });

    it('should support jump to line', () => {
      const lines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`);
      const content = lines.join('\n');
      const { lastFrame } = render(<FileViewer content={content} jumpToLine={50} viewportSize={5} />);

      expect(lastFrame()).toContain('line 50');
    });
  });

  describe('File Metadata', () => {
    it('should display file path', () => {
      const content = 'test content';
      const { lastFrame } = render(<FileViewer content={content} filepath="/path/to/file.js" />);

      expect(lastFrame()).toContain('/path/to/file.js');
      expect(lastFrame()).toContain('test content');
    });

    it('should display file size', () => {
      const content = 'test content';
      const { lastFrame } = render(<FileViewer content={content} showFileSize={true} />);

      expect(lastFrame()).toContain('test content');
      expect(lastFrame()).toContain('bytes');
    });

    it('should display line count', () => {
      const content = 'line 1\nline 2\nline 3';
      const { lastFrame } = render(<FileViewer content={content} showLineCount={true} />);

      expect(lastFrame()).toContain('3 lines');
      expect(lastFrame()).toContain('line 1');
    });

    it('should display encoding', () => {
      const content = 'test content';
      const { lastFrame } = render(<FileViewer content={content} encoding="UTF-8" showEncoding={true} />);

      expect(lastFrame()).toContain('UTF-8');
      expect(lastFrame()).toContain('test content');
    });

    it('should display modified indicator', () => {
      const content = 'test content';
      const { lastFrame } = render(<FileViewer content={content} modified={true} />);

      expect(lastFrame()).toContain('test content');
      expect(lastFrame()).toContain('Modified');
    });
  });

  describe('Interactive Features', () => {
    it('should support line selection', () => {
      const content = 'line 1\nline 2\nline 3';
      const onLineSelect = vi.fn();
      const { lastFrame } = render(<FileViewer content={content} onLineSelect={onLineSelect} />);

      expect(lastFrame()).toContain('line 1');
      expect(lastFrame()).toContain('line 2');
      expect(lastFrame()).toContain('line 3');
    });

    it('should support copy functionality', () => {
      const content = 'test content';
      const onCopy = vi.fn();
      const { lastFrame } = render(<FileViewer content={content} onCopy={onCopy} showCopyButton={true} />);

      expect(lastFrame()).toContain('test content');
      expect(lastFrame()).toContain('Copy');
    });

    it('should support line folding', () => {
      const content = 'function test() {\n  const x = 1;\n  return x;\n}';
      const { lastFrame } = render(<FileViewer content={content} foldable={true} />);

      expect(lastFrame()).toContain('function test()');
      expect(lastFrame()).toContain('return x;');
    });

    it('should show fold indicators', () => {
      const content = 'function test() {\n  return true;\n}';
      const { lastFrame } = render(<FileViewer content={content} foldable={true} showFoldIndicators={true} />);

      expect(lastFrame()).toContain('function test()');
      expect(lastFrame()).toContain('▼');
    });

    it('should support minimap', () => {
      const lines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`);
      const content = lines.join('\n');
      const { lastFrame } = render(<FileViewer content={content} showMinimap={true} />);

      expect(lastFrame()).toContain('line 1');
    });
  });

  describe('Special Content Types', () => {
    it('should handle JSON files', () => {
      const content = '{\n  "name": "test",\n  "value": 123\n}';
      const { lastFrame } = render(<FileViewer content={content} filename="data.json" />);

      expect(lastFrame()).toContain('"name"');
      expect(lastFrame()).toContain('"test"');
      expect(lastFrame()).toContain('123');
    });

    it('should handle markdown files', () => {
      const content = '# Header\n\nParagraph text\n\n- List item';
      const { lastFrame } = render(<FileViewer content={content} filename="README.md" />);

      expect(lastFrame()).toContain('# Header');
      expect(lastFrame()).toContain('Paragraph text');
      expect(lastFrame()).toContain('- List item');
    });

    it('should handle binary file indication', () => {
      const { lastFrame } = render(<FileViewer content="" filename="image.png" binary={true} />);

      expect(lastFrame()).toContain('Binary file');
      expect(lastFrame()).toContain('image.png');
    });

    it('should handle very long lines', () => {
      const content = 'a'.repeat(500);
      const { lastFrame } = render(<FileViewer content={content} wrapLines={false} />);

      expect(lastFrame()).toContain('a');
    });

    it('should wrap long lines when enabled', () => {
      const content = 'a'.repeat(500);
      const { lastFrame } = render(<FileViewer content={content} wrapLines={true} maxWidth={80} />);

      expect(lastFrame()).toContain('a');
    });
  });

  describe('Performance', () => {
    it('should handle files with many syntax tokens', () => {
      const content = `
        function complex() {
          const numbers = [1, 2, 3, 4, 5];
          const strings = ["hello", "world"];
          // Comment here
          return numbers.map(n => n * 2);
        }
      `;
      const { lastFrame } = render(<FileViewer content={content} syntax={true} />);

      expect(lastFrame()).toContain('function');
      expect(lastFrame()).toContain('const');
      expect(lastFrame()).toContain('return');
    });

    it('should virtualize very large files', () => {
      const lines = Array.from({ length: 10000 }, (_, i) => `line ${i + 1}`);
      const content = lines.join('\n');
      const { lastFrame } = render(<FileViewer content={content} virtualize={true} viewportSize={50} />);

      expect(lastFrame()).toContain('line 1');
    });

    it('should handle unicode content', () => {
      const content = '🚀 const emoji = "😀";\n// 中文注释\nconst text = "Hello 世界";';
      const { lastFrame } = render(<FileViewer content={content} />);

      expect(lastFrame()).toContain('🚀');
      expect(lastFrame()).toContain('😀');
      expect(lastFrame()).toContain('中文注释');
      expect(lastFrame()).toContain('世界');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed content gracefully', () => {
      const content = '\x00\x01\x02Invalid content';
      const { lastFrame } = render(<FileViewer content={content} />);

      expect(lastFrame()).toContain('Invalid content');
    });

    it('should indicate read errors', () => {
      const { lastFrame } = render(<FileViewer content="" error="Permission denied" />);

      expect(lastFrame()).toContain('Error');
      expect(lastFrame()).toContain('Permission denied');
    });

    it('should handle empty lines correctly', () => {
      const content = 'line 1\n\n\nline 4';
      const { lastFrame } = render(<FileViewer content={content} />);

      expect(lastFrame()).toContain('line 1');
      expect(lastFrame()).toContain('line 4');
      expect(lastFrame()).toContain('2');
      expect(lastFrame()).toContain('3');
    });
  });
});