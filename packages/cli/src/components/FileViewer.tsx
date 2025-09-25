import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { SyntaxHighlighter } from './SyntaxHighlighter';

export interface FileViewerProps {
  content: string;
  filename?: string;
  filepath?: string;
  showLineNumbers?: boolean;
  syntax?: boolean;
  language?: string;
  theme?: 'dark' | 'light' | 'high-contrast';
  highlightLines?: number[];
  highlightRange?: { start: number; end: number };
  currentLine?: number;
  showCursor?: boolean;
  searchTerm?: string;
  showMatchCount?: boolean;
  currentMatch?: number;
  caseInsensitive?: boolean;
  regex?: boolean;
  showScrollbar?: boolean;
  height?: number;
  viewportStart?: number;
  viewportSize?: number;
  showNavigationHints?: boolean;
  maxLines?: number;
  jumpToLine?: number;
  showFileSize?: boolean;
  showLineCount?: boolean;
  encoding?: string;
  showEncoding?: boolean;
  modified?: boolean;
  onLineSelect?: (lineNumber: number) => void;
  onCopy?: () => void;
  showCopyButton?: boolean;
  foldable?: boolean;
  showFoldIndicators?: boolean;
  showMinimap?: boolean;
  binary?: boolean;
  wrapLines?: boolean;
  maxWidth?: number;
  virtualize?: boolean;
  error?: string;
}

