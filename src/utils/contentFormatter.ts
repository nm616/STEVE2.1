// Content formatter utility to detect and format structured content
export const formatAIContent = (content: string): string => {
  let formattedContent = content;

  // 1. Detect and format database schemas
  formattedContent = formatDatabaseSchema(formattedContent);
  
  // 2. Detect and format table-like structures
  formattedContent = formatTablesFromPipes(formattedContent);
  
  // 3. Format structured lists
  formattedContent = formatStructuredLists(formattedContent);
  
  // 4. Add proper line breaks for readability
  formattedContent = addProperLineBreaks(formattedContent);

  return formattedContent;
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