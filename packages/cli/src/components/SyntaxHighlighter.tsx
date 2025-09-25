import React from 'react';
import { Box, Text } from 'ink';

export interface SyntaxHighlighterProps {
  code: string;
  language?: string;
  theme?: 'dark' | 'light' | 'high-contrast';
  showLineNumbers?: boolean;
  startLineNumber?: number;
  tabSize?: number;
  wrap?: boolean;
  width?: number;
  highlightLines?: number[];
  searchTerm?: string;
  showFolding?: boolean;
  showCopyButton?: boolean;
  onCopy?: () => void;
  onLineSelect?: (lineNumber: number) => void;
}

interface TokenType {
  type:
    | 'keyword'
    | 'string'
    | 'number'
    | 'comment'
    | 'operator'
    | 'identifier'
    | 'type'
    | 'builtin'
    | 'plain';
  value: string;
  color?: string;
}

export const SyntaxHighlighter: React.FC<SyntaxHighlighterProps> = ({
  code,
  language,
  theme = 'dark',
  showLineNumbers = false,
  startLineNumber = 1,
  tabSize = 2,
  wrap = false,
  width,
  highlightLines = [],
  searchTerm,
  showFolding = false,
  showCopyButton = false,
  onCopy,
  onLineSelect,
}) => {
  // Handle null/undefined code
  if (code == null) {
    return <Text></Text>;
  }

  const codeString = String(code);

  const detectLanguage = (code: string): string => {
    if (language) return language;

    // Auto-detect language based on patterns
    if (
      code.includes('interface ') ||
      code.includes(': string') ||
      code.includes(': number')
    ) {
      return 'typescript';
    }
    if (
      code.includes('function ') ||
      code.includes('const ') ||
      code.includes('let ') ||
      code.includes('var ')
    ) {
      return 'javascript';
    }
    if (
      code.includes('def ') ||
      code.includes('import ') ||
      code.includes('print(') ||
      code.includes('True') ||
      code.includes('False')
    ) {
      return 'python';
    }
    if (
      code.includes('#!/bin/bash') ||
      code.includes('echo ') ||
      code.includes('ls ')
    ) {
      return 'shell';
    }
    if (code.trim().startsWith('{') || code.trim().startsWith('[')) {
      try {
        JSON.parse(code);
        return 'json';
      } catch {
        // Not valid JSON
      }
    }
    if (
      code.includes('<div') ||
      code.includes('<p>') ||
      code.includes('class=')
    ) {
      return 'html';
    }
    if (
      code.includes('display:') ||
      code.includes('color:') ||
      code.includes('.container')
    ) {
      return 'css';
    }

    return 'plain';
  };

  const getThemeColors = (theme: string) => {
    switch (theme) {
      case 'light':
        return {
          keyword: 'blue',
          string: 'green',
          number: 'magenta',
          comment: 'gray',
          operator: 'red',
          type: 'cyan',
          builtin: 'yellow',
          identifier: 'black',
          plain: 'black',
        };
      case 'high-contrast':
        return {
          keyword: 'white',
          string: 'white',
          number: 'white',
          comment: 'gray',
          operator: 'white',
          type: 'white',
          builtin: 'white',
          identifier: 'white',
          plain: 'white',
        };
      default: // dark
        return {
          keyword: 'blue',
          string: 'green',
          number: 'magenta',
          comment: 'gray',
          operator: 'red',
          type: 'cyan',
          builtin: 'yellow',
          identifier: 'white',
          plain: 'white',
        };
    }
  };

  const tokenizeLine = (line: string, lang: string): React.ReactNode => {
    const colors = getThemeColors(theme);

    // Define language-specific patterns
    const keywords = {
      javascript: [
        'const',
        'let',
        'var',
        'function',
        'if',
        'else',
        'for',
        'while',
        'return',
      ],
      typescript: [
        'const',
        'let',
        'var',
        'function',
        'if',
        'else',
        'for',
        'while',
        'return',
        'interface',
        'type',
      ],
      python: [
        'def',
        'class',
        'if',
        'else',
        'for',
        'while',
        'return',
        'True',
        'False',
      ],
      shell: ['echo', 'ls', 'cd', 'pwd', 'mkdir', 'rm', 'cp', 'mv'],
    };

    const langKeywords = keywords[lang as keyof typeof keywords] || [];

    // Simple highlighting with regex replacement
    let highlightedLine = line;

    // Highlight keywords
    for (const keyword of langKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      highlightedLine = highlightedLine.replace(
        regex,
        `__KEYWORD__${keyword}__END__`
      );
    }

    // Split and render with colors
    const parts = highlightedLine.split(/(__KEYWORD__|__END__)/);
    const rendered: React.ReactNode[] = [];
    let isKeyword = false;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part === '__KEYWORD__') {
        isKeyword = true;
      } else if (part === '__END__') {
        isKeyword = false;
      } else if (part) {
        if (isKeyword) {
          rendered.push(
            <Text key={i} color={colors.keyword}>
              {part}
            </Text>
          );
        } else {
          // Handle strings
          if (part.startsWith('"') && part.endsWith('"')) {
            rendered.push(
              <Text key={i} color={colors.string}>
                {part}
              </Text>
            );
          }
          // Handle numbers
          else if (/^\d+\.?\d*$/.test(part.trim())) {
            rendered.push(
              <Text key={i} color={colors.number}>
                {part}
              </Text>
            );
          }
          // Handle comments
          else if (part.startsWith('//') || part.startsWith('#')) {
            rendered.push(
              <Text key={i} color={colors.comment}>
                {part}
              </Text>
            );
          }
          // Plain text
          else {
            rendered.push(
              <Text key={i} color={colors.plain}>
                {part}
              </Text>
            );
          }
        }
      }
    }

    return rendered.length > 0 ? rendered : line;
  };

  const expandTabs = (text: string, tabSize: number): string => {
    return text.replace(/\t/g, ' '.repeat(tabSize));
  };

  const highlightSearchTerm = (
    text: string,
    searchTerm?: string
  ): React.ReactNode => {
    if (!searchTerm) return text;

    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <Text key={index} backgroundColor="yellow" color="black">
          {part}
        </Text>
      ) : (
        part
      )
    );
  };

  const detectedLanguage = detectLanguage(codeString);
  const lines = codeString.split('\n');
  const maxLineNumber = startLineNumber + lines.length - 1;
  const lineNumberWidth = String(maxLineNumber).length;

  return (
    <Box flexDirection="column">
      {lines.map((line, index) => {
        const lineNumber = startLineNumber + index;
        const isHighlighted = highlightLines.includes(lineNumber);
        const expandedLine = expandTabs(line, tabSize);

        return (
          <Box
            key={index}
            flexDirection="row"
            backgroundColor={isHighlighted ? 'blue' : undefined}
          >
            {showLineNumbers && (
              <Text color="gray">
                {String(lineNumber).padStart(lineNumberWidth)}{' '}
              </Text>
            )}
            <Text>
              {showFolding && line.includes('{') && ' ▼ '}
              {searchTerm
                ? highlightSearchTerm(expandedLine, searchTerm)
                : tokenizeLine(expandedLine, detectedLanguage)}
            </Text>
          </Box>
        );
      })}

      {showCopyButton && (
        <Box marginTop={1}>
          <Text color="gray">Press 'c' to copy</Text>
        </Box>
      )}
    </Box>
  );
};
