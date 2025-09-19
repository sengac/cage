import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { BashEvent } from '../types/events';

// FileViewer Component
export interface FileViewerProps {
  filename: string;
  content: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  language?: string;
  enableSyntaxHighlight?: boolean;
  maxLines?: number;
  currentPage?: number;
  fileSize?: number;
  lastModified?: string;
  showMetadata?: boolean;
}

export function FileViewer({
  filename,
  content,
  showLineNumbers = false,
  highlightLines = [],
  language,
  enableSyntaxHighlight = false,
  maxLines,
  currentPage = 1,
  fileSize,
  lastModified,
  showMetadata = false
}: FileViewerProps) {
  const lines = useMemo(() => {
    if (!content) return [];
    return content.split('\n');
  }, [content]);

  const displayLines = useMemo(() => {
    if (!maxLines) return lines;

    const start = (currentPage - 1) * maxLines;
    const end = start + maxLines;
    return lines.slice(start, end);
  }, [lines, maxLines, currentPage]);

  const totalPages = maxLines ? Math.ceil(lines.length / maxLines) : 1;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">{filename}</Text>
        {showMetadata && fileSize !== undefined && (
          <Text color="gray"> | {fileSize} bytes</Text>
        )}
        {showMetadata && lastModified && (
          <Text color="gray"> | {lastModified.split('T')[0]}</Text>
        )}
      </Box>

      {content === '' ? (
        <Text color="gray">(empty file)</Text>
      ) : (
        <Box flexDirection="column">
          {displayLines.map((line, index) => {
            const actualLineNum = maxLines
              ? (currentPage - 1) * maxLines + index + 1
              : index + 1;
            const isHighlighted = highlightLines.includes(actualLineNum);

            return (
              <Box key={index}>
                {showLineNumbers && (
                  <Text color="gray" dimColor>
                    {String(actualLineNum).padStart(4, ' ')}
                  </Text>
                )}
                <Text color={isHighlighted ? 'yellow' : undefined}>
                  {line || ' '}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}

      {maxLines && totalPages > 1 && (
        <Box marginTop={1}>
          <Text color="gray">
            Page {currentPage} of {totalPages}
          </Text>
        </Box>
      )}
    </Box>
  );
}

// DiffViewer Component
export interface DiffViewerProps {
  diff: string;
  filename?: string;
  showColors?: boolean;
  viewMode?: 'unified' | 'side-by-side';
  showStats?: boolean;
  showFileList?: boolean;
}

export function DiffViewer({
  diff,
  filename,
  showColors = true,
  viewMode = 'unified',
  showStats = false,
  showFileList = false
}: DiffViewerProps) {
  const lines = diff.split('\n');

  const stats = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    let files = new Set<string>();

    lines.forEach(line => {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        additions++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletions++;
      } else if (line.startsWith('diff --git')) {
        const match = line.match(/a\/(.+?) b\//);
        if (match) files.add(match[1]);
      }
    });

    return { additions, deletions, filesChanged: files.size };
  }, [lines]);

  const isBinary = diff.includes('Binary files') && diff.includes('differ');

  return (
    <Box flexDirection="column">
      {filename && (
        <Box marginBottom={1}>
          <Text bold color="cyan">{filename}</Text>
        </Box>
      )}

      {showFileList && stats.filesChanged > 0 && (
        <Box marginBottom={1}>
          <Text color="yellow">{stats.filesChanged} files changed</Text>
        </Box>
      )}

      {showStats && !isBinary && (
        <Box marginBottom={1}>
          <Text color="green">+{stats.additions} additions </Text>
          <Text color="red">-{stats.deletions} deletion{stats.deletions !== 1 ? 's' : ''}</Text>
        </Box>
      )}

      {isBinary ? (
        <Text color="gray">Binary file {filename || '(unknown)'}</Text>
      ) : (
        <Box flexDirection="column">
          {lines.map((line, index) => {
            let color: string | undefined;
            let prefix = '';

            if (line.startsWith('+') && !line.startsWith('+++')) {
              color = showColors ? 'green' : undefined;
              prefix = '+ ';
              line = line.substring(1);
            } else if (line.startsWith('-') && !line.startsWith('---')) {
              color = showColors ? 'red' : undefined;
              prefix = '- ';
              line = line.substring(1);
            } else if (line.startsWith('@@')) {
              color = 'cyan';
            } else if (line.startsWith('diff --git') ||
                       line.startsWith('---') ||
                       line.startsWith('+++')) {
              color = 'gray';
            }

            return (
              <Text key={index} color={color}>
                {prefix}{line}
              </Text>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

// CommandOutputViewer Component
export interface CommandOutputViewerProps {
  event: BashEvent;
  formatJson?: boolean;
  showTiming?: boolean;
  stripAnsi?: boolean;
  maxLines?: number;
  expandable?: boolean;
  showWorkingDir?: boolean;
}

export function CommandOutputViewer({
  event,
  formatJson = false,
  showTiming = false,
  stripAnsi = true,
  maxLines,
  expandable = false,
  showWorkingDir = false
}: CommandOutputViewerProps) {
  const output = event.output || '';
  const error = event.error || '';

  const formattedOutput = useMemo(() => {
    let result = output;

    // Try to format as JSON if requested
    if (formatJson && output) {
      try {
        const parsed = JSON.parse(output);
        result = JSON.stringify(parsed, null, 2);
      } catch {
        // Not valid JSON, use as-is
      }
    }

    // Strip ANSI codes if requested
    if (stripAnsi) {
      result = result.replace(/\x1b\[[0-9;]*m/g, '');
    }

    return result;
  }, [output, formatJson, stripAnsi]);

  const outputLines = formattedOutput.split('\n');
  const errorLines = error.split('\n');
  const totalLines = outputLines.length;

  const displayLines = maxLines && outputLines.length > maxLines
    ? outputLines.slice(0, maxLines)
    : outputLines;

  const truncated = maxLines && totalLines > maxLines;
  const remainingLines = totalLines - (maxLines || 0);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        {showWorkingDir && event.workingDirectory && (
          <Text color="gray">[{event.workingDirectory}] </Text>
        )}
        <Text bold color="cyan">$ {event.command}</Text>
      </Box>

      {displayLines.length > 0 && displayLines[0] !== '' && (
        <Box flexDirection="column" marginBottom={1}>
          {displayLines.map((line, index) => (
            <Text key={index}>{line || ' '}</Text>
          ))}
        </Box>
      )}

      {truncated && expandable && (
        <Text color="gray" dimColor>
          ({remainingLines} more lines)
        </Text>
      )}

      {error && (
        <Box flexDirection="column" marginBottom={1}>
          {errorLines.map((line, index) => (
            <Text key={index} color="red">{line}</Text>
          ))}
        </Box>
      )}

      <Box>
        <Text color={event.exitCode === 0 ? 'green' : 'red'}>
          Exit code: {event.exitCode}
        </Text>
        {showTiming && event.duration !== undefined && (
          <Text color="gray"> | Execution time: {(event.duration / 1000).toFixed(2)}s</Text>
        )}
      </Box>
    </Box>
  );
}