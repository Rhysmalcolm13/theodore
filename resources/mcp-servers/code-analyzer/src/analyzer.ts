import * as ts from "typescript";
import { parse as parseJS } from "@babel/parser";
import traverse from "@babel/traverse";
import { Node } from "@babel/types";

interface MethodInfo {
  name: string;
  params: string[];
  returnType?: string;
  async: boolean;
  generator: boolean;
  visibility?: 'public' | 'private' | 'protected';
}

interface PropertyInfo {
  name: string;
  type?: string;
  visibility?: 'public' | 'private' | 'protected';
}

interface ClassInfo {
  name: string;
  methods: MethodInfo[];
  properties: PropertyInfo[];
}

interface AnalysisResult {
  imports: string[];
  exports: string[];
  functions: {
    name: string;
    params: string[];
    returnType?: string;
    async: boolean;
    generator: boolean;
  }[];
  classes: {
    name: string;
    methods: {
      name: string;
      params: string[];
      returnType?: string;
      async: boolean;
      generator: boolean;
      visibility?: "public" | "private" | "protected";
    }[];
    properties: {
      name: string;
      type?: string;
      visibility?: "public" | "private" | "protected";
    }[];
  }[];
  interfaces: {
    name: string;
    properties: {
      name: string;
      type: string;
      optional: boolean;
    }[];
    methods: {
      name: string;
      params: string[];
      returnType: string;
      optional: boolean;
    }[];
  }[];
}

export class CodeAnalyzer {
  async analyzeTypeScript(content: string, filePath: string): Promise<AnalysisResult> {
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const result: AnalysisResult = {
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      interfaces: []
    };

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const importPath = (node.moduleSpecifier as ts.StringLiteral).text;
        result.imports.push(importPath);
      }

