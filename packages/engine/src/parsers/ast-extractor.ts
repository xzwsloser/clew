import type {
  CallSiteRecord,
  ImportRecord,
  OutlineNode,
  ReferenceKind,
  SupportedLanguage,
  SymbolKind,
  SymbolRecord,
} from '@clew/shared';
import type { Node as SyntaxNode } from 'web-tree-sitter';
import { extractWithFallback, type ParsedFileArtifacts } from './fallback-extractor.js';
export type { ParsedFileArtifacts } from './fallback-extractor.js';
import { parseSourceTree } from './wasm-loader.js';

interface ExtractionState {
  file: string;
  lines: string[];
  symbols: SymbolRecord[];
  imports: ImportRecord[];
  callSites: CallSiteRecord[];
  outlineRoots: OutlineNode[];
}

function lineSnippet(lines: string[], row: number): string {
  return (lines[row] ?? '').trim().slice(0, 180);
}

function firstChildOfTypes(node: SyntaxNode, types: readonly string[]): SyntaxNode | null {
  for (const child of node.namedChildren) {
    if (types.includes(child.type)) return child;
  }
  return null;
}

function extractDeclaratorName(node: SyntaxNode | null): string | null {
  if (!node) return null;
  if (
    node.type === 'identifier' ||
    node.type === 'type_identifier' ||
    node.type === 'field_identifier' ||
    node.type === 'namespace_identifier'
  ) {
    return node.text;
  }
  if (node.type === 'qualified_identifier' || node.type === 'scoped_identifier') {
    const scope = node.childForFieldName('scope');
    const name = node.childForFieldName('name');
    if (scope && name) return `${scope.text}::${name.text}`;
    return node.text;
  }
  const direct = node.childForFieldName('declarator') ?? node.childForFieldName('name');
  if (direct) return extractDeclaratorName(direct);
  for (const child of node.namedChildren) {
    const found = extractDeclaratorName(child);
    if (found) return found;
  }
  return null;
}

