// Content formatter utility to detect and format structured content
export const formatAIContent = (content: string): string => {
  let formattedContent = content;

  // 1. Auto-detect and wrap code blocks (MOST IMPORTANT - run first)
  formattedContent = autoDetectAndWrapCode(formattedContent);

  // 2. Complete incomplete markdown syntax during streaming
  formattedContent = completeIncompleteMarkdown(formattedContent);

  // 3. Detect and format database schemas
  formattedContent = formatDatabaseSchema(formattedContent);

  // 4. Detect and format table-like structures
  formattedContent = formatTablesFromPipes(formattedContent);

  // 5. Format structured lists
  formattedContent = formatStructuredLists(formattedContent);

  // 6. Add proper line breaks for readability
  formattedContent = addProperLineBreaks(formattedContent);

  return formattedContent;
};

// Auto-detect code blocks and wrap them in markdown code fences
const autoDetectAndWrapCode = (content: string): string => {
  // Skip if already has code blocks
  if (content.includes('```')) {
    return content;
  }

  const lines = content.split('\n');
  const result: string[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let detectedLanguage = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect if this line looks like code
    const isCodeLine =
      // Common code patterns
      /^(const|let|var|function|class|import|export|return|if|for|while|async|await)\s/.test(trimmed) ||
      /^(def|class|import|from|return|if|for|while|async|await)\s/.test(trimmed) || // Python
      /^(public|private|protected|static|void|int|String)\s/.test(trimmed) || // Java/C#
      /^(func|var|let|const|import|package|type|struct)\s/.test(trimmed) || // Go/Swift
      /^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s/i.test(trimmed) || // SQL
      // Brackets and special characters common in code
      /^[\{\}\[\]\(\)]$/.test(trimmed) ||
      /^.*[{};]$/.test(trimmed) && !trimmed.endsWith(':') ||
      // Indented lines (4+ spaces or tab)
      /^(    |\t)/.test(line) && trimmed.length > 0 ||
      // Function calls and assignments
      /^[\w]+\s*=\s*/.test(trimmed) && !trimmed.includes(' ') ||
      /^[\w]+\(.*\)/.test(trimmed) ||
      // JSX/HTML tags
      /^<[\w]+.*>/.test(trimmed) && /.*<\/[\w]+>$/.test(trimmed);

    if (isCodeLine && !inCodeBlock) {
      // Start code block
      inCodeBlock = true;
      codeBlockLines = [line];
      detectedLanguage = detectLanguage(line);
    } else if (isCodeLine && inCodeBlock) {
      // Continue code block
      codeBlockLines.push(line);
    } else if (!isCodeLine && inCodeBlock) {
      // Check if next few lines are also code (avoid breaking blocks)
      let foundMoreCode = false;
      for (let j = i; j < Math.min(i + 2, lines.length); j++) {
        const nextTrimmed = lines[j].trim();
        if (nextTrimmed.length > 0 && /^(    |\t)/.test(lines[j])) {
          foundMoreCode = true;
          break;
        }
      }

      if (!foundMoreCode && codeBlockLines.length > 2) {
        // End code block and output
        result.push('```' + detectedLanguage);
        result.push(...codeBlockLines);
        result.push('```');
        result.push('');
        inCodeBlock = false;
        codeBlockLines = [];
      }
      result.push(line);
    } else {
      // Regular text line
      result.push(line);
    }
  }

  // Close any open code block at end
  if (inCodeBlock && codeBlockLines.length > 2) {
    result.push('```' + detectedLanguage);
    result.push(...codeBlockLines);
    result.push('```');
  }

  return result.join('\n');
};

// Detect programming language from code content
const detectLanguage = (line: string): string => {
  const trimmed = line.trim();

  // JavaScript/TypeScript
  if (/^(const|let|var|function|class|import|export|async|await|=>)/.test(trimmed)) {
    return 'javascript';
  }
  // Python
  if (/^(def|class|import|from|print|if __name__)/.test(trimmed)) {
    return 'python';
  }
  // Java/C#
  if (/^(public|private|protected|static|void|int|String|class)/.test(trimmed)) {
    return 'java';
  }
  // SQL
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)/i.test(trimmed)) {
    return 'sql';
  }
  // JSX/TSX
  if (/<[\w]+.*>/.test(trimmed) && /.*<\/[\w]+>/.test(trimmed)) {
    return 'jsx';
  }

  return ''; // No language specified
};

