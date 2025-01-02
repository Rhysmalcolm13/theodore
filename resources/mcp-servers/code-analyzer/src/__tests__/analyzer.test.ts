import { CodeAnalyzer } from "../analyzer";

describe("CodeAnalyzer", () => {
  let analyzer: CodeAnalyzer;

  beforeEach(() => {
    analyzer = new CodeAnalyzer();
  });

  describe("analyzeTypeScript", () => {
    it("should analyze imports", async () => {
      const code = `
        import { foo } from './foo';
        import * as bar from 'bar';
        import baz from '../baz';
      `;

      const result = await analyzer.analyzeTypeScript(code, "test.ts");

      expect(result.imports).toEqual(["./foo", "bar", "../baz"]);
    });

    it("should analyze exports", async () => {
      const code = `
        export { foo } from './foo';
        export * from 'bar';
      `;

      const result = await analyzer.analyzeTypeScript(code, "test.ts");

      expect(result.exports).toEqual(["./foo", "bar"]);
    });

    it("should analyze functions", async () => {
      const code = `
        function basic() {}
        async function asyncFn(param1: string, param2: number): Promise<void> {}
        function* generator() {}
      `;

      const result = await analyzer.analyzeTypeScript(code, "test.ts");

      expect(result.functions).toHaveLength(3);
      expect(result.functions[0]).toEqual({
        name: "basic",
        params: [],
        async: false,
        generator: false
      });
      expect(result.functions[1]).toEqual({
        name: "asyncFn",
        params: ["param1", "param2"],
        returnType: "Promise<void>",
        async: true,
        generator: false
      });
      expect(result.functions[2]).toEqual({
        name: "generator",
        params: [],
        async: false,
        generator: true
      });
    });

    it("should analyze classes", async () => {
      const code = `
        class TestClass {
          private prop1: string;
          public prop2: number;
          protected prop3: boolean;

          constructor(param: string) {}

          private method1() {}
          public async method2(param: number): Promise<void> {}
          protected *method3() {}
        }
      `;

      const result = await analyzer.analyzeTypeScript(code, "test.ts");

      expect(result.classes).toHaveLength(1);
      expect(result.classes[0].name).toBe("TestClass");
      expect(result.classes[0].properties).toHaveLength(3);
      expect(result.classes[0].methods).toHaveLength(3);

      // Check properties
      expect(result.classes[0].properties).toContainEqual({
        name: "prop1",
        type: "string",
        visibility: "private"
      });
      expect(result.classes[0].properties).toContainEqual({
        name: "prop2",
        type: "number",
        visibility: "public"
      });
      expect(result.classes[0].properties).toContainEqual({
        name: "prop3",
        type: "boolean",
        visibility: "protected"
      });

      // Check methods
      expect(result.classes[0].methods).toContainEqual({
        name: "method1",
        params: [],
        async: false,
        generator: false,
        visibility: "private"
      });
      expect(result.classes[0].methods).toContainEqual({
        name: "method2",
        params: ["param"],
        returnType: "Promise<void>",
        async: true,
        generator: false,
        visibility: "public"
      });
      expect(result.classes[0].methods).toContainEqual({
        name: "method3",
        params: [],
        async: false,
        generator: true,
        visibility: "protected"
      });
    });

    it("should analyze interfaces", async () => {
      const code = `
        interface TestInterface {
          prop1: string;
          prop2?: number;
          method1(): void;
          method2?(param: string): Promise<boolean>;
        }
      `;

      const result = await analyzer.analyzeTypeScript(code, "test.ts");

      expect(result.interfaces).toHaveLength(1);
      expect(result.interfaces[0].name).toBe("TestInterface");
      expect(result.interfaces[0].properties).toHaveLength(2);
      expect(result.interfaces[0].methods).toHaveLength(2);

      // Check properties
      expect(result.interfaces[0].properties).toContainEqual({
        name: "prop1",
        type: "string",
        optional: false
      });
      expect(result.interfaces[0].properties).toContainEqual({
        name: "prop2",
        type: "number",
        optional: true
      });

      // Check methods
      expect(result.interfaces[0].methods).toContainEqual({
        name: "method1",
        params: [],
        returnType: "void",
        optional: false
      });
      expect(result.interfaces[0].methods).toContainEqual({
        name: "method2",
        params: ["param"],
        returnType: "Promise<boolean>",
        optional: true
      });
    });
  });

  describe("analyzeJavaScript", () => {
    it("should analyze imports", async () => {
      const code = `
        import { foo } from './foo';
        import * as bar from 'bar';
        import baz from '../baz';
      `;

      const result = await analyzer.analyzeJavaScript(code, "test.js");

      expect(result.imports).toEqual(["./foo", "bar", "../baz"]);
    });

    it("should analyze exports", async () => {
      const code = `
        export { foo } from './foo';
        export * from 'bar';
      `;

      const result = await analyzer.analyzeJavaScript(code, "test.js");

      expect(result.exports).toEqual(["./foo", "bar"]);
    });

    it("should analyze functions", async () => {
      const code = `
        function basic() {}
        async function asyncFn(param1, param2) {}
        function* generator() {}
      `;

      const result = await analyzer.analyzeJavaScript(code, "test.js");

      expect(result.functions).toHaveLength(3);
      expect(result.functions[0]).toEqual({
        name: "basic",
        params: [],
        async: false,
        generator: false
      });
      expect(result.functions[1]).toEqual({
        name: "asyncFn",
        params: ["param1", "param2"],
        async: true,
        generator: false
      });
      expect(result.functions[2]).toEqual({
        name: "generator",
        params: [],
        async: false,
        generator: true
      });
    });

    it("should analyze classes", async () => {
      const code = `
        class TestClass {
          constructor(param) {}
          method1() {}
          async method2(param) {}
          *method3() {}
        }
      `;

      const result = await analyzer.analyzeJavaScript(code, "test.js");

      expect(result.classes).toHaveLength(1);
      expect(result.classes[0].name).toBe("TestClass");
      expect(result.classes[0].methods).toHaveLength(3);

      // Check methods
      expect(result.classes[0].methods).toContainEqual({
        name: "method1",
        params: [],
        async: false,
        generator: false
      });
      expect(result.classes[0].methods).toContainEqual({
        name: "method2",
        params: ["param"],
        async: true,
        generator: false
      });
      expect(result.classes[0].methods).toContainEqual({
        name: "method3",
        params: [],
        async: false,
        generator: true
      });
    });
  });
}); 