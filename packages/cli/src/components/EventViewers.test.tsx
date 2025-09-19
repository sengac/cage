import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { FileViewer, DiffViewer, CommandOutputViewer } from './EventViewers';
import type { EditEvent, BashEvent } from '../types/events';

describe('Event Viewers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('FileViewer', () => {
    it('should display file content with line numbers', () => {
      const content = `function hello() {
  console.log('Hello, World!');
}

hello();`;

      const { lastFrame } = render(
        <FileViewer
          filename="hello.js"
          content={content}
          showLineNumbers={true}
        />
      );

      const output = lastFrame();
      expect(output).toContain('hello.js');
      expect(output).toContain('1');
      expect(output).toContain('function hello()');
      expect(output).toContain('2');
      expect(output).toContain("console.log('Hello, World!')");
      expect(output).toContain('5');
      expect(output).toContain('hello();');
    });

    it('should highlight specific lines', () => {
      const content = `line 1
line 2
line 3
line 4
line 5`;

      const { lastFrame } = render(
        <FileViewer
          filename="test.txt"
          content={content}
          highlightLines={[2, 4]}
          showLineNumbers={true}
        />
      );

      const output = lastFrame();
      // Highlighted lines should have special markers or colors
      expect(output).toContain('line 2');
      expect(output).toContain('line 4');
    });

    it('should support syntax highlighting for JavaScript', () => {
      const jsCode = `const name = 'John';
function greet(person) {
  return \`Hello, \${person}!\`;
}`;

      const { lastFrame } = render(
        <FileViewer
          filename="example.js"
          content={jsCode}
          language="javascript"
          enableSyntaxHighlight={true}
        />
      );

      const output = lastFrame();
      expect(output).toContain('const');
      expect(output).toContain('function');
      expect(output).toContain('return');
    });

    it('should support syntax highlighting for TypeScript', () => {
      const tsCode = `interface Person {
  name: string;
  age: number;
}

const user: Person = {
  name: 'Alice',
  age: 30
};`;

      const { lastFrame } = render(
        <FileViewer
          filename="example.ts"
          content={tsCode}
          language="typescript"
          enableSyntaxHighlight={true}
        />
      );

      const output = lastFrame();
      expect(output).toContain('interface');
      expect(output).toContain('Person');
      expect(output).toContain('string');
      expect(output).toContain('number');
    });

    it('should handle empty content gracefully', () => {
      const { lastFrame } = render(
        <FileViewer
          filename="empty.txt"
          content=""
        />
      );

      const output = lastFrame();
      expect(output).toContain('empty.txt');
      expect(output).toContain('(empty file)');
    });

    it('should truncate long files with pagination info', () => {
      const longContent = Array(100).fill(0).map((_, i) => `Line ${i + 1}`).join('\n');

      const { lastFrame } = render(
        <FileViewer
          filename="long.txt"
          content={longContent}
          maxLines={20}
          currentPage={1}
        />
      );

      const output = lastFrame();
      expect(output).toContain('Line 1');
      expect(output).toContain('Line 20');
      expect(output).not.toContain('Line 21');
      expect(output).toContain('Page 1');
    });

    it('should show file metadata', () => {
      const { lastFrame } = render(
        <FileViewer
          filename="data.json"
          content='{"key": "value"}'
          fileSize={16}
          lastModified="2025-01-01T00:00:00Z"
          showMetadata={true}
        />
      );

      const output = lastFrame();
      expect(output).toContain('data.json');
      expect(output).toContain('16 bytes');
      expect(output).toContain('2025-01-01');
    });
  });

  describe('DiffViewer', () => {
    it('should display unified diff format', () => {
      const diff = `--- a/file.txt
+++ b/file.txt
@@ -1,3 +1,3 @@
 Line 1
-Line 2 old
+Line 2 new
 Line 3`;

      const { lastFrame } = render(
        <DiffViewer
          diff={diff}
          filename="file.txt"
        />
      );

      const output = lastFrame();
      expect(output).toContain('file.txt');
      expect(output).toContain('Line 1');
      expect(output).toContain('- Line 2 old');
      expect(output).toContain('+ Line 2 new');
      expect(output).toContain('Line 3');
    });

    it('should highlight added lines in green', () => {
      const diff = `@@ -1,2 +1,3 @@
 Unchanged line
+Added line 1
+Added line 2`;

      const { lastFrame } = render(
        <DiffViewer
          diff={diff}
          showColors={true}
        />
      );

      const output = lastFrame();
      expect(output).toContain('+ Added line 1');
      expect(output).toContain('+ Added line 2');
    });

    it('should highlight removed lines in red', () => {
      const diff = `@@ -1,3 +1,2 @@
 Unchanged line
-Removed line 1
-Removed line 2`;

      const { lastFrame } = render(
        <DiffViewer
          diff={diff}
          showColors={true}
        />
      );

      const output = lastFrame();
      expect(output).toContain('- Removed line 1');
      expect(output).toContain('- Removed line 2');
    });

    it('should display side-by-side diff when requested', () => {
      const diff = `@@ -1,2 +1,2 @@
-Old content
+New content`;

      const { lastFrame } = render(
        <DiffViewer
          diff={diff}
          viewMode="side-by-side"
        />
      );

      const output = lastFrame();
      expect(output).toContain('Old content');
      expect(output).toContain('New content');
    });

    it('should show diff statistics', () => {
      const diff = `@@ -1,5 +1,6 @@
 Line 1
-Line 2
+Line 2 modified
 Line 3
+Line 4 added
 Line 5
+Line 6 added`;

      const { lastFrame } = render(
        <DiffViewer
          diff={diff}
          showStats={true}
        />
      );

      const output = lastFrame();
      expect(output).toContain('3 additions');
      expect(output).toContain('1 deletion');
    });

    it('should handle binary file diffs', () => {
      const binaryDiff = 'Binary files a/image.png and b/image.png differ';

      const { lastFrame } = render(
        <DiffViewer
          diff={binaryDiff}
          filename="image.png"
        />
      );

      const output = lastFrame();
      expect(output).toContain('Binary file');
      expect(output).toContain('image.png');
    });

    it('should support multiple file diffs', () => {
      const multiDiff = `diff --git a/file1.txt b/file1.txt
--- a/file1.txt
+++ b/file1.txt
@@ -1 +1 @@
-old1
+new1
diff --git a/file2.txt b/file2.txt
--- a/file2.txt
+++ b/file2.txt
@@ -1 +1 @@
-old2
+new2`;

      const { lastFrame } = render(
        <DiffViewer
          diff={multiDiff}
          showFileList={true}
        />
      );

      const output = lastFrame();
      expect(output).toContain('file1.txt');
      expect(output).toContain('file2.txt');
      expect(output).toContain('2 files changed');
    });
  });

  describe('CommandOutputViewer', () => {
    it('should display command and output', () => {
      const bashEvent: BashEvent = {
        id: '1',
        type: 'bash',
        command: 'ls -la',
        output: `total 16
drwxr-xr-x  4 user  staff  128 Jan  1 00:00 .
drwxr-xr-x  3 user  staff   96 Jan  1 00:00 ..
-rw-r--r--  1 user  staff  100 Jan  1 00:00 file1.txt
-rw-r--r--  1 user  staff  200 Jan  1 00:00 file2.txt`,
        exitCode: 0,
        timestamp: '2025-01-01T00:00:00Z'
      };

      const { lastFrame } = render(
        <CommandOutputViewer event={bashEvent} />
      );

      const output = lastFrame();
      expect(output).toContain('$ ls -la');
      expect(output).toContain('total 16');
      expect(output).toContain('file1.txt');
      expect(output).toContain('file2.txt');
      expect(output).toContain('Exit code: 0');
    });

    it('should highlight error output', () => {
      const bashEvent: BashEvent = {
        id: '2',
        type: 'bash',
        command: 'cat nonexistent.txt',
        output: '',
        error: 'cat: nonexistent.txt: No such file or directory',
        exitCode: 1,
        timestamp: '2025-01-01T00:00:00Z'
      };

      const { lastFrame } = render(
        <CommandOutputViewer event={bashEvent} />
      );

      const output = lastFrame();
      expect(output).toContain('$ cat nonexistent.txt');
      expect(output).toContain('No such file or directory');
      expect(output).toContain('Exit code: 1');
    });

    it('should format JSON output', () => {
      const bashEvent: BashEvent = {
        id: '3',
        type: 'bash',
        command: 'echo \'{"key": "value", "array": [1, 2, 3]}\'',
        output: '{"key": "value", "array": [1, 2, 3]}',
        exitCode: 0,
        timestamp: '2025-01-01T00:00:00Z'
      };

      const { lastFrame } = render(
        <CommandOutputViewer
          event={bashEvent}
          formatJson={true}
        />
      );

      const output = lastFrame();
      expect(output).toContain('echo');
      expect(output).toContain('{');
      expect(output).toContain('  "key": "value"');
      expect(output).toContain('  "array": [');
      expect(output).toContain('    1,');
    });

    it('should show execution time', () => {
      const bashEvent: BashEvent = {
        id: '4',
        type: 'bash',
        command: 'sleep 2',
        output: '',
        exitCode: 0,
        timestamp: '2025-01-01T00:00:00Z',
        duration: 2000
      };

      const { lastFrame } = render(
        <CommandOutputViewer
          event={bashEvent}
          showTiming={true}
        />
      );

      const output = lastFrame();
      expect(output).toContain('$ sleep 2');
      expect(output).toContain('Execution time: 2.00s');
    });

    it('should handle ANSI escape codes', () => {
      const bashEvent: BashEvent = {
        id: '5',
        type: 'bash',
        command: 'ls --color',
        output: '\x1b[34mblue-dir\x1b[0m\n\x1b[32mgreen-file\x1b[0m',
        exitCode: 0,
        timestamp: '2025-01-01T00:00:00Z'
      };

      const { lastFrame } = render(
        <CommandOutputViewer
          event={bashEvent}
          stripAnsi={false}
        />
      );

      const output = lastFrame();
      expect(output).toContain('blue-dir');
      expect(output).toContain('green-file');
    });

    it('should truncate long output with expand option', () => {
      const longOutput = Array(100).fill(0).map((_, i) => `Line ${i + 1}`).join('\n');

      const bashEvent: BashEvent = {
        id: '6',
        type: 'bash',
        command: 'cat large-file.txt',
        output: longOutput,
        exitCode: 0,
        timestamp: '2025-01-01T00:00:00Z'
      };

      const { lastFrame } = render(
        <CommandOutputViewer
          event={bashEvent}
          maxLines={10}
          expandable={true}
        />
      );

      const output = lastFrame();
      expect(output).toContain('Line 1');
      expect(output).toContain('Line 10');
      expect(output).not.toContain('Line 11');
      expect(output).toContain('(90 more lines)');
    });

    it('should show working directory', () => {
      const bashEvent: BashEvent = {
        id: '7',
        type: 'bash',
        command: 'pwd',
        output: '/Users/test/project',
        exitCode: 0,
        timestamp: '2025-01-01T00:00:00Z',
        workingDirectory: '/Users/test/project'
      };

      const { lastFrame } = render(
        <CommandOutputViewer
          event={bashEvent}
          showWorkingDir={true}
        />
      );

      const output = lastFrame();
      expect(output).toContain('[/Users/test/project]');
      expect(output).toContain('$ pwd');
    });
  });
});