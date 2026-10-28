import { z } from "zod";

export const graphLayoutTypes = [
  "horizontal",
  "vertical",
  "horizontal-reverse",
  "vertical-reverse",
] as const;

export const graphNodeTypes = [
  "start",
  "step",
  "problem",
  "condition",
  "technology",
  "tool",
  "data",
  "api",
  "alternative",
  "risk",
  "reference",
  "result",
] as const;

export const graphNodeSchema = z.object({
  id: z.string().trim().min(1, "节点 ID 不能为空"),
  type: z.enum(graphNodeTypes),
  label: z.string().trim().min(1, "节点名称不能为空"),
  description: z.string().trim().min(1, "节点说明不能为空"),
  technologies: z.array(z.string().trim().min(1)).default([]),
  conditions: z.array(z.string().trim().min(1)).default([]),
});

export const graphEdgeSchema = z.object({
  id: z.string().trim().min(1, "连线 ID 不能为空"),
  source: z.string().trim().min(1, "起点不能为空"),
  target: z.string().trim().min(1, "终点不能为空"),
  label: z.string().trim().optional(),
});

export const graphDocumentSchema = z
  .object({
    version: z.literal(1),
    title: z.string().trim().min(1, "图谱标题不能为空"),
    layout: z.enum(graphLayoutTypes).default("horizontal"),
    nodes: z.array(graphNodeSchema).min(1, "至少需要一个节点"),
    edges: z.array(graphEdgeSchema).default([]),
  })
  .superRefine((graph, context) => {
    const nodeIds = new Set<string>();
    graph.nodes.forEach((node, index) => {
      if (nodeIds.has(node.id)) {
        context.addIssue({
          code: "custom",
          path: ["nodes", index, "id"],
          message: `节点 ID “${node.id}” 重复`,
        });
      }
      nodeIds.add(node.id);
    });

    const edgeIds = new Set<string>();
    graph.edges.forEach((edge, index) => {
      if (edgeIds.has(edge.id)) {
        context.addIssue({
          code: "custom",
          path: ["edges", index, "id"],
          message: `连线 ID “${edge.id}” 重复`,
        });
      }
      edgeIds.add(edge.id);

      if (!nodeIds.has(edge.source)) {
        context.addIssue({
          code: "custom",
          path: ["edges", index, "source"],
          message: `找不到起点节点 “${edge.source}”`,
        });
      }
      if (!nodeIds.has(edge.target)) {
        context.addIssue({
          code: "custom",
          path: ["edges", index, "target"],
          message: `找不到终点节点 “${edge.target}”`,
        });
      }
    });
  });

export type GraphDocument = z.infer<typeof graphDocumentSchema>;
export type GraphNode = z.infer<typeof graphNodeSchema>;
export type GraphNodeType = GraphNode["type"];
export type GraphLayout = GraphDocument["layout"];

export const graphLayoutLabels: Record<GraphLayout, string> = {
  horizontal: "横向",
  vertical: "纵向",
  "horizontal-reverse": "从右到左",
  "vertical-reverse": "从下到上",
};

export const graphNodeTypeLabels: Record<GraphNodeType, string> = {
  start: "起点",
  step: "步骤",
  problem: "问题",
  condition: "条件",
  technology: "技术",
  tool: "工具",
  data: "数据",
  api: "接口",
  alternative: "备选",
  risk: "风险",
  reference: "参考",
  result: "结果",
};

export type GraphFieldError = {
  path: string;
  message: string;
};

export type GraphParseResult =
  | { success: true; data: GraphDocument }
  | { success: false; errors: GraphFieldError[] };

export function parseGraphInput(input: unknown): GraphParseResult {
  const result = graphDocumentSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join(".") || "root",
      message: issue.message,
    })),
  };
}
