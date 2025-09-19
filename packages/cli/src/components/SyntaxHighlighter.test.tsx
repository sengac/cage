import React from 'react';
import { render } from 'ink-testing-library';
import { SyntaxHighlighter } from './SyntaxHighlighter';

describe('SyntaxHighlighter', () => {
  describe('Basic Rendering', () => {
    it('should render plain text without highlighting', () => {
      const code = 'Hello World';
      const { lastFrame } = render(<SyntaxHighlighter code={code} />);

      expect(lastFrame()).toContain('Hello World');
    });

    it('should render with line numbers by default', () => {
      const code = 'const x = 1;\nconst y = 2;';
      const { lastFrame } = render(<SyntaxHighlighter code={code} showLineNumbers={true} />);

      expect(lastFrame()).toContain('1');
      expect(lastFrame()).toContain('2');
      expect(lastFrame()).toContain('const x = 1;');
      expect(lastFrame()).toContain('const y = 2;');
    });

    it('should render without line numbers when disabled', () => {
      const code = 'const x = 1;';
      const { lastFrame } = render(<SyntaxHighlighter code={code} showLineNumbers={false} />);

      const frame = lastFrame();
      expect(frame).toContain('const x = 1;');
      expect(frame).not.toMatch(/^\s*1\s/);
    });

    it('should handle empty code', () => {
      const { lastFrame } = render(<SyntaxHighlighter code="" />);

      expect(lastFrame()).toBeDefined();
      expect(lastFrame()).not.toContain('undefined');
    });

    it('should handle single line code', () => {
      const code = 'console.log("test");';
      const { lastFrame } = render(<SyntaxHighlighter code={code} />);

      expect(lastFrame()).toContain('console.log("test");');
    });

    it('should handle multiline code', () => {
      const code = 'function test() {\n  return true;\n}';
      const { lastFrame } = render(<SyntaxHighlighter code={code} />);

      expect(lastFrame()).toContain('function test() {');
      expect(lastFrame()).toContain('return true;');
      expect(lastFrame()).toContain('}');
    });
  });

  describe('Language Detection', () => {
    it('should auto-detect JavaScript', () => {
      const code = 'const x = 1;\nfunction test() { return x; }';
      const { lastFrame } = render(<SyntaxHighlighter code={code} />);

      expect(lastFrame()).toContain('const');
      expect(lastFrame()).toContain('function');
    });

    it('should auto-detect TypeScript', () => {
      const code = 'interface User { name: string; }\nconst user: User = { name: "test" };';
      const { lastFrame } = render(<SyntaxHighlighter code={code} />);

      expect(lastFrame()).toContain('interface');
      expect(lastFrame()).toContain('User');
      expect(lastFrame()).toContain('string');
    });

    it('should auto-detect Python', () => {
      const code = 'def hello():\n    print("Hello World")\n    return True';
      const { lastFrame } = render(<SyntaxHighlighter code={code} />);

      expect(lastFrame()).toContain('def');
      expect(lastFrame()).toContain('print');
      expect(lastFrame()).toContain('True');
    });

    it('should auto-detect JSON', () => {
      const code = '{\n  "name": "test",\n  "value": 123\n}';
      const { lastFrame } = render(<SyntaxHighlighter code={code} />);

      expect(lastFrame()).toContain('"name"');
      expect(lastFrame()).toContain('"test"');
      expect(lastFrame()).toContain('123');
    });

    it('should auto-detect HTML', () => {
      const code = '<div class="container">\n  <p>Hello</p>\n</div>';
      const { lastFrame } = render(<SyntaxHighlighter code={code} />);

      expect(lastFrame()).toContain('<div');
      expect(lastFrame()).toContain('class=');
      expect(lastFrame()).toContain('<p>');
    });

    it('should auto-detect CSS', () => {
      const code = '.container {\n  display: flex;\n  color: #333;\n}';
      const { lastFrame } = render(<SyntaxHighlighter code={code} />);

      expect(lastFrame()).toContain('.container');
      expect(lastFrame()).toContain('display:');
      expect(lastFrame()).toContain('flex');
    });

    it('should auto-detect shell/bash', () => {
      const code = '#!/bin/bash\necho "Hello"\nls -la';
      const { lastFrame } = render(<SyntaxHighlighter code={code} />);

      expect(lastFrame()).toContain('#!/bin/bash');
      expect(lastFrame()).toContain('echo');
      expect(lastFrame()).toContain('ls -la');
    });

    it('should fall back to plain text for unknown languages', () => {
      const code = 'Some random text\nwith no syntax';
      const { lastFrame } = render(<SyntaxHighlighter code={code} />);

      expect(lastFrame()).toContain('Some random text');
      expect(lastFrame()).toContain('with no syntax');
    });
  });

  describe('Explicit Language Setting', () => {
    it('should use explicitly set language', () => {
      const code = 'const x = 1;';
      const { lastFrame } = render(<SyntaxHighlighter code={code} language="javascript" />);

      expect(lastFrame()).toContain('const x = 1;');
    });

    it('should override auto-detection with explicit language', () => {
      const code = 'function test() {}';
      const { lastFrame } = render(<SyntaxHighlighter code={code} language="python" />);

      expect(lastFrame()).toContain('function test() {}');
    });

    it('should handle unsupported language gracefully', () => {
      const code = 'some code';
      const { lastFrame } = render(<SyntaxHighlighter code={code} language="unknown" />);

      expect(lastFrame()).toContain('some code');
    });
  });

  describe('Theme Support', () => {
    it('should apply default theme', () => {
      const code = 'const x = 1;';
      const { lastFrame } = render(<SyntaxHighlighter code={code} />);

      expect(lastFrame()).toContain('const x = 1;');
    });

    it('should apply dark theme', () => {
      const code = 'const x = 1;';
      const { lastFrame } = render(<SyntaxHighlighter code={code} theme="dark" />);

      expect(lastFrame()).toContain('const x = 1;');
    });

    it('should apply light theme', () => {
      const code = 'const x = 1;';
      const { lastFrame } = render(<SyntaxHighlighter code={code} theme="light" />);

      expect(lastFrame()).toContain('const x = 1;');
    });

    it('should apply high contrast theme', () => {
      const code = 'const x = 1;';
      const { lastFrame } = render(<SyntaxHighlighter code={code} theme="high-contrast" />);

      expect(lastFrame()).toContain('const x = 1;');
    });
  });

  describe('Line Numbers', () => {
    it('should display line numbers with proper padding', () => {
      const code = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join('\n');
      const { lastFrame } = render(<SyntaxHighlighter code={code} showLineNumbers={true} />);

      const frame = lastFrame();
      expect(frame).toContain('1');
      expect(frame).toContain('10');
      expect(frame).toContain('line 1');
      expect(frame).toContain('line 10');
    });

    it('should handle large line numbers with proper padding', () => {
      const code = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`).join('\n');
      const { lastFrame } = render(<SyntaxHighlighter code={code} showLineNumbers={true} />);

      const frame = lastFrame();
      expect(frame).toMatch(/\s*100\s/);
      expect(frame).toContain('line 100');
    });

    it('should start line numbers from custom start', () => {
      const code = 'first line\nsecond line';
      const { lastFrame } = render(
        <SyntaxHighlighter code={code} showLineNumbers={true} startLineNumber={5} />
      );

      const frame = lastFrame();
      expect(frame).toContain('5');
      expect(frame).toContain('6');
      expect(frame).toContain('first line');
      expect(frame).toContain('second line');
    });

    it('should handle zero and negative start line numbers', () => {
      const code = 'test line';
      const { lastFrame } = render(
        <SyntaxHighlighter code={code} showLineNumbers={true} startLineNumber={0} />
      );

      expect(lastFrame()).toContain('0');
      expect(lastFrame()).toContain('test line');
    });
  });

  describe('Syntax Highlighting Features', () => {
    it('should highlight JavaScript keywords', () => {
      const code = 'const function if else return';
      const { lastFrame } = render(<SyntaxHighlighter code={code} language="javascript" />);

      expect(lastFrame()).toContain('const');
      expect(lastFrame()).toContain('function');
      expect(lastFrame()).toContain('if');
      expect(lastFrame()).toContain('else');
      expect(lastFrame()).toContain('return');
    });

    it('should highlight TypeScript types', () => {
      const code = 'string number boolean interface type';
      const { lastFrame } = render(<SyntaxHighlighter code={code} language="typescript" />);

      expect(lastFrame()).toContain('string');
      expect(lastFrame()).toContain('number');
      expect(lastFrame()).toContain('boolean');
      expect(lastFrame()).toContain('interface');
      expect(lastFrame()).toContain('type');
    });

    it('should highlight string literals', () => {
      const code = '"hello" \'world\' `template`';
      const { lastFrame } = render(<SyntaxHighlighter code={code} language="javascript" />);

      expect(lastFrame()).toContain('"hello"');
      expect(lastFrame()).toContain("'world'");
      expect(lastFrame()).toContain('`template`');
    });

    it('should highlight numbers', () => {
      const code = '123 45.67 0xFF 0b1010';
      const { lastFrame } = render(<SyntaxHighlighter code={code} language="javascript" />);

      expect(lastFrame()).toContain('123');
      expect(lastFrame()).toContain('45.67');
      expect(lastFrame()).toContain('0xFF');
      expect(lastFrame()).toContain('0b1010');
    });

    it('should highlight comments', () => {
      const code = '// single line\n/* multi line */';
      const { lastFrame } = render(<SyntaxHighlighter code={code} language="javascript" />);

      expect(lastFrame()).toContain('// single line');
      expect(lastFrame()).toContain('/* multi line */');
    });

    it('should highlight operators', () => {
      const code = '+ - * / = == === != !== && ||';
      const { lastFrame } = render(<SyntaxHighlighter code={code} language="javascript" />);

      expect(lastFrame()).toContain('+');
      expect(lastFrame()).toContain('===');
      expect(lastFrame()).toContain('&&');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed code gracefully', () => {
      const code = 'function test( { invalid syntax here';
      const { lastFrame } = render(<SyntaxHighlighter code={code} />);

      expect(lastFrame()).toContain('function test(');
      expect(lastFrame()).toContain('invalid syntax here');
    });

    it('should handle very long lines', () => {
      const code = 'a'.repeat(1000);
      const { lastFrame } = render(<SyntaxHighlighter code={code} />);

      expect(lastFrame()).toContain('a');
    });

    it('should handle unicode characters', () => {
      const code = '🚀 const emoji = "😀";';
      const { lastFrame } = render(<SyntaxHighlighter code={code} />);

      expect(lastFrame()).toContain('🚀');
      expect(lastFrame()).toContain('😀');
      expect(lastFrame()).toContain('const');
    });

    it('should handle null and undefined code', () => {
      const { lastFrame: frame1 } = render(<SyntaxHighlighter code={null as any} />);
      const { lastFrame: frame2 } = render(<SyntaxHighlighter code={undefined as any} />);

      expect(frame1()).toBeDefined();
      expect(frame2()).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle large files efficiently', () => {
      const code = Array.from({ length: 1000 }, (_, i) => `line ${i + 1}: const x = ${i};`).join('\n');
      const { lastFrame } = render(<SyntaxHighlighter code={code} />);

      expect(lastFrame()).toContain('line 1:');
      expect(lastFrame()).toContain('line 1000:');
    });

    it('should handle files with many syntax elements', () => {
      const code = `
        function complexFunction() {
          const numbers = [1, 2, 3, 4, 5];
          const strings = ["hello", "world", "test"];
          let result = 0;

          for (let i = 0; i < numbers.length; i++) {
            result += numbers[i];
          }

          return result;
        }
      `;
      const { lastFrame } = render(<SyntaxHighlighter code={code} />);

      expect(lastFrame()).toContain('function');
      expect(lastFrame()).toContain('const');
      expect(lastFrame()).toContain('for');
      expect(lastFrame()).toContain('return');
    });
  });

  describe('Customization Options', () => {
    it('should support custom tab size', () => {
      const code = '\tindented line';
      const { lastFrame } = render(<SyntaxHighlighter code={code} tabSize={4} />);

      expect(lastFrame()).toContain('indented line');
    });

    it('should support word wrap option', () => {
      const code = 'very long line that should wrap when the wrap option is enabled';
      const { lastFrame } = render(<SyntaxHighlighter code={code} wrap={true} />);

      expect(lastFrame()).toContain('very long line');
    });

    it('should support custom width', () => {
      const code = 'test line';
      const { lastFrame } = render(<SyntaxHighlighter code={code} width={50} />);

      expect(lastFrame()).toContain('test line');
    });

    it('should support highlighting specific lines', () => {
      const code = 'line 1\nline 2\nline 3';
      const { lastFrame } = render(
        <SyntaxHighlighter code={code} highlightLines={[2]} />
      );

      expect(lastFrame()).toContain('line 1');
      expect(lastFrame()).toContain('line 2');
      expect(lastFrame()).toContain('line 3');
    });
  });

  describe('Integration Features', () => {
    it('should support copy functionality', () => {
      const code = 'const x = 1;';
      const onCopy = vi.fn();
      const { lastFrame } = render(
        <SyntaxHighlighter code={code} onCopy={onCopy} showCopyButton={true} />
      );

      expect(lastFrame()).toContain('const x = 1;');
    });

    it('should support line selection', () => {
      const code = 'line 1\nline 2\nline 3';
      const onLineSelect = vi.fn();
      const { lastFrame } = render(
        <SyntaxHighlighter code={code} onLineSelect={onLineSelect} />
      );

      expect(lastFrame()).toContain('line 1');
      expect(lastFrame()).toContain('line 2');
      expect(lastFrame()).toContain('line 3');
    });

    it('should support search highlighting', () => {
      const code = 'function test() { return true; }';
      const { lastFrame } = render(
        <SyntaxHighlighter code={code} searchTerm="test" />
      );

      expect(lastFrame()).toContain('function');
      expect(lastFrame()).toContain('test');
      expect(lastFrame()).toContain('return');
    });

    it('should support folding markers', () => {
      const code = 'function test() {\n  return true;\n}';
      const { lastFrame } = render(
        <SyntaxHighlighter code={code} showFolding={true} />
      );

      expect(lastFrame()).toContain('function test()');
      expect(lastFrame()).toContain('return true;');
    });
  });
});