      if (ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier) {
          result.exports.push((node.moduleSpecifier as ts.StringLiteral).text);
        }
      }

      if (ts.isFunctionDeclaration(node)) {
        if (node.name) {
          result.functions.push({
            name: node.name.text,
            params: node.parameters.map(p => p.name.getText()),
            returnType: node.type ? node.type.getText() : undefined,
            async: node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false,
            generator: node.asteriskToken !== undefined
          });
        }
      }

      if (ts.isClassDeclaration(node)) {
        if (node.name) {
          const classInfo = {
            name: node.name.text,
            methods: [] as AnalysisResult["classes"][0]["methods"],
            properties: [] as AnalysisResult["classes"][0]["properties"]
          };

          node.members.forEach(member => {
            if (ts.isMethodDeclaration(member)) {
              if (member.name) {
                classInfo.methods.push({
                  name: member.name.getText(),
                  params: member.parameters.map(p => p.name.getText()),
                  returnType: member.type ? member.type.getText() : undefined,
                  async: member.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false,
                  generator: member.asteriskToken !== undefined,
                  visibility: this.getVisibility(member)
                });
              }
            } else if (ts.isPropertyDeclaration(member)) {
              if (member.name) {
                classInfo.properties.push({
                  name: member.name.getText(),
                  type: member.type ? member.type.getText() : undefined,
                  visibility: this.getVisibility(member)
                });
              }
            }
          });

          result.classes.push(classInfo);
        }
      }

      if (ts.isInterfaceDeclaration(node)) {
        if (node.name) {
          const interfaceInfo = {
            name: node.name.text,
            properties: [] as AnalysisResult["interfaces"][0]["properties"],
            methods: [] as AnalysisResult["interfaces"][0]["methods"]
          };

          node.members.forEach(member => {
            if (ts.isPropertySignature(member)) {
              if (member.name) {
                interfaceInfo.properties.push({
                  name: member.name.getText(),
                  type: member.type ? member.type.getText() : "any",
                  optional: member.questionToken !== undefined
                });
              }
            } else if (ts.isMethodSignature(member)) {
              if (member.name) {
                interfaceInfo.methods.push({
                  name: member.name.getText(),
                  params: member.parameters.map(p => p.name.getText()),
                  returnType: member.type ? member.type.getText() : "any",
                  optional: member.questionToken !== undefined
                });
              }
            }
          });

          result.interfaces.push(interfaceInfo);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return result;
  }

  async analyzeJavaScript(content: string, filePath: string): Promise<AnalysisResult> {
    const ast = parseJS(content, {
      sourceType: "module",
      plugins: ["jsx", "typescript", "classProperties"]
    });

    const result: AnalysisResult = {
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      interfaces: []
    };

    traverse(ast, {
      ImportDeclaration(path) {
        result.imports.push(path.node.source.value);
      },

      ExportNamedDeclaration(path) {
        if (path.node.source) {
          result.exports.push(path.node.source.value);
        }
        if (path.node.specifiers && path.node.specifiers.length > 0) {
          path.node.specifiers.forEach((specifier: any) => {
            if (specifier.exported && specifier.local && specifier.local.name === specifier.exported.name) {
              // Skip adding the local name if it's the same as the exported name
              return;
            }
            if (specifier.exported) {
              result.exports.push(specifier.exported.name);
            }
          });
        }
      },

      ExportAllDeclaration(path) {
        if (path.node.source) {
          result.exports.push(path.node.source.value);
        }
      },

      ExportDefaultDeclaration(path: any) {
        const declaration = path.node.declaration;
        if (declaration.type === 'Identifier') {
          result.exports.push(declaration.name);
        }
      },

      FunctionDeclaration(path) {
        if (path.node.id) {
          result.functions.push({
            name: path.node.id.name,
            params: path.node.params.map(p => (p as any).name),
            async: path.node.async,
            generator: path.node.generator
          });
        }
      },

      ClassDeclaration(path) {
        if (path.node.id) {
          const classInfo = {
            name: path.node.id.name,
            methods: [] as MethodInfo[],
            properties: [] as PropertyInfo[]
          };

          path.node.body.body.forEach((member: any) => {
            if (member.type === 'ClassMethod' && member.kind !== 'constructor') {
              classInfo.methods.push({
                name: member.key.name,
                params: member.params.map((p: any) => p.name),
                async: member.async,
                generator: member.generator
              });
            } else if (member.type === 'ClassProperty') {
              classInfo.properties.push({
                name: member.key.name
              });
            }
          });

          result.classes.push(classInfo);
        }
      }
    });

    return result;
  }

  private getVisibility(member: ts.MethodDeclaration | ts.PropertyDeclaration): "public" | "private" | "protected" | undefined {
    if (member.modifiers) {
      if (member.modifiers.some(m => m.kind === ts.SyntaxKind.PrivateKeyword)) {
        return "private";
      }
      if (member.modifiers.some(m => m.kind === ts.SyntaxKind.ProtectedKeyword)) {
        return "protected";
      }
      if (member.modifiers.some(m => m.kind === ts.SyntaxKind.PublicKeyword)) {
        return "public";
      }
    }
    return undefined;
  }

  formatAnalysis(analysis: AnalysisResult): string {
    const lines: string[] = [];

    if (analysis.imports.length > 0) {
      lines.push("Imports:");
      analysis.imports.forEach(imp => lines.push(`  ${imp}`));
      lines.push("");
    }

    if (analysis.exports.length > 0) {
      lines.push("Exports:");
      analysis.exports.forEach(exp => lines.push(`  ${exp}`));
      lines.push("");
    }

    if (analysis.functions.length > 0) {
      lines.push("Functions:");
      analysis.functions.forEach(func => {
        const modifiers: string[] = [];
        if (func.async) modifiers.push("async");
        if (func.generator) modifiers.push("generator");
        const modifierStr = modifiers.length > 0 ? `${modifiers.join(" ")} ` : "";
        
        lines.push(`  ${modifierStr}${func.name}(${func.params.join(", ")})${
          func.returnType ? `: ${func.returnType}` : ""
        }`);
      });
      lines.push("");
    }

    if (analysis.classes.length > 0) {
      lines.push("Classes:");
      analysis.classes.forEach(cls => {
        lines.push(`  class ${cls.name} {`);
        
        cls.properties.forEach(prop => {
          const visibility = prop.visibility ? `${prop.visibility} ` : "";
          lines.push(`    ${visibility}${prop.name}${prop.type ? `: ${prop.type}` : ""}`);
        });
        
        cls.methods.forEach(method => {
          const modifiers: string[] = [];
          if (method.visibility) modifiers.push(method.visibility);
          if (method.async) modifiers.push("async");
          if (method.generator) modifiers.push("generator");
          const modifierStr = modifiers.length > 0 ? `${modifiers.join(" ")} ` : "";
          
          lines.push(`    ${modifierStr}${method.name}(${method.params.join(", ")})${
            method.returnType ? `: ${method.returnType}` : ""
          }`);
        });
        
        lines.push("  }");
        lines.push("");
      });
    }

    if (analysis.interfaces.length > 0) {
      lines.push("Interfaces:");
      analysis.interfaces.forEach(iface => {
        lines.push(`  interface ${iface.name} {`);
        
        iface.properties.forEach(prop => {
          lines.push(`    ${prop.name}${prop.optional ? "?" : ""}: ${prop.type}`);
        });
        
        iface.methods.forEach(method => {
          lines.push(`    ${method.name}${method.optional ? "?" : ""}(${method.params.join(", ")}): ${
            method.returnType
          }`);
        });
        
        lines.push("  }");
        lines.push("");
      });
    }

    return lines.join("\n");
  }

  private async analyzeJavaScriptClasses(ast: any): Promise<ClassInfo[]> {
    const classes: ClassInfo[] = [];
    traverse(ast, {
      ClassDeclaration(path: any) {
        const methods: MethodInfo[] = [];
        const properties: PropertyInfo[] = [];
        
        path.node.body.body.forEach((member: any) => {
          if (member.type === 'ClassMethod' && member.kind !== 'constructor') {
            methods.push({
              name: member.key.name,
              params: member.params.map((param: any) => param.name),
              async: member.async,
              generator: member.generator
            });
          } else if (member.type === 'ClassProperty') {
            properties.push({
              name: member.key.name
            });
          }
        });
        
        classes.push({
          name: path.node.id.name,
          methods,
          properties
        });
      }
    });
    return classes;
  }
} 