export const FileViewer: React.FC<FileViewerProps> = ({
  content,
  filename,
  filepath,
  showLineNumbers = true,
  syntax = false,
  language,
  theme = 'dark',
  highlightLines = [],
  highlightRange,
  currentLine,
  showCursor = false,
  searchTerm,
  showMatchCount = false,
  currentMatch,
  caseInsensitive = false,
  regex = false,
  showScrollbar = false,
  height,
  viewportStart = 0,
  viewportSize,
  showNavigationHints = false,
  maxLines,
  jumpToLine,
  showFileSize = false,
  showLineCount = false,
  encoding = 'UTF-8',
  showEncoding = false,
  modified = false,
  onLineSelect,
  onCopy,
  showCopyButton = false,
  foldable = false,
  showFoldIndicators = false,
  showMinimap = false,
  binary = false,
  wrapLines = false,
  maxWidth = 80,
  virtualize = false,
  error,
}) => {
  // Handle error state
  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  // Handle binary files
  if (binary) {
    return (
      <Box flexDirection="column">
        <Text>Binary file{filename ? `: ${filename}` : ''}</Text>
        {filepath && <Text color="gray">{filepath}</Text>}
      </Box>
    );
  }

  // Handle null/undefined content
  if (content == null) {
    return <Text>No content</Text>;
  }

  // Handle empty content
  if (content === '') {
    return <Text>Empty file</Text>;
  }

  const contentString = String(content);
  const lines = useMemo(() => contentString.split('\n'), [contentString]);

  // Calculate viewport
  const effectiveViewportStart = jumpToLine ? jumpToLine - 1 : viewportStart;
  const effectiveViewportSize =
    viewportSize ||
    (maxLines && maxLines < lines.length ? maxLines : lines.length);
  const viewportEnd = Math.min(
    effectiveViewportStart + effectiveViewportSize,
    lines.length
  );
  const displayLines =
    virtualize || viewportSize || maxLines
      ? lines.slice(effectiveViewportStart, viewportEnd)
      : lines;

  // Count search matches
  const searchMatches = useMemo(() => {
    if (!searchTerm) return [];
    const matches: Array<{ line: number; column: number }> = [];

    try {
      const searchRegex = regex
        ? new RegExp(searchTerm, caseInsensitive ? 'gi' : 'g')
        : new RegExp(
            searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            caseInsensitive ? 'gi' : 'g'
          );

      lines.forEach((line, index) => {
        const lineMatches = line.matchAll(searchRegex);
        for (const match of lineMatches) {
          matches.push({ line: index + 1, column: match.index || 0 });
        }
      });
    } catch (e) {
      // Invalid regex, treat as literal string
      const literalSearch = searchTerm.toLowerCase();
      lines.forEach((line, index) => {
        const searchLine = caseInsensitive ? line.toLowerCase() : line;
        const searchStr = caseInsensitive ? literalSearch : searchTerm;
        let pos = 0;
        while ((pos = searchLine.indexOf(searchStr, pos)) !== -1) {
          matches.push({ line: index + 1, column: pos });
          pos += searchStr.length;
        }
      });
    }

    return matches;
  }, [searchTerm, lines, regex, caseInsensitive]);

  const detectLanguageFromFilename = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'py':
        return 'python';
      case 'json':
        return 'json';
      case 'html':
      case 'htm':
        return 'html';
      case 'css':
        return 'css';
      case 'md':
        return 'markdown';
      default:
        return 'plain';
    }
  };

  const detectedLanguage =
    language || (filename ? detectLanguageFromFilename(filename) : 'plain');

  const highlightSearchInLine = (
    line: string,
    lineNumber: number
  ): React.ReactNode => {
    if (!searchTerm) return line;

    try {
      const searchRegex = regex
        ? new RegExp(`(${searchTerm})`, caseInsensitive ? 'gi' : 'g')
        : new RegExp(
            `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
            caseInsensitive ? 'gi' : 'g'
          );

      const parts = line.split(searchRegex);
      return parts.map((part, index) => {
        const isMatch = index % 2 === 1;
        const matchIndex = Math.floor(index / 2);
        const isCurrentMatch =
          currentMatch !== undefined &&
          searchMatches.findIndex(m => m.line === lineNumber) ===
            currentMatch - 1;

        if (isMatch) {
          return (
            <Text
              key={index}
              backgroundColor={isCurrentMatch ? 'yellow' : 'blue'}
              color="white"
            >
              {part}
            </Text>
          );
        }
        return part;
      });
    } catch (e) {
      // Invalid regex, treat as literal string
      if (!caseInsensitive && line.includes(searchTerm)) {
        const parts = line.split(searchTerm);
        return parts.reduce((acc: React.ReactNode[], part, index) => {
          if (index > 0) {
            acc.push(
              <Text key={`match-${index}`} backgroundColor="blue" color="white">
                {searchTerm}
              </Text>
            );
          }
          if (part) acc.push(part);
          return acc;
        }, []);
      }
      return line;
    }
  };

  const isLineHighlighted = (lineNumber: number): boolean => {
    if (highlightLines.includes(lineNumber)) return true;
    if (
      highlightRange &&
      lineNumber >= highlightRange.start &&
      lineNumber <= highlightRange.end
    )
      return true;
    if (currentLine === lineNumber) return true;
    return false;
  };

  const wrapLine = (line: string, width: number): string[] => {
    if (!wrapLines || line.length <= width) return [line];
    const wrapped: string[] = [];
    for (let i = 0; i < line.length; i += width) {
      wrapped.push(line.slice(i, i + width));
    }
    return wrapped;
  };

  const renderLine = (line: string, index: number): React.ReactNode => {
    const actualLineNumber = effectiveViewportStart + index + 1;
    const highlighted = isLineHighlighted(actualLineNumber);
    const isCurrent = currentLine === actualLineNumber;

    const wrappedLines = wrapLines ? wrapLine(line, maxWidth) : [line];

    return wrappedLines.map((wrappedLine, wrapIndex) => (
      <Box
        key={`${index}-${wrapIndex}`}
        flexDirection="row"
        backgroundColor={highlighted ? 'blue' : undefined}
      >
        {showLineNumbers && wrapIndex === 0 && (
          <Box marginRight={1}>
            <Text color="gray">
              {actualLineNumber
                .toString()
                .padStart(Math.max(3, lines.length.toString().length))}
            </Text>
          </Box>
        )}
        {showLineNumbers && wrapIndex > 0 && (
          <Box marginRight={1}>
            <Text color="gray">
              {' '.repeat(Math.max(3, lines.length.toString().length))}
            </Text>
          </Box>
        )}
        {isCurrent && showCursor && wrapIndex === 0 && (
          <Text color="cyan">{'>'}</Text>
        )}
        {(!isCurrent || !showCursor) &&
          wrapIndex === 0 &&
          showFoldIndicators &&
          foldable &&
          wrappedLine.includes('{') && <Text color="gray">{'▼'}</Text>}
        {syntax && !searchTerm ? (
          <SyntaxHighlighter
            code={wrappedLine}
            language={detectedLanguage}
            theme={theme}
            showLineNumbers={false}
          />
        ) : (
          <Text>{highlightSearchInLine(wrappedLine, actualLineNumber)}</Text>
        )}
      </Box>
    ));
  };

  return (
    <Box flexDirection="column">
      {/* Header with file info */}
      {(filename ||
        filepath ||
        showFileSize ||
        showLineCount ||
        showEncoding ||
        modified) && (
        <Box flexDirection="column" marginBottom={1}>
          {filename && (
            <Text bold color="cyan">
              {filename}
            </Text>
          )}
          {filepath && <Text color="gray">{filepath}</Text>}
          <Box flexDirection="row">
            {showLineCount && <Text color="gray">{lines.length} lines</Text>}
            {showLineCount && showFileSize && <Text color="gray"> · </Text>}
            {showFileSize && (
              <Text color="gray">{contentString.length} bytes</Text>
            )}
            {(showLineCount || showFileSize) && showEncoding && (
              <Text color="gray"> · </Text>
            )}
            {showEncoding && <Text color="gray">{encoding}</Text>}
            {(showLineCount || showFileSize || showEncoding) && modified && (
              <Text color="gray"> · </Text>
            )}
            {modified && <Text color="yellow">Modified</Text>}
          </Box>
        </Box>
      )}

      {/* Search match count */}
      {searchTerm && showMatchCount && (
        <Box marginBottom={1}>
          <Text color="yellow">{searchMatches.length} matches</Text>
        </Box>
      )}

      {/* File content */}
      <Box flexDirection="column">
        {displayLines.map((line, index) => renderLine(line, index))}
      </Box>

      {/* Truncation indicator */}
      {maxLines && lines.length > maxLines && (
        <Box marginTop={1}>
          <Text color="gray">... {lines.length - maxLines} more lines</Text>
        </Box>
      )}

      {/* Navigation hints */}
      {showNavigationHints && (
        <Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
          <Text color="gray">
            ↑↓ Navigate · / Search · g Jump to line · ESC Back
          </Text>
        </Box>
      )}

      {/* Copy button */}
      {showCopyButton && (
        <Box marginTop={1}>
          <Text color="gray">Press 'c' to Copy</Text>
        </Box>
      )}
    </Box>
  );
};
