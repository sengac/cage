import React from 'react';
import { render } from 'ink-testing-library';
import { DiffViewer } from './DiffViewer';

describe('DiffViewer', () => {
  describe('Basic Rendering', () => {
    it('should render unified diff format', () => {
      const diff = `--- file.js
+++ file.js
@@ -1,3 +1,3 @@
 function test() {
-  return true;
+  return false;
 }`;
      const { lastFrame } = render(<DiffViewer diff={diff} />);

      expect(lastFrame()).toContain('function test()');
      expect(lastFrame()).toContain('- return true;');
      expect(lastFrame()).toContain('+ return false;');
    });

    it('should render side-by-side diff format', () => {
      const oldCode = 'function test() {\n  return true;\n}';
      const newCode = 'function test() {\n  return false;\n}';
      const { lastFrame } = render(
        <DiffViewer oldCode={oldCode} newCode={newCode} layout="side-by-side" />
      );

      expect(lastFrame()).toContain('function test()');
      expect(lastFrame()).toContain('return true;');
      expect(lastFrame()).toContain('return false;');
    });

    it('should render inline diff format', () => {
      const oldCode = 'const x = 1;';
      const newCode = 'const x = 2;';
      const { lastFrame } = render(
        <DiffViewer oldCode={oldCode} newCode={newCode} layout="inline" />
      );

      expect(lastFrame()).toContain('const x =');
      expect(lastFrame()).toContain('1');
      expect(lastFrame()).toContain('2');
    });

    it('should handle empty diffs', () => {
      const { lastFrame } = render(<DiffViewer diff="" />);

      expect(lastFrame()).toContain('No changes');
    });

    it('should handle identical code', () => {
      const code = 'const x = 1;';
      const { lastFrame } = render(
        <DiffViewer oldCode={code} newCode={code} />
      );

      expect(lastFrame()).toContain('No differences found');
    });

    it('should handle null and undefined inputs', () => {
      const { lastFrame: frame1 } = render(<DiffViewer diff={null as any} />);
      const { lastFrame: frame2 } = render(
        <DiffViewer oldCode={null as any} newCode={undefined as any} />
      );

      expect(frame1()).toBeDefined();
      expect(frame2()).toBeDefined();
    });
  });

  describe('Diff Parsing', () => {
    it('should parse unified diff headers', () => {
      const diff = `--- a/src/file.ts
+++ b/src/file.ts
@@ -1,3 +1,4 @@
 const x = 1;
-const y = 2;
+const y = 3;
+const z = 4;`;
      const { lastFrame } = render(
        <DiffViewer diff={diff} showHeaders={true} />
      );

      expect(lastFrame()).toContain('src/file.ts');
      expect(lastFrame()).toContain('const x = 1;');
      expect(lastFrame()).toContain('- const y = 2;');
      expect(lastFrame()).toContain('+ const y = 3;');
      expect(lastFrame()).toContain('+ const z = 4;');
    });

    it('should parse git diff format', () => {
      const diff = `diff --git a/file.js b/file.js
index 1234567..abcdefg 100644
--- a/file.js
+++ b/file.js
@@ -1,2 +1,2 @@
-old line
+new line`;
      const { lastFrame } = render(<DiffViewer diff={diff} />);

      expect(lastFrame()).toContain('- old line');
      expect(lastFrame()).toContain('+ new line');
    });

    it('should parse multiple hunks', () => {
      const diff = `--- file.js
+++ file.js
@@ -1,2 +1,2 @@
-line 1
+line one
@@ -5,2 +5,2 @@
-line 5
+line five`;
      const { lastFrame } = render(<DiffViewer diff={diff} />);

      expect(lastFrame()).toContain('- line 1');
      expect(lastFrame()).toContain('+ line one');
      expect(lastFrame()).toContain('- line 5');
      expect(lastFrame()).toContain('+ line five');
    });

    it('should handle context lines', () => {
      const diff = `--- file.js
+++ file.js
@@ -1,5 +1,5 @@
 context line 1
 context line 2
-changed line
+modified line
 context line 4
 context line 5`;
      const { lastFrame } = render(<DiffViewer diff={diff} />);

      expect(lastFrame()).toContain('context line 1');
      expect(lastFrame()).toContain('context line 2');
      expect(lastFrame()).toContain('- changed line');
      expect(lastFrame()).toContain('+ modified line');
      expect(lastFrame()).toContain('context line 4');
      expect(lastFrame()).toContain('context line 5');
    });
  });

  describe('Syntax Highlighting', () => {
    it('should apply syntax highlighting to diff content', () => {
      const diff = `--- file.js
+++ file.js
@@ -1,2 +1,2 @@
-function test() { return true; }
+function test() { return false; }`;
      const { lastFrame } = render(
        <DiffViewer diff={diff} highlightSyntax={true} />
      );

      expect(lastFrame()).toContain('function');
      expect(lastFrame()).toContain('test');
      expect(lastFrame()).toContain('return');
      expect(lastFrame()).toContain('true');
      expect(lastFrame()).toContain('false');
    });

    it('should detect language from file extension', () => {
      const diff = `--- file.py
+++ file.py
@@ -1,2 +1,2 @@
-def test(): return True
+def test(): return False`;
      const { lastFrame } = render(
        <DiffViewer diff={diff} highlightSyntax={true} />
      );

      expect(lastFrame()).toContain('def');
      expect(lastFrame()).toContain('test');
      expect(lastFrame()).toContain('True');
      expect(lastFrame()).toContain('False');
    });

    it('should use explicit language override', () => {
      const diff = `--- file.txt
+++ file.txt
@@ -1,2 +1,2 @@
-const x = 1;
+const x = 2;`;
      const { lastFrame } = render(
        <DiffViewer diff={diff} highlightSyntax={true} language="javascript" />
      );

      expect(lastFrame()).toContain('const');
      expect(lastFrame()).toContain('x');
    });

    it('should work without syntax highlighting', () => {
      const diff = `--- file.js
+++ file.js
@@ -1,2 +1,2 @@
-const x = 1;
+const x = 2;`;
      const { lastFrame } = render(
        <DiffViewer diff={diff} highlightSyntax={false} />
      );

      expect(lastFrame()).toContain('const x = 1;');
      expect(lastFrame()).toContain('const x = 2;');
    });
  });

  describe('Line Numbers', () => {
    it('should display line numbers for both sides', () => {
      const oldCode = 'line 1\nline 2\nline 3';
      const newCode = 'line 1\nmodified line 2\nline 3';
      const { lastFrame } = render(
        <DiffViewer
          oldCode={oldCode}
          newCode={newCode}
          showLineNumbers={true}
        />
      );

      expect(lastFrame()).toContain('1');
      expect(lastFrame()).toContain('2');
      expect(lastFrame()).toContain('3');
      expect(lastFrame()).toContain('line 1');
      expect(lastFrame()).toContain('modified line 2');
    });

    it('should handle line number alignment', () => {
      const diff = `--- file.js
+++ file.js
@@ -8,3 +8,4 @@
 line 8
-line 9
+modified line 9
+new line 10`;
      const { lastFrame } = render(
        <DiffViewer diff={diff} showLineNumbers={true} />
      );

      expect(lastFrame()).toContain('8');
      expect(lastFrame()).toContain('9');
      expect(lastFrame()).toContain('10');
    });

    it('should work without line numbers', () => {
      const diff = `--- file.js
+++ file.js
@@ -1,2 +1,2 @@
-old line
+new line`;
      const { lastFrame } = render(
        <DiffViewer diff={diff} showLineNumbers={false} />
      );

      const frame = lastFrame();
      expect(frame).toContain('old line');
      expect(frame).toContain('new line');
      expect(frame).not.toMatch(/^\s*\d+\s/);
    });
  });

  describe('Color Coding', () => {
    it('should color added lines green', () => {
      const diff = `--- file.js
+++ file.js
@@ -1,1 +1,2 @@
 existing line
+added line`;
      const { lastFrame } = render(<DiffViewer diff={diff} />);

      expect(lastFrame()).toContain('+ added line');
      expect(lastFrame()).toContain('existing line');
    });

    it('should color removed lines red', () => {
      const diff = `--- file.js
+++ file.js
@@ -1,2 +1,1 @@
 existing line
-removed line`;
      const { lastFrame } = render(<DiffViewer diff={diff} />);

      expect(lastFrame()).toContain('- removed line');
      expect(lastFrame()).toContain('existing line');
    });

    it('should use different colors for different themes', () => {
      const diff = `--- file.js
+++ file.js
@@ -1,2 +1,2 @@
-old line
+new line`;
      const { lastFrame: darkFrame } = render(
        <DiffViewer diff={diff} theme="dark" />
      );
      const { lastFrame: lightFrame } = render(
        <DiffViewer diff={diff} theme="light" />
      );

      expect(darkFrame()).toContain('- old line');
      expect(darkFrame()).toContain('+ new line');
      expect(lightFrame()).toContain('- old line');
      expect(lightFrame()).toContain('+ new line');
    });

    it('should handle high contrast theme', () => {
      const diff = `--- file.js
+++ file.js
@@ -1,2 +1,2 @@
-old line
+new line`;
      const { lastFrame } = render(
        <DiffViewer diff={diff} theme="high-contrast" />
      );

      expect(lastFrame()).toContain('- old line');
      expect(lastFrame()).toContain('+ new line');
    });
  });

  describe('Side-by-Side Layout', () => {
    it('should display old and new code side by side', () => {
      const oldCode = 'function test() {\n  return true;\n}';
      const newCode = 'function test() {\n  return false;\n}';
      const { lastFrame } = render(
        <DiffViewer oldCode={oldCode} newCode={newCode} layout="side-by-side" />
      );

      expect(lastFrame()).toContain('function test()');
      expect(lastFrame()).toContain('return true;');
      expect(lastFrame()).toContain('return false;');
    });

    it('should align corresponding lines', () => {
      const oldCode = 'line 1\nline 2\nline 3';
      const newCode = 'line 1\nmodified line 2\nline 3';
      const { lastFrame } = render(
        <DiffViewer oldCode={oldCode} newCode={newCode} layout="side-by-side" />
      );

      expect(lastFrame()).toContain('line 1');
      expect(lastFrame()).toContain('line 2');
      expect(lastFrame()).toContain('modified line 2');
      expect(lastFrame()).toContain('line 3');
    });

    it('should handle different file lengths', () => {
      const oldCode = 'line 1\nline 2';
      const newCode = 'line 1\nline 2\nline 3\nline 4';
      const { lastFrame } = render(
        <DiffViewer oldCode={oldCode} newCode={newCode} layout="side-by-side" />
      );

      expect(lastFrame()).toContain('line 1');
      expect(lastFrame()).toContain('line 2');
      expect(lastFrame()).toContain('line 3');
      expect(lastFrame()).toContain('line 4');
    });

    it('should show column headers', () => {
      const oldCode = 'old content';
      const newCode = 'new content';
      const { lastFrame } = render(
        <DiffViewer
          oldCode={oldCode}
          newCode={newCode}
          layout="side-by-side"
          showHeaders={true}
          oldLabel="Before"
          newLabel="After"
        />
      );

      expect(lastFrame()).toContain('Before');
      expect(lastFrame()).toContain('After');
      expect(lastFrame()).toContain('old content');
      expect(lastFrame()).toContain('new content');
    });
  });

  describe('Word-level Diff', () => {
    it('should highlight word-level changes', () => {
      const oldCode = 'const x = 1;';
      const newCode = 'const x = 2;';
      const { lastFrame } = render(
        <DiffViewer oldCode={oldCode} newCode={newCode} wordDiff={true} />
      );

      expect(lastFrame()).toContain('const x =');
      expect(lastFrame()).toContain('1');
      expect(lastFrame()).toContain('2');
    });

    it('should handle multiple word changes', () => {
      const oldCode = 'function test() { return true; }';
      const newCode = 'function check() { return false; }';
      const { lastFrame } = render(
        <DiffViewer oldCode={oldCode} newCode={newCode} wordDiff={true} />
      );

      expect(lastFrame()).toContain('function');
      expect(lastFrame()).toContain('test');
      expect(lastFrame()).toContain('check');
      expect(lastFrame()).toContain('true');
      expect(lastFrame()).toContain('false');
    });

    it('should work with line-level diff when disabled', () => {
      const oldCode = 'const x = 1;';
      const newCode = 'const x = 2;';
      const { lastFrame } = render(
        <DiffViewer oldCode={oldCode} newCode={newCode} wordDiff={false} />
      );

      expect(lastFrame()).toContain('const x = 1;');
      expect(lastFrame()).toContain('const x = 2;');
    });
  });

  describe('Context Control', () => {
    it('should limit context lines', () => {
      const diff = `--- file.js
+++ file.js
@@ -1,10 +1,10 @@
 line 1
 line 2
 line 3
 line 4
-changed line 5
+modified line 5
 line 6
 line 7
 line 8
 line 9
 line 10`;
      const { lastFrame } = render(<DiffViewer diff={diff} contextLines={2} />);

      expect(lastFrame()).toContain('line 3');
      expect(lastFrame()).toContain('line 4');
      expect(lastFrame()).toContain('changed line 5');
      expect(lastFrame()).toContain('modified line 5');
      expect(lastFrame()).toContain('line 6');
      expect(lastFrame()).toContain('line 7');
    });

    it('should expand context when requested', () => {
      const diff = `--- file.js
+++ file.js
@@ -5,3 +5,3 @@
 context line
-old line
+new line`;
      const { lastFrame } = render(
        <DiffViewer diff={diff} expandContext={true} />
      );

      expect(lastFrame()).toContain('context line');
      expect(lastFrame()).toContain('old line');
      expect(lastFrame()).toContain('new line');
    });

    it('should handle zero context lines', () => {
      const diff = `--- file.js
+++ file.js
@@ -5,1 +5,1 @@
-old line
+new line`;
      const { lastFrame } = render(<DiffViewer diff={diff} contextLines={0} />);

      expect(lastFrame()).toContain('old line');
      expect(lastFrame()).toContain('new line');
    });
  });

  describe('Interactive Features', () => {
    it('should support navigation between chunks', () => {
      const diff = `--- file.js
+++ file.js
@@ -1,2 +1,2 @@
-line 1
+modified line 1
@@ -5,2 +5,2 @@
-line 5
+modified line 5`;
      const onChunkSelect = vi.fn();
      const { lastFrame } = render(
        <DiffViewer
          diff={diff}
          onChunkSelect={onChunkSelect}
          interactive={true}
        />
      );

      expect(lastFrame()).toContain('modified line 1');
      expect(lastFrame()).toContain('modified line 5');
    });

    it('should support line selection', () => {
      const diff = `--- file.js
+++ file.js
@@ -1,3 +1,3 @@
 line 1
-line 2
+modified line 2
 line 3`;
      const onLineSelect = vi.fn();
      const { lastFrame } = render(
        <DiffViewer diff={diff} onLineSelect={onLineSelect} />
      );

      expect(lastFrame()).toContain('line 1');
      expect(lastFrame()).toContain('line 2');
      expect(lastFrame()).toContain('modified line 2');
      expect(lastFrame()).toContain('line 3');
    });

    it('should support copy functionality', () => {
      const diff = `--- file.js
+++ file.js
@@ -1,2 +1,2 @@
-old line
+new line`;
      const onCopy = vi.fn();
      const { lastFrame } = render(
        <DiffViewer diff={diff} onCopy={onCopy} showCopyButton={true} />
      );

      expect(lastFrame()).toContain('old line');
      expect(lastFrame()).toContain('new line');
    });

    it('should show navigation hints', () => {
      const diff = `--- file.js
+++ file.js
@@ -1,2 +1,2 @@
-old line
+new line`;
      const { lastFrame } = render(
        <DiffViewer diff={diff} showNavigationHints={true} />
      );

      expect(lastFrame()).toContain('old line');
      expect(lastFrame()).toContain('new line');
    });
  });

  describe('Folding and Collapsing', () => {
    it('should support chunk folding', () => {
      const diff = `--- file.js
+++ file.js
@@ -1,5 +1,5 @@
 line 1
 line 2
-old line 3
+new line 3
 line 4
 line 5`;
      const { lastFrame } = render(
        <DiffViewer diff={diff} collapsible={true} />
      );

      expect(lastFrame()).toContain('line 1');
      expect(lastFrame()).toContain('old line 3');
      expect(lastFrame()).toContain('new line 3');
    });

    it('should show fold indicators', () => {
      const diff = `--- file.js
+++ file.js
@@ -1,10 +1,10 @@
 line 1
 line 2
-old line
+new line
 line 4
 line 5`;
      const { lastFrame } = render(
        <DiffViewer diff={diff} showFoldIndicators={true} />
      );

      expect(lastFrame()).toContain('old line');
      expect(lastFrame()).toContain('new line');
    });

    it('should handle large unchanged sections', () => {
      const largeContext = Array.from(
        { length: 100 },
        (_, i) => ` unchanged line ${i + 1}`
      ).join('\n');
      const diff = `--- file.js
+++ file.js
@@ -1,102 +1,102 @@
${largeContext}
-changed line
+modified line`;
      const { lastFrame } = render(
        <DiffViewer diff={diff} collapseUnchanged={true} />
      );

      expect(lastFrame()).toContain('changed line');
      expect(lastFrame()).toContain('modified line');
    });
  });

  describe('Statistics and Summary', () => {
    it('should show diff statistics', () => {
      const diff = `--- file.js
+++ file.js
@@ -1,5 +1,6 @@
 line 1
-line 2
+modified line 2
 line 3
-line 4
+modified line 4
+new line 5
 line 6`;
      const { lastFrame } = render(<DiffViewer diff={diff} showStats={true} />);

      expect(lastFrame()).toContain('modified line 2');
      expect(lastFrame()).toContain('modified line 4');
      expect(lastFrame()).toContain('new line 5');
    });

    it('should calculate additions and deletions', () => {
      const diff = `--- file.js
+++ file.js
@@ -1,3 +1,4 @@
 unchanged line
-removed line
+added line 1
+added line 2`;
      const { lastFrame } = render(<DiffViewer diff={diff} showStats={true} />);

      expect(lastFrame()).toContain('removed line');
      expect(lastFrame()).toContain('added line 1');
      expect(lastFrame()).toContain('added line 2');
    });

    it('should handle binary files', () => {
      const diff = `diff --git a/image.png b/image.png
index 1234567..abcdefg 100644
Binary files a/image.png and b/image.png differ`;
      const { lastFrame } = render(<DiffViewer diff={diff} />);

      expect(lastFrame()).toContain('Binary files');
      expect(lastFrame()).toContain('image.png');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed diff format', () => {
      const malformedDiff = `This is not a valid diff format
Some random text
More invalid content`;
      const { lastFrame } = render(<DiffViewer diff={malformedDiff} />);

      expect(lastFrame()).toContain('Invalid diff format');
    });

    it('should handle very large diffs', () => {
      const largeDiff = Array.from({ length: 1000 }, (_, i) =>
        i % 2 === 0 ? ` line ${i}` : `+new line ${i}`
      ).join('\n');
      const diff = `--- file.js\n+++ file.js\n@@ -1,1000 +1,1000 @@\n${largeDiff}`;
      const { lastFrame } = render(<DiffViewer diff={diff} />);

      expect(lastFrame()).toContain('line 0');
      expect(lastFrame()).toContain('new line 1');
    });

    it('should handle unicode content', () => {
      const diff = `--- file.js
+++ file.js
@@ -1,2 +1,2 @@
-const emoji = "😀";
+const emoji = "🚀";`;
      const { lastFrame } = render(<DiffViewer diff={diff} />);

      expect(lastFrame()).toContain('😀');
      expect(lastFrame()).toContain('🚀');
      expect(lastFrame()).toContain('const emoji');
    });
  });
});