function extractSymbolInfo(
  node: SyntaxNode,
  language: SupportedLanguage,
): { name: string; kind: SymbolKind; exported: boolean; containerOverride?: string } | null {
  switch (node.type) {
    case 'function_definition': {
      if (language === 'c' || language === 'cpp') {
        const declarator = node.childForFieldName('declarator');
        const rawName = extractDeclaratorName(declarator);
        if (!rawName) return null;
        if (rawName.includes('::')) {
          const parts = rawName.split('::');
          const fnName = parts.pop() ?? rawName;
          return {
            name: fnName,
            kind: 'method',
            exported: true,
            containerOverride: parts.join('::'),
          };
        }
        return { name: rawName, kind: 'function', exported: true };
      }
      const nameNode = node.childForFieldName('name') ?? firstChildOfTypes(node, ['identifier']);
      return nameNode ? { name: nameNode.text, kind: 'function', exported: !nameNode.text.startsWith('_') } : null;
    }
    case 'function_declaration':
    case 'generator_function_declaration': {
      const nameNode = node.childForFieldName('name') ?? firstChildOfTypes(node, ['identifier']);
      if (!nameNode) return null;
      return {
        name: nameNode.text,
        kind: 'function',
        exported:
          language === 'go'
            ? /^[A-Z]/.test(nameNode.text)
            : node.parent?.type === 'export_statement',
      };
    }
    case 'method_declaration': {
      const nameNode = node.childForFieldName('name') ?? firstChildOfTypes(node, ['field_identifier', 'identifier']);
      if (!nameNode) return null;
      let receiver: string | undefined;
      const recv = node.childForFieldName('receiver');
      if (recv) {
        const typeNode = firstChildOfTypes(recv, ['parameter_declaration']);
        const typeIdent = typeNode ? extractDeclaratorName(typeNode.childForFieldName('type')) : null;
        if (typeIdent) receiver = typeIdent;
      }
      return {
        name: nameNode.text,
        kind: 'method',
        exported: /^[A-Z]/.test(nameNode.text),
        containerOverride: receiver,
      };
    }
    case 'method_definition': {
      const nameNode = node.childForFieldName('name') ?? firstChildOfTypes(node, ['property_identifier']);
      return nameNode ? { name: nameNode.text, kind: 'method', exported: true } : null;
    }
    case 'class_definition':
    case 'class_declaration':
    case 'class_specifier': {
      const nameNode =
        node.childForFieldName('name') ?? firstChildOfTypes(node, ['identifier', 'type_identifier']);
      if (!nameNode) return null;
      return {
        name: nameNode.text,
        kind: 'class',
        exported:
          language === 'python'
            ? !nameNode.text.startsWith('_')
            : node.parent?.type === 'export_statement' || language === 'cpp',
      };
    }
    case 'struct_specifier':
    case 'struct_item': {
      const nameNode = node.childForFieldName('name') ?? firstChildOfTypes(node, ['type_identifier']);
      if (!nameNode) return null;
      return { name: nameNode.text, kind: 'struct', exported: node.text.startsWith('pub ') || language !== 'rust' };
    }
    case 'interface_declaration':
    case 'trait_item': {
      const nameNode = node.childForFieldName('name') ?? firstChildOfTypes(node, ['type_identifier']);
      if (!nameNode) return null;
      return {
        name: nameNode.text,
        kind: node.type === 'trait_item' ? 'trait' : 'interface',
        exported: true,
      };
    }
    case 'enum_declaration':
    case 'enum_item':
    case 'enum_specifier': {
      const nameNode =
        node.childForFieldName('name') ?? firstChildOfTypes(node, ['identifier', 'type_identifier']);
      return nameNode ? { name: nameNode.text, kind: 'enum', exported: true } : null;
    }
    case 'type_alias_declaration':
    case 'type_item':
    case 'type_spec': {
      const nameNode = node.childForFieldName('name') ?? firstChildOfTypes(node, ['type_identifier']);
      if (!nameNode) return null;
      const isStruct = Boolean(firstChildOfTypes(node, ['struct_type']));
      const isIface = Boolean(firstChildOfTypes(node, ['interface_type']));
      return {
        name: nameNode.text,
        kind: isStruct ? 'struct' : isIface ? 'interface' : 'type',
        exported: language === 'go' ? /^[A-Z]/.test(nameNode.text) : true,
      };
    }
    case 'function_item':
    case 'function_signature_item': {
      const nameNode = node.childForFieldName('name') ?? firstChildOfTypes(node, ['identifier']);
      if (!nameNode) return null;
      return {
        name: nameNode.text,
        kind: 'function',
        exported: node.text.startsWith('pub '),
      };
    }
    case 'impl_item': {
      const typeNode = node.childForFieldName('type') ?? firstChildOfTypes(node, ['type_identifier']);
      return typeNode ? { name: `impl ${typeNode.text}`, kind: 'module', exported: false } : null;
    }
    case 'namespace_definition':
    case 'mod_item': {
      const nameNode =
        node.childForFieldName('name') ??
        firstChildOfTypes(node, ['namespace_identifier', 'identifier']);
      return nameNode ? { name: nameNode.text, kind: 'module', exported: true } : null;
    }
    case 'lexical_declaration':
    case 'variable_declaration': {
      if (language !== 'typescript' && language !== 'javascript') return null;
      const decl = firstChildOfTypes(node, ['variable_declarator']);
      const nameNode = decl?.childForFieldName('name');
      const valNode = decl?.childForFieldName('value');
      if (!nameNode || !valNode) return null;
      if (valNode.type === 'arrow_function' || valNode.type === 'function_expression') {
        return {
          name: nameNode.text,
          kind: 'function',
          exported: node.parent?.type === 'export_statement',
        };
      }
      return null;
    }
    default:
      return null;
  }
}