// Complete incomplete markdown syntax for streaming
const completeIncompleteMarkdown = (content: string): string => {
  let result = content;

  // Complete unclosed bold
  const boldCount = (content.match(/\*\*/g) || []).length;
  if (boldCount % 2 !== 0) {
    result += '**';
  }

  // Complete unclosed italic
  const italicCount = (content.match(/(?<!\*)\*(?!\*)/g) || []).length;
  if (italicCount % 2 !== 0) {
    result += '*';
  }

  // Complete unclosed inline code
  const backtickCount = (content.match(/`/g) || []).length;
  if (backtickCount % 2 !== 0) {
    result += '`';
  }

  // Complete unclosed code blocks
  const codeBlockCount = (content.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) {
    result += '\n```';
  }

  return result;
};

// Format database schema patterns
const formatDatabaseSchema = (content: string): string => {
  // Pattern: "TABLE: table_name COLUMNS: - column1 | type | nullable..."
  const schemaPattern = /(TABLE:\s*\w+\s*COLUMNS:\s*(?:- \w+[^\n]*\n?)+)/gi;
  
  return content.replace(schemaPattern, (match) => {
    const lines = match.split('\n');
    const formattedLines = lines.map(line => {
      if (line.includes('TABLE:')) {
        return `## ${line}`;
      } else if (line.includes('COLUMNS:')) {
        return `\n${line}\n`;
      } else if (line.trim().startsWith('-') && line.includes('|')) {
        // Format column definitions as a table row
        const parts = line.replace(/^-\s*/, '').split('|').map(p => p.trim());
        return `| ${parts.join(' | ')} |`;
      }
      return line;
    });
    
    // Add table header if we have column definitions
    if (formattedLines.some(line => line.includes('|'))) {
      const firstTableRow = formattedLines.findIndex(line => line.includes('|'));
      if (firstTableRow > -1) {
        const headerCount = formattedLines[firstTableRow].split('|').length - 2;
        const separator = '|' + ' --- |'.repeat(headerCount);
        formattedLines.splice(firstTableRow + 1, 0, separator);
        formattedLines[firstTableRow] = formattedLines[firstTableRow].replace(/^\|/, '| **Column** |');
      }
    }
    
    return '\n```\n' + formattedLines.join('\n') + '\n```\n';
  });
};

// Format pipe-separated content into markdown tables
const formatTablesFromPipes = (content: string): string => {
  // Look for lines with multiple pipes that could be table data
  const lines = content.split('\n');
  const formattedLines: string[] = [];
  let inTable = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const pipeCount = (line.match(/\|/g) || []).length;
    
    // If line has 2+ pipes and looks like tabular data
    if (pipeCount >= 2 && !line.includes('```') && !inTable) {
      // Start a table
      inTable = true;
      formattedLines.push('\n');
      formattedLines.push(line);
      
      // Add table header separator
      const cellCount = pipeCount + 1;
      const separator = '|' + ' --- |'.repeat(cellCount - 1);
      formattedLines.push(separator);
    } else if (pipeCount >= 2 && inTable) {
      // Continue table
      formattedLines.push(line);
    } else {
      // End table if we were in one
      if (inTable) {
        formattedLines.push('\n');
        inTable = false;
      }
      formattedLines.push(line);
    }
  }
  
  return formattedLines.join('\n');
};

// Format structured lists (detect patterns like "Field Name: value")
const formatStructuredLists = (content: string): string => {
  // Pattern: multiple lines with "Key: Value" or "- Key: Value"
  const lines = content.split('\n');
  const formattedLines: string[] = [];
  
  for (const line of lines) {
    // If line looks like a field definition
    if (/^\s*-?\s*\w+[\w\s]*:\s*.+/.test(line) && !line.includes('```')) {
      const formatted = line.replace(/^\s*-?\s*/, '- **').replace(':', ':**');
      formattedLines.push(formatted);
    } else {
      formattedLines.push(line);
    }
  }
  
  return formattedLines.join('\n');
};

// Add proper line breaks for readability
const addProperLineBreaks = (content: string): string => {
  return content
    // Add space around headers
    .replace(/^(#{1,6}\s+.*$)/gm, '\n$1\n')
    // Add space around code blocks
    .replace(/^```/gm, '\n```')
    .replace(/```$/gm, '```\n')
    // Clean up multiple consecutive newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};