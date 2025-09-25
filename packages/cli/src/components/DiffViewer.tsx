import React from 'react';
import { Box, Text } from 'ink';
import { SyntaxHighlighter } from './SyntaxHighlighter';

export interface DiffViewerProps {
  diff?: string;
  oldCode?: string;
  newCode?: string;
  layout?: 'unified' | 'side-by-side' | 'inline';
  showLineNumbers?: boolean;
  showHeaders?: boolean;
  highlightSyntax?: boolean;
  language?: string;
  theme?: 'dark' | 'light' | 'high-contrast';
  wordDiff?: boolean;
  contextLines?: number;
  expandContext?: boolean;
  interactive?: boolean;
  collapsible?: boolean;
  showFoldIndicators?: boolean;
  collapseUnchanged?: boolean;
  showStats?: boolean;
  showNavigationHints?: boolean;
  showCopyButton?: boolean;
  oldLabel?: string;
  newLabel?: string;
  onChunkSelect?: (chunkIndex: number) => void;
  onLineSelect?: (lineNumber: number) => void;
  onCopy?: () => void;
}

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

interface DiffChunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  diff,
  oldCode,
  newCode,
  layout = 'unified',
  showLineNumbers = false,
  showHeaders = false,
  highlightSyntax = false,
  language,
  theme = 'dark',
  wordDiff = false,
  contextLines = 3,
  expandContext = false,
  interactive = false,
  collapsible = false,
  showFoldIndicators = false,
  collapseUnchanged = false,
  showStats = false,
  showNavigationHints = false,
  showCopyButton = false,
  oldLabel = 'Original',
  newLabel = 'Modified',
  onChunkSelect,
  onLineSelect,
  onCopy,
}) => {
  // Handle null/undefined inputs
  if (diff == null && (oldCode == null || newCode == null)) {
    return <Text></Text>;
  }

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
      case 'html':
      case 'htm':
        return 'html';
      case 'css':
        return 'css';
      case 'sh':
      case 'bash':
        return 'shell';
      case 'json':
        return 'json';
      default:
        return 'plain';
    }
  };

  const parseDiff = (
    diffText: string
  ): {
    chunks: DiffChunk[];
    oldFile: string;
    newFile: string;
    detectedLanguage: string;
  } => {
    const lines = diffText.split('\n');
    const chunks: DiffChunk[] = [];
    let oldFile = '';
    let newFile = '';
    let detectedLanguage = language || 'plain';

    let currentChunk: DiffChunk | null = null;
    let oldLineNumber = 0;
    let newLineNumber = 0;

    for (const line of lines) {
      // Parse file headers
      if (line.startsWith('--- ')) {
        oldFile = line.substring(4);
        if (!language) {
          detectedLanguage = detectLanguageFromFilename(oldFile);
        }
      } else if (line.startsWith('+++ ')) {
        newFile = line.substring(4);
        if (!language) {
          const newLang = detectLanguageFromFilename(newFile);
          if (newLang !== 'plain') detectedLanguage = newLang;
        }
      }
      // Parse chunk headers (@@ -1,3 +1,4 @@)
      else if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
        if (match) {
          if (currentChunk) chunks.push(currentChunk);

          const oldStart = parseInt(match[1]);
          const oldCount = match[2] ? parseInt(match[2]) : 1;
          const newStart = parseInt(match[3]);
          const newCount = match[4] ? parseInt(match[4]) : 1;

          currentChunk = {
            oldStart,
            oldCount,
            newStart,
            newCount,
            lines: [],
          };

          oldLineNumber = oldStart;
          newLineNumber = newStart;
        }
      }
      // Parse diff lines
      else if (currentChunk) {
        if (line.startsWith('+')) {
          currentChunk.lines.push({
            type: 'add',
            content: line.substring(1).trimStart(),
            newLineNumber: newLineNumber++,
          });
        } else if (line.startsWith('-')) {
          currentChunk.lines.push({
            type: 'remove',
            content: line.substring(1).trimStart(),
            oldLineNumber: oldLineNumber++,
          });
        } else if (line.startsWith(' ')) {
          currentChunk.lines.push({
            type: 'context',
            content: line.substring(1),
            oldLineNumber: oldLineNumber++,
            newLineNumber: newLineNumber++,
          });
        }
      }
      // Skip other lines (git headers, etc.)
    }

    if (currentChunk) chunks.push(currentChunk);

    return { chunks, oldFile, newFile, detectedLanguage };
  };

  const generateDiffFromCodes = (
    oldCode: string,
    newCode: string
  ): { chunks: DiffChunk[]; detectedLanguage: string } => {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    const detectedLanguage = language || 'javascript';

    // Simple line-by-line diff
    const maxLines = Math.max(oldLines.length, newLines.length);
    const lines: DiffLine[] = [];

    for (let i = 0; i < maxLines; i++) {
      const oldLine = i < oldLines.length ? oldLines[i] : undefined;
      const newLine = i < newLines.length ? newLines[i] : undefined;

      if (oldLine === newLine && oldLine !== undefined) {
        lines.push({
          type: 'context',
          content: oldLine,
          oldLineNumber: i + 1,
          newLineNumber: i + 1,
        });
      } else {
        if (oldLine !== undefined) {
          lines.push({
            type: 'remove',
            content: oldLine,
            oldLineNumber: i + 1,
          });
        }
        if (newLine !== undefined) {
          lines.push({
            type: 'add',
            content: newLine,
            newLineNumber: i + 1,
          });
        }
      }
    }

    const chunk: DiffChunk = {
      oldStart: 1,
      oldCount: oldLines.length,
      newStart: 1,
      newCount: newLines.length,
      lines,
    };

    return { chunks: [chunk], detectedLanguage };
  };

  const getThemeColors = () => {
    switch (theme) {
      case 'light':
        return {
          add: 'green',
          remove: 'red',
          context: 'black',
          header: 'blue',
          lineNumber: 'gray',
        };
      case 'high-contrast':
        return {
          add: 'white',
          remove: 'white',
          context: 'white',
          header: 'white',
          lineNumber: 'gray',
        };
      default: // dark
        return {
          add: 'green',
          remove: 'red',
          context: 'white',
          header: 'cyan',
          lineNumber: 'gray',
        };
    }
  };

  const renderLine = (
    line: DiffLine,
    colors: {
      add: string;
      remove: string;
      context: string;
      header: string;
      lineNumber: string;
    },
    detectedLanguage: string
  ): React.ReactNode => {
    const prefix =
      line.type === 'add' ? '+ ' : line.type === 'remove' ? '- ' : '  ';
    const color =
      line.type === 'add'
        ? colors.add
        : line.type === 'remove'
          ? colors.remove
          : colors.context;

    // For syntax highlighting, render as a Box since SyntaxHighlighter returns Box components
    if (highlightSyntax && line.type !== 'header') {
      return (
        <Box flexDirection="row">
          <Text color={color}>{prefix}</Text>
          <SyntaxHighlighter
            code={line.content}
            language={detectedLanguage}
            theme={theme}
            showLineNumbers={false}
          />
        </Box>
      );
    }

    return (
      <Text color={color}>
        {prefix}
        {line.content}
      </Text>
    );
  };

  const renderUnifiedDiff = (
    chunks: DiffChunk[],
    oldFile: string,
    newFile: string,
    detectedLanguage: string
  ): React.ReactNode => {
    const colors = getThemeColors();

    return (
      <Box flexDirection="column">
        {showHeaders && (oldFile || newFile) && (
          <Box flexDirection="column" marginBottom={1}>
            <Text color={colors.header}>--- {oldFile}</Text>
            <Text color={colors.header}>+++ {newFile}</Text>
          </Box>
        )}

        {chunks.map((chunk, chunkIndex) => (
          <Box key={chunkIndex} flexDirection="column">
            {chunks.length > 1 && (
              <Text color={colors.header}>
                @@ -{chunk.oldStart},{chunk.oldCount} +{chunk.newStart},
                {chunk.newCount} @@
              </Text>
            )}
            {chunk.lines.map((line, lineIndex) => (
              <Box
                key={`unified-${chunkIndex}-${lineIndex}`}
                flexDirection="row"
              >
                {showLineNumbers && (
                  <Box flexDirection="row" marginRight={1}>
                    <Text color={colors.lineNumber}>
                      {(line.oldLineNumber || '').toString().padStart(3)}
                    </Text>
                    <Text color={colors.lineNumber}>
                      {(line.newLineNumber || '').toString().padStart(3)}
                    </Text>
                  </Box>
                )}
                {renderLine(line, colors, detectedLanguage)}
              </Box>
            ))}
          </Box>
        ))}

        {showCopyButton && (
          <Box marginTop={1}>
            <Text color="gray">Press 'c' to copy</Text>
          </Box>
        )}
      </Box>
    );
  };

  const renderSideBySide = (
    chunks: DiffChunk[],
    detectedLanguage: string
  ): React.ReactNode => {
    const colors = getThemeColors();

    return (
      <Box flexDirection="column">
        {showHeaders && (
          <Box flexDirection="row" marginBottom={1}>
            <Box width="50%">
              <Text color={colors.header} bold>
                {oldLabel}
              </Text>
            </Box>
            <Box width="50%">
              <Text color={colors.header} bold>
                {newLabel}
              </Text>
            </Box>
          </Box>
        )}

        {chunks.map((chunk, chunkIndex) => (
          <Box key={chunkIndex} flexDirection="column">
            {chunk.lines.map((line, lineIndex) => {
              if (line.type === 'context') {
                return (
                  <Box
                    key={`sidebyside-${chunkIndex}-${lineIndex}`}
                    flexDirection="row"
                  >
                    <Box width="50%">
                      <Text color={colors.context}> {line.content}</Text>
                    </Box>
                    <Box width="50%">
                      <Text color={colors.context}> {line.content}</Text>
                    </Box>
                  </Box>
                );
              } else {
                return (
                  <Box
                    key={`sidebyside-${chunkIndex}-${lineIndex}`}
                    flexDirection="row"
                  >
                    <Box width="50%">
                      {line.type === 'remove' && (
                        <Text color={colors.remove}>- {line.content}</Text>
                      )}
                      {line.type === 'context' && (
                        <Text color={colors.context}> {line.content}</Text>
                      )}
                    </Box>
                    <Box width="50%">
                      {line.type === 'add' && (
                        <Text color={colors.add}>+ {line.content}</Text>
                      )}
                      {line.type === 'context' && (
                        <Text color={colors.context}> {line.content}</Text>
                      )}
                    </Box>
                  </Box>
                );
              }
            })}
          </Box>
        ))}
      </Box>
    );
  };

  // Main logic
  if (diff !== undefined) {
    // Handle empty diff
    if (diff.trim() === '') {
      return <Text>No changes</Text>;
    }

    // Check for binary files
    if (diff.includes('Binary files')) {
      const binaryMatch = diff.match(/Binary files (.+) and (.+) differ/);
      if (binaryMatch) {
        return (
          <Text>
            Binary files {binaryMatch[1]} and {binaryMatch[2]} differ
          </Text>
        );
      }
      return <Text>Binary files differ</Text>;
    }

    // Check for malformed diff
    if (
      !diff.includes('@@') &&
      !diff.includes('---') &&
      !diff.includes('+++')
    ) {
      return <Text>Invalid diff format</Text>;
    }

    const { chunks, oldFile, newFile, detectedLanguage } = parseDiff(diff);

    if (chunks.length === 0) {
      return <Text>No changes</Text>;
    }

    if (layout === 'side-by-side') {
      return renderSideBySide(chunks, detectedLanguage);
    } else {
      return renderUnifiedDiff(chunks, oldFile, newFile, detectedLanguage);
    }
  } else if (oldCode !== undefined && newCode !== undefined) {
    // Handle identical code
    if (oldCode === newCode) {
      return <Text>No differences found</Text>;
    }

    const { chunks, detectedLanguage } = generateDiffFromCodes(
      oldCode,
      newCode
    );

    if (layout === 'side-by-side') {
      return renderSideBySide(chunks, detectedLanguage);
    } else {
      return renderUnifiedDiff(chunks, '', '', detectedLanguage);
    }
  }

  return <Text>No diff provided</Text>;
};