function extractImportRecord(node: SyntaxNode, file: string, language: SupportedLanguage): ImportRecord[] {
  const line = node.startPosition.row + 1;
  if (language === 'python') {
    if (node.type === 'import_statement') {
      return node.namedChildren
        .filter((c) => c.type === 'dotted_name' || c.type === 'aliased_import')
        .map((c) => ({
          file,
          specifier: c.text.split(/\s+as\s+/)[0]?.trim() ?? c.text,
          importedNames: [c.text.split(/\s+as\s+/).pop()?.trim() ?? c.text],
          isWildcard: false,
          line,
        }));
    }
    if (node.type === 'import_from_statement') {
      const moduleNode = node.childForFieldName('module_name') ?? firstChildOfTypes(node, ['dotted_name', 'relative_import']);
      const specifier = moduleNode?.text ?? '';
      const importedNames = node.namedChildren
        .filter((c) => c !== moduleNode)
        .map((c) => c.text.split(/\s+as\s+/)[0]?.trim() ?? c.text)
        .filter(Boolean);
      return specifier
        ? [{ file, specifier, importedNames, isWildcard: node.text.includes('*'), line }]
        : [];
    }
  }

  if ((language === 'c' || language === 'cpp') && node.type === 'preproc_include') {
    const pathNode = node.childForFieldName('path') ?? firstChildOfTypes(node, ['string_literal', 'system_lib_string']);
    if (!pathNode) return [];
    const specifier = pathNode.text.replace(/^[<"]|[>"]$/g, '');
    return [{ file, specifier, importedNames: [], isWildcard: false, line }];
  }

  if (language === 'go' && node.type === 'import_declaration') {
    const specs: ImportRecord[] = [];
    const collect = (cur: SyntaxNode) => {
      if (cur.type === 'import_spec') {
        const pathNode = cur.childForFieldName('path') ?? firstChildOfTypes(cur, ['interpreted_string_literal']);
        if (pathNode) {
          const specifier = pathNode.text.replaceAll('"', '');
          specs.push({ file, specifier, importedNames: [], isWildcard: false, line: cur.startPosition.row + 1 });
        }
        return;
      }
      for (const child of cur.namedChildren) collect(child);
    };
    collect(node);
    return specs;
  }

  if (language === 'rust' && node.type === 'use_declaration') {
    const arg = node.childForFieldName('argument') ?? node.namedChildren[0];
    if (!arg) return [];
    const clean = arg.text.replace(/;$/, '').trim();
    const parts = clean.split('::');
    const last = parts[parts.length - 1] ?? clean;
    return [
      {
        file,
        specifier: clean,
        importedNames: last === '*' ? [] : [last.replace(/[{}]/g, '').trim()],
        isWildcard: clean.includes('*'),
        line,
      },
    ];
  }

  if ((language === 'typescript' || language === 'javascript') && node.type === 'import_statement') {
    const srcNode = node.childForFieldName('source') ?? firstChildOfTypes(node, ['string']);
    if (!srcNode) return [];
    const specifier = srcNode.text.replace(/^['"]|['"]$/g, '');
    const names: string[] = [];
    const collectNames = (cur: SyntaxNode) => {
      if (cur.type === 'import_specifier') {
        const n = cur.childForFieldName('name') ?? cur.namedChildren[0];
        if (n) names.push(n.text);
        return;
      }
      if (cur.type === 'identifier' && cur.parent?.type === 'import_clause') {
        names.push(cur.text);
        return;
      }
      for (const c of cur.namedChildren) collectNames(c);
    };
    collectNames(node);
    return [{ file, specifier, importedNames: names, isWildcard: node.text.includes('* as '), line }];
  }

  return [];
}

function extractCallName(node: SyntaxNode): { calleeName: string; qualifier?: string } | null {
  const fnNode = node.childForFieldName('function') ?? node.namedChildren[0];
  if (!fnNode) return null;

  if (fnNode.type === 'identifier' || fnNode.type === 'type_identifier') {
    return { calleeName: fnNode.text };
  }
  if (
    fnNode.type === 'attribute' ||
    fnNode.type === 'member_expression' ||
    fnNode.type === 'selector_expression' ||
    fnNode.type === 'field_expression' ||
    fnNode.type === 'scoped_identifier'
  ) {
    const prop =
      fnNode.childForFieldName('attribute') ??
      fnNode.childForFieldName('property') ??
      fnNode.childForFieldName('field') ??
      fnNode.childForFieldName('name') ??
      fnNode.namedChildren[fnNode.namedChildren.length - 1];
    const obj =
      fnNode.childForFieldName('object') ??
      fnNode.childForFieldName('operand') ??
      fnNode.childForFieldName('argument') ??
      fnNode.childForFieldName('path') ??
      fnNode.namedChildren[0];
    if (!prop) return null;
    return {
      calleeName: prop.text,
      qualifier: obj && obj !== prop ? obj.text : undefined,
    };
  }
  return null;
}

/**
 * Parse a source file with WASM Tree-sitter (falling back gracefully to regex heuristics when unavailable).
 */
export async function parseSourceFile(
  file: string,
  content: string,
  language: SupportedLanguage,
): Promise<ParsedFileArtifacts> {
  const parsed = await parseSourceTree(content, language, file);
  if (!parsed) {
    return extractWithFallback(file, content, language);
  }

  const lines = content.split(/\r?\n/);
  const state: ExtractionState = {
    file,
    lines,
    symbols: [],
    imports: [],
    callSites: [],
    outlineRoots: [],
  };

  function visit(
    node: SyntaxNode,
    containerStack: SymbolRecord[],
    outlineParentChildren: OutlineNode[],
  ): void {
    const imports = extractImportRecord(node, file, language);
    if (imports.length > 0) {
      state.imports.push(...imports);
    }

    if (
      node.type === 'call' ||
      node.type === 'call_expression' ||
      node.type === 'new_expression' ||
      node.type === 'macro_invocation'
    ) {
      const callInfo: { calleeName: string; qualifier?: string } | null =
        node.type === 'macro_invocation'
          ? (() => {
              const mac = node.childForFieldName('macro') ?? node.namedChildren[0];
              return mac ? { calleeName: mac.text } : null;
            })()
          : extractCallName(node);

      if (callInfo) {
        const enclosing = containerStack[containerStack.length - 1];
        state.callSites.push({
          file,
          callerSymbolId: enclosing?.id,
          callerName: enclosing?.qualifiedName,
          calleeName: callInfo.calleeName,
          qualifier: callInfo.qualifier,
          line: node.startPosition.row + 1,
          column: node.startPosition.column,
          snippet: lineSnippet(lines, node.startPosition.row),
        });
      }
    }

    const symInfo = extractSymbolInfo(node, language);
    let nextStack = containerStack;
    let nextOutlineChildren = outlineParentChildren;

    if (symInfo) {
      const container = symInfo.containerOverride ?? containerStack[containerStack.length - 1]?.qualifiedName;
      const qualifiedName = container ? `${container}.${symInfo.name}` : symInfo.name;
      const startLine = node.startPosition.row + 1;
      const endLine = node.endPosition.row + 1;
      const id = `${file}::${qualifiedName}@${startLine}`;

      const record: SymbolRecord = {
        id,
        name: symInfo.name,
        qualifiedName,
        kind: symInfo.kind,
        file,
        startLine,
        endLine,
        startColumn: node.startPosition.column,
        signature: lineSnippet(lines, node.startPosition.row),
        containerName: container,
        exported: symInfo.exported,
      };
      state.symbols.push(record);

      const outlineNode: OutlineNode = {
        symbolId: id,
        name: symInfo.name,
        kind: symInfo.kind,
        startLine,
        endLine,
        children: [],
      };
      outlineParentChildren.push(outlineNode);
      nextStack = [...containerStack, record];
      nextOutlineChildren = outlineNode.children;
    }

    for (const child of node.namedChildren) {
      visit(child, nextStack, nextOutlineChildren);
    }
  }

  try {
    visit(parsed.tree.rootNode, [], state.outlineRoots);
  } finally {
    parsed.tree.delete();
  }

  return {
    file,
    language,
    astParsed: true,
    symbols: state.symbols,
    imports: state.imports,
    callSites: state.callSites,
    outline: state.outlineRoots,
  };
}

const COMMENT_OR_STRING_TYPES = new Set([
  'comment',
  'line_comment',
  'block_comment',
  'string',
  'string_literal',
  'string_content',
  'string_fragment',
  'interpreted_string_literal',
  'raw_string_literal',
  'template_string',
]);

/**
 * Inspect AST context at a 1-based `(line, column)` to filter comment/string false positives in Find References.
 */
export async function classifyPositionsWithAst(
  file: string,
  content: string,
  language: SupportedLanguage,
  positions: Array<{ line: number; column: number }>,
): Promise<Array<{ include: boolean; kind: ReferenceKind; astFiltered: boolean }>> {
  const parsed = await parseSourceTree(content, language, file);
  if (!parsed) {
    return positions.map(() => ({ include: true, kind: 'reference', astFiltered: false }));
  }

  try {
    const root = parsed.tree.rootNode;
    return positions.map(({ line, column }) => {
      const point = { row: Math.max(0, line - 1), column: Math.max(0, column - 1) };
      const node: SyntaxNode | null = root.descendantForPosition(point);
      if (!node) {
        return { include: true, kind: 'reference', astFiltered: true };
      }

      let cur: SyntaxNode | null = node;
      let isCall = false;
      let isImport = false;
      let isDecl = false;

      while (cur) {
        if (COMMENT_OR_STRING_TYPES.has(cur.type)) {
          return { include: false, kind: 'reference', astFiltered: true };
        }
        if (
          cur.type === 'call' ||
          cur.type === 'call_expression' ||
          cur.type === 'new_expression'
        ) {
          isCall = true;
        }
        if (
          cur.type === 'import_statement' ||
          cur.type === 'import_from_statement' ||
          cur.type === 'use_declaration' ||
          cur.type === 'import_declaration' ||
          cur.type === 'preproc_include'
        ) {
          isImport = true;
        }
        if (
          (cur.type.includes('declaration') ||
            cur.type.includes('definition') ||
            cur.type.endsWith('_item') ||
            cur.type.endsWith('_specifier')) &&
          cur.childForFieldName('name')?.id === node.id
        ) {
          isDecl = true;
        }
        cur = cur.parent;
      }

      const kind: ReferenceKind = isImport
        ? 'import'
        : isDecl
          ? 'declaration'
          : isCall
            ? 'call'
            : 'reference';
      return { include: true, kind, astFiltered: true };
    });
  } finally {
    parsed.tree.delete();
  }
}
