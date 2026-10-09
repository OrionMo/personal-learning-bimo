import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
} from "react";
import {
  ArrowCounterClockwise,
  Briefcase,
  CaretLeft,
  CaretRight,
  CaretDown,
  ChartBar,
  Check,
  Database,
  Globe,
  NotePencil,
  PencilSimple,
  Plus,
  Sparkle,
  Target,
  Trash,
  Tray,
  TreeStructure,
  X,
} from "@phosphor-icons/react";

type View = "overview" | "cards" | "tree" | "inbox";
type CaptureDestination = "node" | "inbox";
type InboxRecord = {
  id: string;
  domain: string;
  rawText: string;
  context: string;
  trigger: string;
  nextStep: string;
  createdAt: string;
  createdAtIso?: string;
  images?: string[];
  image?: string;
  skillNodeId?: string | null;
  skillNodeLabel?: string;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const toDayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const startOfCalendarDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const recordDate = (record: InboxRecord, now = new Date()) => {
  if (record.createdAtIso) {
    const parsed = new Date(record.createdAtIso);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const match = record.createdAt.match(
    /(?:(\d{4})\D+)?(\d{1,2})\D+(\d{1,2})\D+(\d{1,2}):(\d{2})/,
  );
  if (!match) return null;
  const [, savedYear, month, day, hour, minute] = match;
  let year = savedYear ? Number(savedYear) : now.getFullYear();
  let parsed = new Date(
    year,
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );
  if (!savedYear && parsed.getTime() > now.getTime() + DAY_IN_MS) {
    year -= 1;
    parsed = new Date(
      year,
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
    );
  }
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const recordDisplayText = (record: InboxRecord) => {
  const text = record.rawText.trim();
  if (text) return text;
  const imageCount = (record.images ?? (record.image ? [record.image] : [])).length;
  return imageCount > 0 ? `图片记录（${imageCount}张）` : "学习记录";
};

const learningDomains = [
  "AI产品开发",
  "个人认知",
  "表达社交",
  "内容创作",
  "职场成长",
];

const domainCatalog = [
  {
    name: "AI产品开发",
    summary: "从需求、设计到上线，建立自己的产品开发方法。",
    progress: 28,
    tone: "domain-lime",
  },
  {
    name: "个人认知",
    summary: "记录判断、选择和复盘，慢慢形成自己的思考框架。",
    progress: 12,
    tone: "domain-coral",
  },
  {
    name: "表达社交",
    summary: "把复杂的事情讲清楚，也把自己的想法传递出去。",
    progress: 20,
    tone: "domain-blue",
  },
  {
    name: "内容创作",
    summary: "积累选题、表达和内容生产的方法与素材。",
    progress: 8,
    tone: "domain-purple",
  },
  {
    name: "职场成长",
    summary: "记录工作中的经验、反馈和可以复用的行动。",
    progress: 16,
    tone: "domain-green",
  },
];

const recommendedSkillNodes: Record<string, string[]> = {
  AI产品开发: ["产品需求", "AI能力", "技术实现", "上线复盘"],
  个人认知: ["自我理解", "判断选择", "情绪管理", "行动复盘"],
  表达社交: ["结构表达", "倾听提问", "关系沟通", "公开表达"],
  内容创作: ["选题判断", "内容结构", "表达风格", "复盘迭代"],
  职场成长: ["工作方法", "项目协作", "反馈沟通", "职业规划"],
};

const nodeColorPalette = [
  "#eef7ea",
  "#fff0f4",
  "#fff5df",
  "#f3edff",
  "#edf4ff",
  "#eef9f8",
];

const navItems: { id: View; label: string; hint: string }[] = [
  { id: "tree", label: "我的技能树", hint: "SKILL MAP" },
  { id: "cards", label: "学习记录", hint: "RECORDS" },
  { id: "inbox", label: "待整理", hint: "INBOX" },
  { id: "overview", label: "学习进展", hint: "PROGRESS" },
];

const navIcon = (view: View) => {
  if (view === "tree") return <TreeStructure weight="regular" />;
  if (view === "cards") return <NotePencil weight="regular" />;
  if (view === "inbox") return <Tray weight="regular" />;
  return <ChartBar weight="regular" />;
};

const mobileNavLabel = (view: View) => {
  if (view === "tree") return "技能树";
  if (view === "cards") return "记录";
  if (view === "inbox") return "待整理";
  return "进展";
};

const skillIcon = (label: string, index: number): ReactNode => {
  if (/需求|研究|洞察/.test(label)) return <Target weight="regular" />;
  if (/设计|交互|原型/.test(label)) return <PencilSimple weight="regular" />;
  if (/技术|数据|模型|AI/.test(label)) return <Database weight="regular" />;
  if (/商业|运营|项目/.test(label)) return <Briefcase weight="regular" />;
  return index % 2 === 0 ? (
    <TreeStructure weight="regular" />
  ) : (
    <ChartBar weight="regular" />
  );
};

const cards = [
  {
    tag: "AI产品开发",
    title: "先把图纸画出来，再让 AI 写第一行代码",
    status: "会用",
    tone: "lime",
    learned: "开始写代码前，先把需求、页面、架构和验收标准写清楚。",
    skillNode: "AI产品开发 / 前期准备",
    understanding: "这样 AI 的每次输出都有边界，也更容易检查。",
    useCase: "下次启动一个新功能时，先让 AI 输出需求清单和验收标准。",
    related: "项目开发流程 · PRD 文档",
    nextStep: "把个人学习库的快速记录流程整理成一页 PRD。",
  },
  {
    tag: "个人认知",
    title: "真正的成长，不是知道更多，而是能做出选择",
    status: "看过",
    tone: "coral",
    learned:
      "信息本身不会自动变成能力，只有在具体场景里做过判断，才会留下自己的方法。",
    skillNode: "个人认知 / 判断力",
    understanding: "记录判断过程，比只记录最后的结果更有复用价值。",
    useCase: "遇到选择困难时，记录当时的判断依据，而不是只记录结果。",
    related: "选择复盘 · 个人决策记录",
    nextStep: "回想最近一次重要选择，补充当时的依据。",
  },
  {
    tag: "表达社交",
    title: "把复杂的事情讲清楚，是一种可以训练的能力",
    status: "能讲",
    tone: "blue",
    learned:
      "表达不是把所有信息都说出来，而是先找到对方最需要理解的那一个核心。",
    skillNode: "表达社交 / 结构化表达",
    understanding: "先讲结论和价值，再补充必要细节，更容易让别人听懂。",
    useCase: "汇报、面试或向别人介绍自己的项目时，先讲结论和价值。",
    related: "项目介绍模板 · 三句话表达练习",
    nextStep: "用三句话重新介绍一个自己做过的项目。",
  },
];

type ForcePoint = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fixed?: boolean;
};
type ResizeDirection = { x: number; y: number };
type NodePosition = { x: number; y: number };
type ConnectionEdge = { source: number; target: number };
type SkillTreeDraftNode = {
  id: string;
  label: string;
  parentId: string | null;
  selected: boolean;
};
type SkillTreeDraft = {
  source: "api" | "local";
  summary: string;
  nodes: SkillTreeDraftNode[];
};
type AiInterviewMessage = { role: "assistant" | "user"; content: string };
type AiApplyMode = "append" | "replace";
type RecordViewMode = "grouped" | "all";
type RecordSuggestion = {
  domain: string;
  nodeId: string;
  nodeLabel: string;
  reason: string;
  source: "api" | "local";
};
type CustomLearningDomain = {
  name: string;
  summary: string;
  tone: string;
};

function renameDomainKey<T>(
  source: Record<string, T>,
  originalName: string,
  nextName: string,
) {
  if (originalName === nextName) return source;
  const next = { ...source };
  if (Object.prototype.hasOwnProperty.call(next, originalName)) {
    next[nextName] = next[originalName];
    delete next[originalName];
  }
  return next;
}

function removeDomainKey<T>(source: Record<string, T>, domain: string) {
  const next = { ...source };
  delete next[domain];
  return next;
}

function buildRadialHierarchyLayout(
  indices: number[],
  parents: (number | null | -1)[],
  sizes: number[],
  rootPoint: NodePosition,
  rootSize: number,
  firstRadius: number,
) {
  const included = new Set(indices);
  const parentByIndex = new Map<number, number | null>();
  indices.forEach((index) => {
    const parent = parents[index];
    parentByIndex.set(
      index,
      typeof parent === "number" &&
        parent >= 0 &&
        parent !== index &&
        included.has(parent)
        ? parent
        : null,
    );
  });
  indices.forEach((index) => {
    const seen = new Set([index]);
    let parent = parentByIndex.get(index);
    while (parent !== null && parent !== undefined) {
      if (seen.has(parent)) {
        parentByIndex.set(index, null);
        break;
      }
      seen.add(parent);
      parent = parentByIndex.get(parent);
    }
  });

  const childrenByParent = new Map<number | null, number[]>();
  indices.forEach((index) => {
    const parent = parentByIndex.get(index) ?? null;
    childrenByParent.set(parent, [
      ...(childrenByParent.get(parent) ?? []),
      index,
    ]);
  });
  const roots = childrenByParent.get(null) ?? [];
  const depthByIndex = new Map<number, number>();
  const assignDepth = (index: number, depth: number) => {
    if ((depthByIndex.get(index) ?? Number.POSITIVE_INFINITY) <= depth) return;
    depthByIndex.set(index, depth);
    (childrenByParent.get(index) ?? []).forEach((child) =>
      assignDepth(child, depth + 1),
    );
  };
  roots.forEach((index) => assignDepth(index, 1));

  const leafWeightByIndex = new Map<number, number>();
  const leafWeight = (index: number): number => {
    const saved = leafWeightByIndex.get(index);
    if (saved !== undefined) return saved;
    const children = childrenByParent.get(index) ?? [];
    const weight =
      children.length === 0
        ? 1
        : children.map(leafWeight).reduce((sum, value) => sum + value, 0);
    leafWeightByIndex.set(index, weight);
    return weight;
  };
  roots.forEach(leafWeight);

  const angleByIndex = new Map<number, number>();
  const assignAngles = (
    index: number,
    centerAngle: number,
    sectorWidth: number,
  ) => {
    angleByIndex.set(index, centerAngle);
    const children = childrenByParent.get(index) ?? [];
    if (children.length === 0) return;
    const totalWeight = children
      .map(leafWeight)
      .reduce((sum, value) => sum + value, 0);
    const usableWidth = Math.min(sectorWidth * 0.84, Math.PI * 1.5);
    let cursor = centerAngle - usableWidth / 2;
    children.forEach((child) => {
      const childWidth = (usableWidth * leafWeight(child)) / totalWeight;
      assignAngles(child, cursor + childWidth / 2, childWidth);
      cursor += childWidth;
    });
  };
  const rootSector = (Math.PI * 2) / Math.max(roots.length, 1);
  roots.forEach((index, position) =>
    assignAngles(index, -Math.PI / 2 + position * rootSector, rootSector),
  );

  const maxDepth = Math.max(1, ...depthByIndex.values());
  const radiusByDepth = new Map<number, number>();
  let previousRadius = 0;
  let previousDiameter = rootSize;
  for (let depth = 1; depth <= maxDepth; depth += 1) {
    const levelIndices = indices.filter(
      (index) => (depthByIndex.get(index) ?? 1) === depth,
    );
    const levelDiameter = Math.max(
      112,
      ...levelIndices.map((index) => sizes[index] ?? 112),
    );
    let radius =
      depth === 1
        ? firstRadius
        : previousRadius + (previousDiameter + levelDiameter) / 2 + 76;
    levelIndices.forEach((index, position) => {
      for (
        let nextPosition = position + 1;
        nextPosition < levelIndices.length;
        nextPosition += 1
      ) {
        const nextIndex = levelIndices[nextPosition];
        const angle = angleByIndex.get(index) ?? 0;
        const nextAngle = angleByIndex.get(nextIndex) ?? 0;
        const rawDelta = Math.abs(angle - nextAngle) % (Math.PI * 2);
        const delta = Math.min(rawDelta, Math.PI * 2 - rawDelta);
        if (delta < 0.001) continue;
        const requiredDistance =
          ((sizes[index] ?? 112) + (sizes[nextIndex] ?? 112)) / 2 + 42;
        radius = Math.max(radius, requiredDistance / (2 * Math.sin(delta / 2)));
      }
    });
    radiusByDepth.set(depth, radius);
    previousRadius = radius;
    previousDiameter = levelDiameter;
  }

  return new Map(
    indices.map((index) => {
      const depth = depthByIndex.get(index) ?? 1;
      const angle = angleByIndex.get(index) ?? -Math.PI / 2;
      const radius = radiusByDepth.get(depth) ?? firstRadius;
      return [
        index,
        {
          x: rootPoint.x + Math.cos(angle) * radius,
          y: rootPoint.y + Math.sin(angle) * radius,
        },
      ] as const;
    }),
  );
}

const localSkillSuggestions: Record<
  string,
  { label: string; parentId?: string }[]
> = {
  AI产品开发: [
    { label: "需求与场景", parentId: undefined },
    { label: "AI交互设计", parentId: undefined },
    { label: "技术实现", parentId: undefined },
    { label: "提示词与上下文", parentId: "AI交互设计" },
    { label: "评测与迭代", parentId: "AI交互设计" },
    { label: "上线与复盘", parentId: "技术实现" },
  ],
  个人认知: [
    { label: "自我观察", parentId: undefined },
    { label: "判断与选择", parentId: undefined },
    { label: "情绪识别", parentId: undefined },
    { label: "决策依据", parentId: "判断与选择" },
    { label: "复盘方法", parentId: "判断与选择" },
    { label: "行动实验", parentId: "自我观察" },
  ],
  表达社交: [
    { label: "结构表达", parentId: undefined },
    { label: "倾听提问", parentId: undefined },
    { label: "关系沟通", parentId: undefined },
    { label: "结论先行", parentId: "结构表达" },
    { label: "反馈与澄清", parentId: "倾听提问" },
    { label: "场景适配", parentId: "关系沟通" },
  ],
  内容创作: [
    { label: "选题判断", parentId: undefined },
    { label: "内容结构", parentId: undefined },
    { label: "表达风格", parentId: undefined },
    { label: "素材采集", parentId: "选题判断" },
    { label: "开头与节奏", parentId: "内容结构" },
    { label: "数据复盘", parentId: "表达风格" },
  ],
  职场成长: [
    { label: "工作方法", parentId: undefined },
    { label: "项目协作", parentId: undefined },
    { label: "反馈沟通", parentId: undefined },
    { label: "任务拆解", parentId: "工作方法" },
    { label: "进度同步", parentId: "项目协作" },
    { label: "能力复盘", parentId: "反馈沟通" },
  ],
};

function SkillTreeDraftPreview({
  rootLabel,
  nodes,
}: {
  rootLabel: string;
  nodes: SkillTreeDraftNode[];
}) {
  const previewStageRef = useRef<HTMLDivElement>(null);
  const selectedNodes = nodes.filter(
    (node) => node.selected && node.label.trim(),
  );
  const selectedIds = new Set(selectedNodes.map((node) => node.id));
  const parentById = new Map(
    selectedNodes.map((node) => [
      node.id,
      node.parentId &&
      selectedIds.has(node.parentId) &&
      node.parentId !== node.id
        ? node.parentId
        : null,
    ]),
  );
  selectedNodes.forEach((node) => {
    const seen = new Set([node.id]);
    let parentId = parentById.get(node.id);
    while (parentId) {
      if (seen.has(parentId)) {
        parentById.set(node.id, null);
        break;
      }
      seen.add(parentId);
      parentId = parentById.get(parentId) ?? null;
    }
  });
  const childrenByParent = new Map<string | null, SkillTreeDraftNode[]>();
  selectedNodes.forEach((node) => {
    const parentId = parentById.get(node.id) ?? null;
    childrenByParent.set(parentId, [
      ...(childrenByParent.get(parentId) ?? []),
      node,
    ]);
  });
  const roots = childrenByParent.get(null) ?? [];
  const depthById = new Map<string, number>();
  const assignDepth = (node: SkillTreeDraftNode, depth: number) => {
    if ((depthById.get(node.id) ?? Number.POSITIVE_INFINITY) <= depth) return;
    depthById.set(node.id, depth);
    (childrenByParent.get(node.id) ?? []).forEach((child) =>
      assignDepth(child, depth + 1),
    );
  };
  roots.forEach((node) => assignDepth(node, 1));
  selectedNodes
    .filter((node) => !depthById.has(node.id))
    .forEach((node) => {
      parentById.set(node.id, null);
      assignDepth(node, 1);
    });
  const leafWeightById = new Map<string, number>();
  const leafWeight = (node: SkillTreeDraftNode): number => {
    const saved = leafWeightById.get(node.id);
    if (saved !== undefined) return saved;
    const children = childrenByParent.get(node.id) ?? [];
    const weight =
      children.length === 0
        ? 1
        : children.map(leafWeight).reduce((sum, value) => sum + value, 0);
    leafWeightById.set(node.id, weight);
    return weight;
  };
  roots.forEach(leafWeight);
  const angleById = new Map<string, number>();
  const assignBranchAngle = (
    node: SkillTreeDraftNode,
    centerAngle: number,
    sectorWidth: number,
  ) => {
    angleById.set(node.id, centerAngle);
    const children = childrenByParent.get(node.id) ?? [];
    if (children.length === 0) return;
    const totalWeight = children
      .map(leafWeight)
      .reduce((sum, value) => sum + value, 0);
    const usableWidth = Math.min(sectorWidth * 0.84, Math.PI * 1.4);
    let cursor = centerAngle - usableWidth / 2;
    children.forEach((child) => {
      const childWidth = (usableWidth * leafWeight(child)) / totalWeight;
      assignBranchAngle(child, cursor + childWidth / 2, childWidth);
      cursor += childWidth;
    });
  };
  const rootSectorWidth = (Math.PI * 2) / Math.max(roots.length, 1);
  roots.forEach((node, index) =>
    assignBranchAngle(
      node,
      -Math.PI / 2 + index * rootSectorWidth,
      rootSectorWidth,
    ),
  );
  selectedNodes
    .filter((node) => !angleById.has(node.id))
    .forEach((node, index, remaining) =>
      assignBranchAngle(
        node,
        -Math.PI / 2 + (index * Math.PI * 2) / Math.max(remaining.length, 1),
        (Math.PI * 2) / Math.max(remaining.length, 1),
      ),
    );
  const maxDepth = Math.max(1, ...depthById.values());
  const nodeCountByDepth = new Map<number, number>();
  selectedNodes.forEach((node) => {
    const depth = depthById.get(node.id) ?? 1;
    nodeCountByDepth.set(depth, (nodeCountByDepth.get(depth) ?? 0) + 1);
  });
  const radiusByDepth = new Map<number, number>();
  let previousRadius = 0;
  for (let depth = 1; depth <= maxDepth; depth += 1) {
    const count = nodeCountByDepth.get(depth) ?? 1;
    const circumferenceRadius = (count * 96) / (Math.PI * 2);
    const radius = Math.max(
      depth === 1 ? 145 : previousRadius + 118,
      circumferenceRadius + 20,
    );
    radiusByDepth.set(depth, radius);
    previousRadius = radius;
  }
  const canvasSize = Math.max(
    720,
    (radiusByDepth.get(maxDepth) ?? 145) * 2 + 156,
  );
  const rootX = canvasSize / 2;
  const rootY = canvasSize / 2;
  const previewPoints = selectedNodes.map((node, index) => {
    const depth = depthById.get(node.id) ?? 1;
    const angle = angleById.get(node.id) ?? -Math.PI / 2;
    const radius = radiusByDepth.get(depth) ?? 145;
    return {
      node,
      index,
      x: rootX + Math.cos(angle) * radius,
      y: rootY + Math.sin(angle) * radius,
    };
  });
  const points = new Map(previewPoints.map((point) => [point.node.id, point]));
  const previewRadius = (point: (typeof previewPoints)[number]) =>
    (depthById.get(point.node.id) ?? 1) === 1 ? 42 : 36;
  const rootRadius = 58;
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stage = previewStageRef.current;
      if (!stage) return;
      stage.scrollLeft = Math.max(
        0,
        (stage.scrollWidth - stage.clientWidth) / 2,
      );
      stage.scrollTop = Math.max(
        0,
        (stage.scrollHeight - stage.clientHeight) / 2,
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, [canvasSize, selectedNodes.length]);
  const previewEdges = previewPoints.map((target) => {
    const parentId = parentById.get(target.node.id);
    const parent = parentId ? points.get(parentId) : undefined;
    const sourceX = parent?.x ?? rootX;
    const sourceY = parent?.y ?? rootY;
    const dx = target.x - sourceX;
    const dy = target.y - sourceY;
    const distance = Math.hypot(dx, dy) || 1;
    const sourceRadius = parent ? previewRadius(parent) : rootRadius;
    const targetRadius = previewRadius(target);
    return {
      id: target.node.id,
      x1: sourceX + (dx / distance) * sourceRadius,
      y1: sourceY + (dy / distance) * sourceRadius,
      x2: target.x - (dx / distance) * targetRadius,
      y2: target.y - (dy / distance) * targetRadius,
    };
  });

  return (
    <section
      className="ai-tree-preview"
      aria-label="采用当前 AI 建议后的技能树预览"
    >
      <div className="ai-tree-preview-head">
        <div>
          <span>采用后的效果</span>
          <strong>技能树结构预览</strong>
        </div>
        <small>{selectedNodes.length} 个节点</small>
      </div>
      <div
        className="ai-tree-preview-stage"
        ref={previewStageRef}
        style={{ height: "430px" }}
        role="img"
        aria-label={`${rootLabel}技能树，共${selectedNodes.length}个已选节点`}
      >
        {selectedNodes.length === 0 ? (
          <div className="ai-tree-preview-empty">勾选节点后在这里预览</div>
        ) : (
          <>
            <div
              className="ai-tree-preview-canvas"
              style={{ width: `${canvasSize}px`, height: `${canvasSize}px` }}
            >
              <svg
                viewBox={`0 0 ${canvasSize} ${canvasSize}`}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {Array.from({ length: maxDepth }, (_, index) => {
                  const radius = radiusByDepth.get(index + 1) ?? 0;
                  return (
                    <g key={`preview-level-${index + 1}`}>
                      <circle
                        className="ai-tree-level-ring"
                        cx={rootX}
                        cy={rootY}
                        r={radius}
                      />
                      <text
                        className="ai-tree-level-label"
                        x={rootX + 8}
                        y={rootY - radius + 15}
                      >
                        {index + 1}级
                      </text>
                    </g>
                  );
                })}
                {previewEdges.map((edge) => (
                  <g key={`preview-line-${edge.id}`}>
                    <line x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} />
                    <circle
                      className="ai-tree-edge-dot"
                      cx={edge.x2}
                      cy={edge.y2}
                      r="2.8"
                    />
                  </g>
                ))}
              </svg>
              <div
                className="ai-tree-preview-root"
                style={{ left: `${rootX}px`, top: `${rootY}px` }}
              >
                <small>目标领域</small>
                <strong>{rootLabel}</strong>
              </div>
              {previewPoints.map((point) => (
                <div
                  className={`ai-tree-preview-node ${(depthById.get(point.node.id) ?? 1) > 1 ? "child" : "primary"}`}
                  key={`preview-node-${point.node.id}`}
                  style={{
                    left: `${point.x}px`,
                    top: `${point.y}px`,
                    background:
                      nodeColorPalette[point.index % nodeColorPalette.length],
                  }}
                >
                  <strong>{point.node.label}</strong>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function ForceSkillMap({
  domain,
  rootLabel,
  labels,
  colors,
  sizes,
  parents,
  edges,
  nodeIds,
  positions,
  onPositionsChange,
  onEdit,
  onEditRoot,
  onAdd,
  onConnect,
  onDelete,
  onDeleteMany,
  onResize,
  onSaveRecord,
  onOpenRecord,
}: {
  domain: string;
  rootLabel: string;
  labels: string[];
  colors: string[];
  sizes: number[];
  parents: (number | null | -1)[];
  edges: ConnectionEdge[];
  nodeIds: string[];
  positions: Record<string, NodePosition>;
  onPositionsChange: (positions: Record<string, NodePosition>) => void;
  onEdit: (index: number, label: string, color: string) => void;
  onEditRoot: () => void;
  onAdd: (parentIndex?: number) => void;
  onConnect: (sourceIndex: number, targetIndex: number) => void;
  onDelete: (index: number) => void;
  onDeleteMany: (indices: number[]) => void;
  onResize: (index: number, size: number) => void;
  onSaveRecord: (index: number, text: string) => void;
  onOpenRecord: (index: number) => void;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<{
    type: "node" | "root" | "pan" | "select";
    index?: number;
    moved: boolean;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    dragIndices?: number[];
    dragStartPoints?: NodePosition[];
    dragRoot?: boolean;
    dragRootStart?: NodePosition;
  } | null>(null);
  const nodeTouchTapRef = useRef<{ index: number; time: number } | null>(null);
  const resizeRef = useRef<{
    index: number;
    startX: number;
    startY: number;
    direction: ResizeDirection;
    resizeIndices: number[];
    startSizes: number[];
    resizeRoot: boolean;
    rootStartSize: number;
  } | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const [points, setPoints] = useState<ForcePoint[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedNodeIndices, setSelectedNodeIndices] = useState<number[]>([]);
  const [selectionRect, setSelectionRect] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [rootPosition, setRootPosition] = useState<NodePosition | null>(() => {
    try {
      return JSON.parse(
        localStorage.getItem(`growth-library:root-position:${domain}`) ??
          "null",
      ) as NodePosition | null;
    } catch {
      return null;
    }
  });
  const [rootSize, setRootSize] = useState(() => {
    try {
      return (
        Number(
          localStorage.getItem(`growth-library:root-size:${domain}`) ?? 150,
        ) || 150
      );
    } catch {
      return 150;
    }
  });
  const previousNodeIdsRef = useRef<string[]>(nodeIds);
  const connectionPressRef = useRef<{
    sourceIndex: number;
    pointerId: number;
    timer: number | null;
    started: boolean;
  } | null>(null);
  const [connectionDraft, setConnectionDraft] = useState<{
    sourceIndex: number;
    x: number;
    y: number;
    targetIndex: number | null;
  } | null>(null);
  const [mobileNote, setMobileNote] = useState("");
  const [mobileNoteSaved, setMobileNoteSaved] = useState(false);

  const fitViewToRoot = (
    targetPoints: ForcePoint[],
    currentRootPoint: NodePosition,
  ) => {
    if (size.width <= 0 || size.height <= 0) return;

    const centerX = size.width / 2;
    const centerY = size.height / 2;
    const rootRadius = rootSize / 2;
    const padding = size.width <= 520 ? 28 : 56;
    let horizontalExtent = rootRadius;
    let verticalExtent = rootRadius;

    targetPoints.forEach((point, index) => {
      const nodeRadius = (sizes[index] ?? 112) / 2;
      horizontalExtent = Math.max(
        horizontalExtent,
        Math.abs(point.x - currentRootPoint.x) + nodeRadius,
      );
      verticalExtent = Math.max(
        verticalExtent,
        Math.abs(point.y - currentRootPoint.y) + nodeRadius,
      );
    });

    const availableHalfWidth = Math.max(1, centerX - padding);
    const availableHalfHeight = Math.max(1, centerY - padding);
    const nextZoom = Math.max(
      0.05,
      Math.min(
        1,
        availableHalfWidth / horizontalExtent,
        availableHalfHeight / verticalExtent,
      ),
    );

    const nextPan = {
      x: -nextZoom * (currentRootPoint.x - centerX),
      y: -nextZoom * (currentRootPoint.y - centerY),
    };
    zoomRef.current = nextZoom;
    panRef.current = nextPan;
    setZoom(nextZoom);
    setPan(nextPan);
  };

  useEffect(() => {
    setMobileNote("");
    setMobileNoteSaved(false);
  }, [selectedIndex]);

  useEffect(() => {
    if (!boardRef.current) return;
    const updateSize = () => {
      if (boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect();
        setSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(boardRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (size.width <= 0 || size.height <= 0) return;
    const centerX = size.width / 2 || 420;
    const centerY = size.height / 2 || 260;
    const currentRootPoint = rootPosition ?? { x: centerX, y: centerY };
    const allIndices = labels.map((_, index) => index);
    const rawSavedIndices = allIndices.filter((index) =>
      Boolean(positions[nodeIds[index]]),
    );
    const savedLayoutOverlaps = rawSavedIndices.some((index, position) => {
      const point = positions[nodeIds[index]];
      if (
        Math.hypot(point.x - currentRootPoint.x, point.y - currentRootPoint.y) <
        (sizes[index] ?? 112) / 2 + rootSize / 2 + 24
      )
        return true;
      return rawSavedIndices.slice(position + 1).some((nextIndex) => {
        const nextPoint = positions[nodeIds[nextIndex]];
        return (
          Math.hypot(point.x - nextPoint.x, point.y - nextPoint.y) <
          ((sizes[index] ?? 112) + (sizes[nextIndex] ?? 112)) / 2 + 24
        );
      });
    });
    const savedIndices = savedLayoutOverlaps ? [] : rawSavedIndices;
    const missingIndices = savedLayoutOverlaps
      ? allIndices
      : allIndices.filter((index) => !positions[nodeIds[index]]);
    const savedOuterRadius = savedIndices.reduce((maximum, index) => {
      const saved = positions[nodeIds[index]];
      return Math.max(
        maximum,
        Math.hypot(saved.x - currentRootPoint.x, saved.y - currentRootPoint.y) +
          (sizes[index] ?? 112) / 2,
      );
    }, rootSize / 2);
    const largestMissingRadius = missingIndices.reduce(
      (maximum, index) => Math.max(maximum, (sizes[index] ?? 112) / 2),
      56,
    );
    const firstRadius =
      savedIndices.length > 0
        ? Math.max(210, savedOuterRadius + largestMissingRadius + 72)
        : Math.max(210, rootSize / 2 + largestMissingRadius + 76);
    const generated = buildRadialHierarchyLayout(
      missingIndices,
      parents,
      sizes,
      currentRootPoint,
      rootSize,
      firstRadius,
    );
    const nextPoints = labels.map((_, index) => {
      const saved = savedLayoutOverlaps ? undefined : positions[nodeIds[index]];
      const position = saved ?? generated.get(index) ?? currentRootPoint;
      return { x: position.x, y: position.y, vx: 0, vy: 0, fixed: true };
    });
    setPoints(nextPoints);
    previousNodeIdsRef.current = nodeIds;
    fitViewToRoot(nextPoints, currentRootPoint);
  }, [domain, size.width, size.height]);

  useEffect(() => {
    if (rootPosition)
      localStorage.setItem(
        `growth-library:root-position:${domain}`,
        JSON.stringify(rootPosition),
      );
    else localStorage.removeItem(`growth-library:root-position:${domain}`);
  }, [domain, rootPosition]);
  useEffect(() => {
    localStorage.setItem(
      `growth-library:root-size:${domain}`,
      String(rootSize),
    );
  }, [domain, rootSize]);

  useEffect(() => {
    if (size.width <= 0 || size.height <= 0) return;
    setPoints((current) => {
      const previousNodeIds = previousNodeIdsRef.current;
      const nodeIdsUnchanged =
        nodeIds.length === previousNodeIds.length &&
        nodeIds.every((nodeId, index) => nodeId === previousNodeIds[index]);
      if (
        nodeIdsUnchanged &&
        current.length === nodeIds.length
      )
        return current;
      const centerX = size.width / 2 || 420;
      const centerY = size.height / 2 || 260;
      const rootPoint = rootPosition ?? { x: centerX, y: centerY };
      const previousPointsById = new Map(
        previousNodeIds
          .map((nodeId, index) => [nodeId, current[index]] as const)
          .filter((entry): entry is readonly [string, ForcePoint] =>
            Boolean(entry[1]),
          ),
      );
      const nextPoints: ForcePoint[] = [];
      for (let newIndex = 0; newIndex < nodeIds.length; newIndex += 1) {
        const retainedPoint = previousPointsById.get(nodeIds[newIndex]);
        if (retainedPoint) {
          nextPoints.push(retainedPoint);
          continue;
        }
        const parentIndex = newIndex > 0 ? parents[newIndex] : null;
        const parent =
          parentIndex !== null && parentIndex !== undefined && parentIndex >= 0
            ? nextPoints[parentIndex]
            : undefined;
        const base = parent ?? { x: rootPoint.x, y: rootPoint.y, vx: 0, vy: 0 };
        const newSize = sizes[newIndex] ?? 112;
        const overlaps = (candidate: { x: number; y: number }) => {
          const rootDistance = Math.hypot(
            candidate.x - rootPoint.x,
            candidate.y - rootPoint.y,
          );
          if (rootDistance < newSize / 2 + rootSize / 2 + 22) return true;
          return nextPoints.some((point, index) => {
            const distance = Math.hypot(
              candidate.x - point.x,
              candidate.y - point.y,
            );
            return distance < newSize / 2 + (sizes[index] ?? 112) / 2 + 22;
          });
        };
        const normalizedParent =
          parentIndex !== null && parentIndex !== undefined && parentIndex >= 0
            ? parentIndex
            : null;
        const parentSize =
          normalizedParent === null
            ? rootSize
            : (sizes[normalizedParent] ?? 112);
        const minimumDistance = Math.max(
          148,
          parentSize / 2 + newSize / 2 + 30,
        );
        const siblingAngles = nextPoints
          .map((point, index) => ({ point, index }))
          .filter(({ index }) => {
            const candidateParent = parents[index];
            const normalizedCandidateParent =
              candidateParent !== null &&
              candidateParent !== undefined &&
              candidateParent >= 0
                ? candidateParent
                : null;
            return normalizedCandidateParent === normalizedParent;
          })
          .map(({ point }) => {
            const angle = Math.atan2(point.y - base.y, point.x - base.x);
            return angle < 0 ? angle + Math.PI * 2 : angle;
          })
          .sort((first, second) => first - second);
        let preferredAngle = (newIndex * 2.3999632297) % (Math.PI * 2);
        if (siblingAngles.length > 0) {
          let largestGap = -1;
          siblingAngles.forEach((angle, index) => {
            const nextAngle =
              index === siblingAngles.length - 1
                ? siblingAngles[0] + Math.PI * 2
                : siblingAngles[index + 1];
            const gap = nextAngle - angle;
            if (gap > largestGap) {
              largestGap = gap;
              preferredAngle = (angle + gap / 2) % (Math.PI * 2);
            }
          });
        }
        const distances = Array.from(
          { length: 5 },
          (_, index) => minimumDistance + index * 48,
        );
        const angleOffsets = Array.from({ length: 24 }, (_, index) => {
          if (index === 0) return 0;
          const step = Math.ceil(index / 2);
          return (index % 2 === 1 ? 1 : -1) * step * (Math.PI / 12);
        });
        const candidates = distances.flatMap((distance) =>
          angleOffsets.map((angleOffset) => {
            const angle = preferredAngle + angleOffset;
            return {
              x: base.x + Math.cos(angle) * distance,
              y: base.y + Math.sin(angle) * distance,
            };
          }),
        );
        const position =
          candidates.find((candidate) => !overlaps(candidate)) ??
          candidates.reduce((best, candidate) => {
            const nodeClearance = nextPoints.reduce(
              (minimum, point, index) =>
                Math.min(
                  minimum,
                  Math.hypot(candidate.x - point.x, candidate.y - point.y) -
                    newSize / 2 -
                    (sizes[index] ?? 112) / 2,
              ),
              Number.POSITIVE_INFINITY,
            );
            const rootClearance =
              Math.hypot(candidate.x - rootPoint.x, candidate.y - rootPoint.y) -
              newSize / 2 -
              rootSize / 2;
            const clearance = Math.min(nodeClearance, rootClearance);
            const bestNodeClearance = nextPoints.reduce(
              (minimum, point, index) =>
                Math.min(
                  minimum,
                  Math.hypot(best.x - point.x, best.y - point.y) -
                    newSize / 2 -
                    (sizes[index] ?? 112) / 2,
              ),
              Number.POSITIVE_INFINITY,
            );
            const bestRootClearance =
              Math.hypot(best.x - rootPoint.x, best.y - rootPoint.y) -
              newSize / 2 -
              rootSize / 2;
            const bestClearance = Math.min(
              bestNodeClearance,
              bestRootClearance,
            );
            const candidateDistance = Math.hypot(
              candidate.x - base.x,
              candidate.y - base.y,
            );
            const bestDistance = Math.hypot(best.x - base.x, best.y - base.y);
            const candidateScore =
              clearance - Math.max(0, candidateDistance - minimumDistance) * 0.3;
            const bestScore =
              bestClearance - Math.max(0, bestDistance - minimumDistance) * 0.3;
            return candidateScore > bestScore ? candidate : best;
          });
        nextPoints.push({
          x: position.x,
          y: position.y,
          vx: 0,
          vy: 0,
          fixed: true,
        });
      }
      previousNodeIdsRef.current = nodeIds;
      return nextPoints;
    });
  }, [
    nodeIds,
    parents,
    rootPosition,
    rootSize,
    size.height,
    size.width,
    sizes,
  ]);

  useEffect(() => {
    if (points.length !== nodeIds.length) return;
    onPositionsChange(
      Object.fromEntries(
        points.map((point, index) => [
          nodeIds[index],
          { x: point.x, y: point.y },
        ]),
      ),
    );
  }, [points, nodeIds]);

  useEffect(() => {
    const handleCanvasKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Backspace") return;
      if (
        selectedNodeIndices.length <= 1 &&
        (selectedIndex === null || selectedIndex < 0)
      )
        return;
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      if (selectedNodeIndices.length > 1) onDeleteMany(selectedNodeIndices);
      else if (selectedIndex !== null && selectedIndex >= 0)
        onDelete(selectedIndex);
      setSelectedIndex(null);
      setSelectedNodeIndices([]);
    };
    window.addEventListener("keydown", handleCanvasKeyDown);
    return () => window.removeEventListener("keydown", handleCanvasKeyDown);
  }, [onDelete, onDeleteMany, selectedIndex, selectedNodeIndices]);

  const worldPoint = (event: PointerEvent<HTMLElement>) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x:
        (event.clientX - rect.left - rect.width / 2 - pan.x) / zoom +
        rect.width / 2,
      y:
        (event.clientY - rect.top - rect.height / 2 - pan.y) / zoom +
        rect.height / 2,
    };
  };
  const handleNodeDown = (event: PointerEvent<HTMLElement>, index: number) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const movingSelectedGroup =
      selectedNodeIndices.includes(index) &&
      (selectedNodeIndices.length > 1 || selectedIndex === -1);
    const dragIndices = movingSelectedGroup ? selectedNodeIndices : [index];
    const dragRoot = movingSelectedGroup && selectedIndex === -1;
    interactionRef.current = {
      type: "node",
      index,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
      dragIndices,
      dragStartPoints: dragIndices.map((dragIndex) => ({
        x: points[dragIndex]?.x ?? 0,
        y: points[dragIndex]?.y ?? 0,
      })),
      dragRoot,
      dragRootStart: dragRoot ? { ...rootPoint } : undefined,
    };
    if (dragIndices.length === 1 && !selectedNodeIndices.includes(index)) {
      setSelectedIndex(index);
      setSelectedNodeIndices([index]);
    }
    const dragged = new Set(dragIndices);
    setPoints((current) =>
      current.map((point, pointIndex) =>
        dragged.has(pointIndex) ? { ...point, vx: 0, vy: 0 } : point,
      ),
    );
  };
  const handleNodeMove = (event: PointerEvent<HTMLElement>, index: number) => {
    const interaction = interactionRef.current;
    if (
      !interaction ||
      interaction.type !== "node" ||
      interaction.index !== index
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    const distance = Math.hypot(
      event.clientX - interaction.startX,
      event.clientY - interaction.startY,
    );
    if (distance > 4) interaction.moved = true;
    const dragIndices = interaction.dragIndices ?? [index];
    const dragStartPoints = interaction.dragStartPoints ?? [];
    const dragOffsetX = (event.clientX - interaction.startX) / zoom;
    const dragOffsetY = (event.clientY - interaction.startY) / zoom;
    const dragIndexSet = new Map(
      dragIndices.map((dragIndex, dragPosition) => [dragIndex, dragPosition]),
    );
    setPoints((current) =>
      current.map((item, itemIndex) => {
        const dragPosition = dragIndexSet.get(itemIndex);
        if (dragPosition === undefined) return item;
        const startPoint = dragStartPoints[dragPosition] ?? item;
        return {
          ...item,
          x: startPoint.x + dragOffsetX,
          y: startPoint.y + dragOffsetY,
          vx: 0,
          vy: 0,
        };
      }),
    );
    if (interaction.dragRoot && interaction.dragRootStart) {
      setRootPosition({
        x: interaction.dragRootStart.x + dragOffsetX,
        y: interaction.dragRootStart.y + dragOffsetY,
      });
    }
  };
  const openNodeRecord = (index: number) => {
    setSelectedIndex(index);
    setSelectedNodeIndices([index]);
    setMobileNoteSaved(false);
    onOpenRecord(index);
  };
  const handleNodeUp = (event: PointerEvent<HTMLElement>, index: number) => {
    const interaction = interactionRef.current;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (interaction?.type === "node" && interaction.index === index) {
      const dragged = new Set(interaction.dragIndices ?? [index]);
      setPoints((current) =>
        current.map((point, pointIndex) =>
          dragged.has(pointIndex) ? { ...point, fixed: true } : point,
        ),
      );
      if (!interaction.moved && dragged.size === 1) {
        setSelectedIndex(index);
        setSelectedNodeIndices([index]);
        if (event.pointerType !== "mouse") {
          const tapTime = window.performance.now();
          const previousTap = nodeTouchTapRef.current;
          if (
            previousTap?.index === index &&
            tapTime - previousTap.time <= 360
          ) {
            nodeTouchTapRef.current = null;
            openNodeRecord(index);
          } else {
            nodeTouchTapRef.current = { index, time: tapTime };
          }
        }
      }
    }
    interactionRef.current = null;
  };
  const handleRootDown = (event: PointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const dragIndices = selectedIndex === -1 ? selectedNodeIndices : [];
    interactionRef.current = {
      type: "root",
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
      dragIndices,
      dragStartPoints: dragIndices.map((dragIndex) => ({
        x: points[dragIndex]?.x ?? 0,
        y: points[dragIndex]?.y ?? 0,
      })),
      dragRoot: true,
      dragRootStart: { ...rootPoint },
    };
    if (selectedIndex !== -1) {
      setSelectedIndex(-1);
      setSelectedNodeIndices([]);
    }
  };
  const handleRootMove = (event: PointerEvent<HTMLElement>) => {
    const interaction = interactionRef.current;
    if (!interaction || interaction.type !== "root") return;
    event.preventDefault();
    event.stopPropagation();
    if (
      Math.hypot(
        event.clientX - interaction.startX,
        event.clientY - interaction.startY,
      ) > 4
    )
      interaction.moved = true;
    const dragOffsetX = (event.clientX - interaction.startX) / zoom;
    const dragOffsetY = (event.clientY - interaction.startY) / zoom;
    const rootStart = interaction.dragRootStart ?? rootPoint;
    setRootPosition({
      x: rootStart.x + dragOffsetX,
      y: rootStart.y + dragOffsetY,
    });
    const dragIndices = interaction.dragIndices ?? [];
    const dragStartPoints = interaction.dragStartPoints ?? [];
    const dragIndexSet = new Map(
      dragIndices.map((dragIndex, dragPosition) => [dragIndex, dragPosition]),
    );
    setPoints((current) =>
      current.map((point, pointIndex) => {
        const dragPosition = dragIndexSet.get(pointIndex);
        if (dragPosition === undefined) return point;
        const startPoint = dragStartPoints[dragPosition] ?? point;
        return {
          ...point,
          x: startPoint.x + dragOffsetX,
          y: startPoint.y + dragOffsetY,
          vx: 0,
          vy: 0,
        };
      }),
    );
  };
  const handleRootUp = (event: PointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    const dragged = new Set(interactionRef.current?.dragIndices ?? []);
    if (dragged.size > 0)
      setPoints((current) =>
        current.map((point, index) =>
          dragged.has(index) ? { ...point, fixed: true } : point,
        ),
      );
    interactionRef.current = null;
  };
  const handleResizeDown = (
    event: PointerEvent<HTMLSpanElement>,
    index: number,
    direction: ResizeDirection,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const resizingSelectedGroup =
      index === -1
        ? selectedIndex === -1 && selectedNodeIndices.length > 0
        : selectedNodeIndices.includes(index) &&
          (selectedNodeIndices.length > 1 || selectedIndex === -1);
    const resizeIndices = resizingSelectedGroup
      ? selectedNodeIndices
      : index >= 0
        ? [index]
        : [];
    resizeRef.current = {
      index,
      startX: event.clientX,
      startY: event.clientY,
      direction,
      resizeIndices,
      startSizes: resizeIndices.map((resizeIndex) => sizes[resizeIndex] ?? 112),
      resizeRoot:
        index === -1 || (resizingSelectedGroup && selectedIndex === -1),
      rootStartSize: rootSize,
    };
  };
  const handleResizeMove = (event: PointerEvent<HTMLSpanElement>) => {
    const resize = resizeRef.current;
    if (!resize) return;
    event.preventDefault();
    event.stopPropagation();
    const dx = (event.clientX - resize.startX) / zoom;
    const dy = (event.clientY - resize.startY) / zoom;
    const sizeDelta = Math.round(
      Math.max(dx * resize.direction.x, dy * resize.direction.y) * 1.15,
    );
    if (resize.resizeRoot)
      setRootSize(
        Math.max(76, Math.min(220, resize.rootStartSize + sizeDelta)),
      );
    resize.resizeIndices.forEach((resizeIndex, position) => {
      const startSize = resize.startSizes[position] ?? 112;
      onResize(resizeIndex, Math.max(76, Math.min(180, startSize + sizeDelta)));
    });
  };
  const handleResizeUp = (event: PointerEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    resizeRef.current = null;
  };
  const handleNodeKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    index: number,
  ) => {
    if (event.key !== "Backspace") return;
    event.preventDefault();
    event.stopPropagation();
    onDelete(index);
    setSelectedIndex(null);
    setSelectedNodeIndices([]);
  };
  const handleCanvasDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("[data-node]")) return;
    setSelectedIndex(null);
    setSelectedNodeIndices([]);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (event.button === 0) {
      event.preventDefault();
      const point = worldPoint(event);
      setSelectionRect({
        startX: point.x,
        startY: point.y,
        currentX: point.x,
        currentY: point.y,
      });
      interactionRef.current = {
        type: "select",
        moved: false,
        startX: event.clientX,
        startY: event.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      };
      return;
    }
    if (event.button === 1) {
      event.preventDefault();
      interactionRef.current = {
        type: "pan",
        moved: false,
        startX: event.clientX,
        startY: event.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      };
      return;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const handleCanvasMove = (event: PointerEvent<HTMLDivElement>) => {
    const interaction = interactionRef.current;
    if (!interaction) return;
    const dx = event.clientX - interaction.startX;
    const dy = event.clientY - interaction.startY;
    if (Math.hypot(dx, dy) > 3) interaction.moved = true;
    if (interaction.type === "pan") {
      const nextPan = {
        x: interaction.startPanX + dx,
        y: interaction.startPanY + dy,
      };
      panRef.current = nextPan;
      setPan(nextPan);
    } else if (interaction.type === "select") {
      event.preventDefault();
      const point = worldPoint(event);
      setSelectionRect((rect) =>
        rect ? { ...rect, currentX: point.x, currentY: point.y } : rect,
      );
    }
  };
  const handleCanvasUp = (event: PointerEvent<HTMLDivElement>) => {
    const interaction = interactionRef.current;
    if (interaction?.type === "pan" || interaction?.type === "select") {
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
      if (interaction.type === "select" && interaction.moved) {
        const rect = selectionRect;
        if (rect) {
          const left = Math.min(rect.startX, rect.currentX);
          const right = Math.max(rect.startX, rect.currentX);
          const top = Math.min(rect.startY, rect.currentY);
          const bottom = Math.max(rect.startY, rect.currentY);
          const selectedIndices = points.reduce<number[]>(
            (selected, point, index) => {
              if (
                point.x >= left &&
                point.x <= right &&
                point.y >= top &&
                point.y <= bottom
              )
                selected.push(index);
              return selected;
            },
            [],
          );
          const rootIsInside =
            rootPoint.x >= left &&
            rootPoint.x <= right &&
            rootPoint.y >= top &&
            rootPoint.y <= bottom;
          setSelectedNodeIndices(selectedIndices);
          setSelectedIndex(
            rootIsInside
              ? -1
              : selectedIndices.length === 1
                ? selectedIndices[0]
                : null,
          );
        }
      }
    }
    setSelectionRect(null);
    interactionRef.current = null;
  };
  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const board = boardRef.current;
    if (!board) return;

    const currentZoom = zoomRef.current;
    const nextZoom = Math.max(
      0.05,
      Math.min(1.8, currentZoom - event.deltaY * 0.001),
    );
    if (nextZoom === currentZoom) return;

    const rect = board.getBoundingClientRect();
    const pointerX = event.clientX - rect.left - rect.width / 2;
    const pointerY = event.clientY - rect.top - rect.height / 2;
    const scaleRatio = nextZoom / currentZoom;
    const currentPan = panRef.current;
    const nextPan = {
      x: pointerX - (pointerX - currentPan.x) * scaleRatio,
      y: pointerY - (pointerY - currentPan.y) * scaleRatio,
    };

    zoomRef.current = nextZoom;
    panRef.current = nextPan;
    setZoom(nextZoom);
    setPan(nextPan);
  };
  const handleResetView = () => {
    if (size.width <= 0 || size.height <= 0) return;

    const centerX = size.width / 2;
    const centerY = size.height / 2;
    const currentRootPoint = rootPosition ?? { x: centerX, y: centerY };
    fitViewToRoot(points, currentRootPoint);
  };
  const connectionTargetAt = (
    point: { x: number; y: number },
    sourceIndex: number,
  ) => {
    let closest: number | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;
    points.forEach((candidate, index) => {
      if (index === sourceIndex) return;
      const distance = Math.hypot(point.x - candidate.x, point.y - candidate.y);
      const snapDistance = Math.max(42, (sizes[index] ?? 112) / 2 + 24);
      if (distance <= snapDistance && distance < closestDistance) {
        closest = index;
        closestDistance = distance;
      }
    });
    return closest;
  };
  const handleAddPointerDown = (
    event: PointerEvent<HTMLSpanElement>,
    sourceIndex: number,
  ) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const press = {
      sourceIndex,
      pointerId: event.pointerId,
      timer: null as number | null,
      started: false,
    };
    press.timer = window.setTimeout(() => {
      const source = sourceIndex === -1 ? rootPoint : points[sourceIndex];
      if (!source) return;
      press.started = true;
      setConnectionDraft({
        sourceIndex,
        x: source.x,
        y: source.y,
        targetIndex: null,
      });
    }, 260);
    connectionPressRef.current = press;
  };
  const handleAddPointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    const press = connectionPressRef.current;
    if (!press || !press.started) return;
    event.stopPropagation();
    const point = worldPoint(event);
    setConnectionDraft({
      sourceIndex: press.sourceIndex,
      x: point.x,
      y: point.y,
      targetIndex: connectionTargetAt(point, press.sourceIndex),
    });
  };
  const finishAddPointer = (
    event: PointerEvent<HTMLSpanElement>,
    cancelled = false,
  ) => {
    const press = connectionPressRef.current;
    if (!press) return;
    event.stopPropagation();
    if (press.timer !== null) window.clearTimeout(press.timer);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (press.started && !cancelled) {
      const point = worldPoint(event);
      const targetIndex = connectionTargetAt(point, press.sourceIndex);
      if (targetIndex !== null) onConnect(press.sourceIndex, targetIndex);
    } else if (!press.started && !cancelled) {
      onAdd(press.sourceIndex === -1 ? undefined : press.sourceIndex);
    }
    connectionPressRef.current = null;
    setConnectionDraft(null);
  };

  const rootPoint = rootPosition ?? { x: size.width / 2, y: size.height / 2 };
  const connectionSource = connectionDraft
    ? connectionDraft.sourceIndex === -1
      ? rootPoint
      : points[connectionDraft.sourceIndex]
    : null;
  const graphLines = [
    ...points.flatMap((point, index) => {
      const parentIndex = parents[index];
      if (parentIndex === -1) return [];
      const source =
        parentIndex !== null && parentIndex !== undefined && parentIndex >= 0
          ? points[parentIndex]
          : rootPoint;
      return source
        ? [{ key: `parent-${nodeIds[index] ?? index}`, source, target: point }]
        : [];
    }),
    ...edges.flatMap((edge, index) => {
      const source = edge.source === -1 ? rootPoint : points[edge.source];
      const target = points[edge.target];
      if (!source || !target || parents[edge.target] === edge.source) return [];
      return [
        { key: `edge-${index}-${edge.source}-${edge.target}`, source, target },
      ];
    }),
  ];

  return (
    <div
      className="skill-map-board neural-map"
      ref={boardRef}
      onPointerDown={handleCanvasDown}
      onPointerMove={handleCanvasMove}
      onPointerUp={handleCanvasUp}
      onPointerCancel={handleCanvasUp}
      onWheelCapture={handleWheel}
    >
      <div
        className="mindmap-toolbar"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <span>{Math.round(zoom * 100)}%</span>
      </div>
      <button
        className="mindmap-reset"
        type="button"
        aria-label="重置视角"
        title="重置视角"
        onPointerDown={(event) => {
          event.stopPropagation();
          handleResetView();
        }}
        onClick={(event) => {
          event.stopPropagation();
          handleResetView();
        }}
      >
        <ArrowCounterClockwise weight="regular" />
      </button>
      <div
        className="neural-world"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {graphLines.map((line) => {
          const dx = line.target.x - line.source.x;
          const dy = line.target.y - line.source.y;
          return (
            <div
              className="neural-line"
              key={line.key}
              style={{
                left: `${line.source.x}px`,
                top: `${line.source.y}px`,
                width: `${Math.hypot(dx, dy)}px`,
                transform: `rotate(${(Math.atan2(dy, dx) * 180) / Math.PI}deg)`,
              }}
            />
          );
        })}
        {connectionDraft && connectionSource && (
          <div
            className="neural-line connection-preview"
            style={{
              left: `${connectionSource.x}px`,
              top: `${connectionSource.y}px`,
              width: `${Math.hypot((connectionDraft.targetIndex !== null ? points[connectionDraft.targetIndex].x : connectionDraft.x) - connectionSource.x, (connectionDraft.targetIndex !== null ? points[connectionDraft.targetIndex].y : connectionDraft.y) - connectionSource.y)}px`,
              transform: `rotate(${(Math.atan2((connectionDraft.targetIndex !== null ? points[connectionDraft.targetIndex].y : connectionDraft.y) - connectionSource.y, (connectionDraft.targetIndex !== null ? points[connectionDraft.targetIndex].x : connectionDraft.x) - connectionSource.x) * 180) / Math.PI}deg)`,
            }}
          />
        )}{" "}
        {selectionRect && (
          <div
            className="selection-rectangle"
            style={{
              left: `${Math.min(selectionRect.startX, selectionRect.currentX)}px`,
              top: `${Math.min(selectionRect.startY, selectionRect.currentY)}px`,
              width: `${Math.abs(selectionRect.currentX - selectionRect.startX)}px`,
              height: `${Math.abs(selectionRect.currentY - selectionRect.startY)}px`,
            }}
          />
        )}
        <div
          className={`neural-node neural-root ${rootSize < 112 ? "is-compact" : ""} ${selectedIndex === -1 ? "is-selected" : ""}`}
          data-node
          style={{
            left: `${rootPoint.x}px`,
            top: `${rootPoint.y}px`,
            width: `${rootSize}px`,
            height: `${rootSize}px`,
          }}
          onPointerDown={handleRootDown}
          onPointerMove={handleRootMove}
          onPointerUp={handleRootUp}
          onPointerCancel={handleRootUp}
          onDoubleClick={onEditRoot}
          tabIndex={0}
          role="button"
        >
          <TreeStructure className="node-symbol" weight="regular" />
          <span className="node-kicker">目标领域</span>
          <strong>{rootLabel}</strong>
          {selectedIndex === -1 && (
            <>
              <span
                className="node-action-add"
                role="button"
                tabIndex={0}
                aria-label="从核心节点添加节点"
                onPointerDown={(event) => handleAddPointerDown(event, -1)}
                onPointerMove={handleAddPointerMove}
                onPointerUp={(event) => finishAddPointer(event)}
                onPointerCancel={(event) => finishAddPointer(event, true)}
              >
                <Plus weight="bold" />
              </span>
              <span className="node-handles" aria-label="调整核心节点大小">
                <span
                  className="node-handle handle-se"
                  aria-label="拖动调整核心节点大小"
                  onPointerDown={(event) =>
                    handleResizeDown(event, -1, { x: 1, y: 1 })
                  }
                  onPointerMove={handleResizeMove}
                  onPointerUp={handleResizeUp}
                  onPointerCancel={handleResizeUp}
                />
              </span>
            </>
          )}
        </div>
        {points.map((point, index) => {
          const selected = selectedNodeIndices.includes(index);
          const connectionTarget = connectionDraft?.targetIndex === index;
          const nodeSize = sizes[index] ?? 112;
          return (
            <div
              className={`neural-node neural-branch ${nodeSize < 96 ? "is-compact" : ""} ${selected ? "is-selected" : ""} ${connectionTarget ? "is-connection-target" : ""}`}
              data-node
              key={nodeIds[index] ?? `${labels[index]}-${index}`}
              style={{
                left: `${point.x}px`,
                top: `${point.y}px`,
                width: `${nodeSize}px`,
                height: `${nodeSize}px`,
                background: colors[index] ?? nodeColorPalette[0],
                transform: "translate(-50%, -50%)",
              }}
              onPointerDown={(event) => handleNodeDown(event, index)}
              onPointerMove={(event) => handleNodeMove(event, index)}
              onPointerUp={(event) => handleNodeUp(event, index)}
              onPointerCancel={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId))
                  event.currentTarget.releasePointerCapture(event.pointerId);
                interactionRef.current = null;
              }}
              onDoubleClick={() => openNodeRecord(index)}
              onKeyDown={(event) => handleNodeKeyDown(event, index)}
              tabIndex={0}
              role="button"
            >
              <span className="node-symbol">
                {skillIcon(labels[index], index)}
              </span>
              <strong>{labels[index]}</strong>
              <small>{selected ? "可拖动、缩放或记录" : "点击选中"}</small>
              {selected && (
                <>
                  <span
                    className="node-action-add"
                    role="button"
                    tabIndex={0}
                    aria-label="从此节点添加节点"
                    onPointerDown={(event) =>
                      handleAddPointerDown(event, index)
                    }
                    onPointerMove={handleAddPointerMove}
                    onPointerUp={(event) => finishAddPointer(event)}
                    onPointerCancel={(event) => finishAddPointer(event, true)}
                  >
                    <Plus weight="bold" />
                  </span>
                  <span
                    className="node-action-edit"
                    role="button"
                    tabIndex={0}
                    aria-label="编辑节点"
                    title="编辑节点"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(
                        index,
                        labels[index],
                        colors[index] ?? nodeColorPalette[0],
                      );
                    }}
                  >
                    <PencilSimple weight="bold" />
                  </span>
                  <span className="node-handles" aria-label="调整节点大小">
                    <span
                      className="node-handle handle-se"
                      aria-label="拖动调整节点大小"
                      onPointerDown={(event) =>
                        handleResizeDown(event, index, { x: 1, y: 1 })
                      }
                      onPointerMove={handleResizeMove}
                      onPointerUp={handleResizeUp}
                      onPointerCancel={handleResizeUp}
                    />
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
      {selectedIndex !== null && selectedIndex >= 0 && (
        <section
          className={`mobile-node-sheet ${mobileNoteSaved ? "is-saved" : ""}`}
          data-node
          onPointerDown={(event) => event.stopPropagation()}
          aria-label={`记录到${labels[selectedIndex]}`}
        >
          <span className="mobile-sheet-handle" />
          <div className="mobile-sheet-title">
            <div className="mobile-sheet-copy">
              <strong>{labels[selectedIndex]}</strong>
              <p>把刚学到的内容直接沉淀到这个技能节点。</p>
            </div>
            <div className="mobile-sheet-actions">
              <button
                type="button"
                aria-label="编辑节点"
                title="编辑节点"
                onClick={() =>
                  onEdit(
                    selectedIndex,
                    labels[selectedIndex],
                    colors[selectedIndex] ?? nodeColorPalette[0],
                  )
                }
              >
                <PencilSimple weight="bold" />
              </button>
              <button
                type="button"
                aria-label="关闭节点记录"
                onClick={() => {
                  setSelectedIndex(null);
                  setSelectedNodeIndices([]);
                }}
              >
                <X weight="bold" />
              </button>
            </div>
          </div>
          <textarea
            value={mobileNote}
            onChange={(event) => {
              setMobileNote(event.target.value);
              setMobileNoteSaved(false);
            }}
            placeholder="记录刚学到的内容…"
          />
          <button
            type="button"
            className={`mobile-sheet-save ${mobileNoteSaved ? "is-saved" : ""}`}
            disabled={!mobileNote.trim()}
            onClick={() => {
              if (!mobileNote.trim()) return;
              onSaveRecord(selectedIndex, mobileNote.trim());
              setMobileNote("");
              setMobileNoteSaved(true);
              window.setTimeout(() => setMobileNoteSaved(false), 1600);
            }}
          >
            {mobileNoteSaved ? "已保存" : "保存到该节点"}
          </button>
        </section>
      )}
      <div className="neural-hint">
        左键拖动空白区域框选节点 · 中键拖动画布平移 · 点击小圆点新增/长按连线 ·
        普通节点双击记录 · Backspace 删除
      </div>
    </div>
  );
}

function App() {
  const [view, setView] = useState<View>("tree");
  const [showModal, setShowModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<
    (typeof cards)[number] | null
  >(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(
    learningDomains[0],
  );
  const [learningDomainCatalog, setLearningDomainCatalog] = useState<
    CustomLearningDomain[]
  >(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("growth-library:domain-catalog") ?? "[]",
      ) as CustomLearningDomain[];
      if (saved.length > 0) return saved;
      const legacyCustomDomains = JSON.parse(
        localStorage.getItem("growth-library:custom-domains") ?? "[]",
      ) as CustomLearningDomain[];
      const defaultNames = new Set(domainCatalog.map((domain) => domain.name));
      return [
        ...domainCatalog,
        ...legacyCustomDomains.filter((domain) => !defaultNames.has(domain.name)),
      ];
    } catch {
      return domainCatalog;
    }
  });
  const [addDomainOpen, setAddDomainOpen] = useState(false);
  const [newDomainName, setNewDomainName] = useState("");
  const [newDomainSummary, setNewDomainSummary] = useState("");
  const [editingDomain, setEditingDomain] = useState<{
    originalName: string;
    name: string;
    summary: string;
  } | null>(null);
  const [pendingDeleteDomain, setPendingDeleteDomain] = useState<string | null>(
    null,
  );
  const availableDomains = learningDomainCatalog.map((domain) => domain.name);
  const visibleDomainCatalog = learningDomainCatalog;
  const [nodeLabels, setNodeLabels] = useState<Record<string, string[]>>(() => {
    try {
      return {
        ...recommendedSkillNodes,
        ...(JSON.parse(
          localStorage.getItem("growth-library:node-labels") ?? "{}",
        ) as Record<string, string[]>),
      };
    } catch {
      return recommendedSkillNodes;
    }
  });
  const [nodeColors, setNodeColors] = useState<Record<string, string[]>>(() => {
    const defaults = Object.fromEntries(
      Object.entries(recommendedSkillNodes).map(([domain, labels]) => [
        domain,
        labels.map(
          (_, index) => nodeColorPalette[index % nodeColorPalette.length],
        ),
      ]),
    );
    try {
      return {
        ...defaults,
        ...(JSON.parse(
          localStorage.getItem("growth-library:node-colors") ?? "{}",
        ) as Record<string, string[]>),
      };
    } catch {
      return defaults;
    }
  });
  const [nodeSizes, setNodeSizes] = useState<Record<string, number[]>>(() => {
    const defaults = Object.fromEntries(
      Object.entries(recommendedSkillNodes).map(([domain, labels]) => [
        domain,
        labels.map(() => 112),
      ]),
    );
    try {
      return {
        ...defaults,
        ...(JSON.parse(
          localStorage.getItem("growth-library:node-sizes") ?? "{}",
        ) as Record<string, number[]>),
      };
    } catch {
      return defaults;
    }
  });
  const [nodeIds, setNodeIds] = useState<Record<string, string[]>>(() => {
    let saved: Record<string, string[]> = {};
    try {
      saved = JSON.parse(
        localStorage.getItem("growth-library:node-ids") ?? "{}",
      ) as Record<string, string[]>;
    } catch {
      saved = {};
    }
    return Object.fromEntries(
      Object.entries(nodeLabels).map(([domain, labels]) => [
        domain,
        labels.map(
          (_, index) => saved[domain]?.[index] ?? `${domain}-${index}`,
        ),
      ]),
    );
  });
  const [nodePositions, setNodePositions] = useState<
    Record<string, Record<string, NodePosition>>
  >(() => {
    try {
      return JSON.parse(
        localStorage.getItem("growth-library:node-positions") ?? "{}",
      ) as Record<string, Record<string, NodePosition>>;
    } catch {
      return {};
    }
  });
  const [nodeParents, setNodeParents] = useState<
    Record<string, (number | null | -1)[]>
  >(() => {
    const defaults = Object.fromEntries(
      Object.entries(recommendedSkillNodes).map(([domain, labels]) => [
        domain,
        labels.map(() => null),
      ]),
    );
    try {
      return {
        ...defaults,
        ...(JSON.parse(
          localStorage.getItem("growth-library:node-parents") ?? "{}",
        ) as Record<string, (number | null | -1)[]>),
      };
    } catch {
      return defaults;
    }
  });
  const [nodeEdges, setNodeEdges] = useState<Record<string, ConnectionEdge[]>>(
    () => {
      try {
        return JSON.parse(
          localStorage.getItem("growth-library:node-edges") ?? "{}",
        ) as Record<string, ConnectionEdge[]>;
      } catch {
        return {};
      }
    },
  );
  const [rootLabels, setRootLabels] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("growth-library:root-labels") ?? "{}",
      ) as Record<string, string>;
    } catch {
      return {};
    }
  });
  const [editingNode, setEditingNode] = useState<{
    index: number;
    label: string;
    color: string;
    isNew?: boolean;
  } | null>(null);
  const [editingNodeText, setEditingNodeText] = useState("");
  const [editingRoot, setEditingRoot] = useState(false);
  const [editingRootText, setEditingRootText] = useState("");
  const [aiDraft, setAiDraft] = useState<SkillTreeDraft | null>(null);
  const [aiApplyMode, setAiApplyMode] = useState<AiApplyMode>("replace");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiInterviewOpen, setAiInterviewOpen] = useState(false);
  const [aiInterviewMessages, setAiInterviewMessages] = useState<
    AiInterviewMessage[]
  >([]);
  const [aiInterviewInput, setAiInterviewInput] = useState("");
  const [aiInterviewLoading, setAiInterviewLoading] = useState(false);
  const [aiInterviewReady, setAiInterviewReady] = useState(false);
  const [aiProfileSummary, setAiProfileSummary] = useState("");
  const [pendingDeleteNode, setPendingDeleteNode] = useState<{
    indices: number[];
    labels: string[];
  } | null>(null);
  const [captureDomain, setCaptureDomain] = useState(learningDomains[0]);
  const [captureDestination, setCaptureDestination] =
    useState<CaptureDestination>("node");
  const [captureNodeId, setCaptureNodeId] = useState("");
  const [nodePickerOpen, setNodePickerOpen] = useState(false);
  const nodePickerRef = useRef<HTMLDivElement>(null);
  const [captureText, setCaptureText] = useState("");
  const [captureImages, setCaptureImages] = useState<string[]>([]);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [recordDomainFilter, setRecordDomainFilter] = useState(
    learningDomains[0],
  );
  const recordDomainTabsRef = useRef<HTMLDivElement>(null);
  const [recordDomainScrollState, setRecordDomainScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });
  const [recordViewMode, setRecordViewMode] =
    useState<RecordViewMode>("grouped");
  const [recordSuggestions, setRecordSuggestions] = useState<
    Record<string, RecordSuggestion>
  >({});
  const [recordSuggestionLoadingId, setRecordSuggestionLoadingId] = useState<
    string | null
  >(null);
  const [progressDetailDomain, setProgressDetailDomain] = useState<
    string | null
  >(null);
  const [pendingDeleteRecord, setPendingDeleteRecord] = useState<{
    id: string;
    text: string;
  } | null>(null);
  const [inboxManageMode, setInboxManageMode] = useState(false);
  const [inboxDomainFilter, setInboxDomainFilter] = useState("全部领域");
  const inboxDomainTabsRef = useRef<HTMLDivElement>(null);
  const [inboxDomainScrollState, setInboxDomainScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });
  const [selectedPendingRecordIds, setSelectedPendingRecordIds] = useState<
    string[]
  >([]);
  const [batchAssignOpen, setBatchAssignOpen] = useState(false);
  const [batchAssignDomain, setBatchAssignDomain] = useState(
    learningDomains[0],
  );
  const [batchAssignNodeId, setBatchAssignNodeId] = useState("");
  const [pendingBatchDelete, setPendingBatchDelete] = useState(false);
  const [inboxRecords, setInboxRecords] = useState<InboxRecord[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("growth-library:inbox") ?? "[]",
      ) as InboxRecord[];
    } catch {
      return [];
    }
  });
  const [domainImage, setDomainImage] = useState<string | null>(() =>
    localStorage.getItem("growth-library:ai-product-image"),
  );
  const [imageAnimating, setImageAnimating] = useState(false);

  useEffect(() => {
    if (!nodePickerOpen) return;
    const handlePointerDown = (event: globalThis.PointerEvent) => {
      if (!nodePickerRef.current?.contains(event.target as Node)) {
        setNodePickerOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [nodePickerOpen]);

  useEffect(() => {
    localStorage.setItem(
      "growth-library:domain-catalog",
      JSON.stringify(learningDomainCatalog),
    );
  }, [learningDomainCatalog]);

  useEffect(() => {
    if (domainImage)
      localStorage.setItem("growth-library:ai-product-image", domainImage);
    else localStorage.removeItem("growth-library:ai-product-image");
  }, [domainImage]);

  useEffect(() => {
    localStorage.setItem("growth-library:inbox", JSON.stringify(inboxRecords));
  }, [inboxRecords]);

  useEffect(() => {
    if (view === "inbox") return;
    setInboxManageMode(false);
    setSelectedPendingRecordIds([]);
    setBatchAssignOpen(false);
    setPendingBatchDelete(false);
  }, [view]);

  useEffect(() => {
    localStorage.setItem(
      "growth-library:node-labels",
      JSON.stringify(nodeLabels),
    );
  }, [nodeLabels]);

  useEffect(() => {
    localStorage.setItem(
      "growth-library:node-colors",
      JSON.stringify(nodeColors),
    );
  }, [nodeColors]);

  useEffect(() => {
    localStorage.setItem(
      "growth-library:node-sizes",
      JSON.stringify(nodeSizes),
    );
  }, [nodeSizes]);

  useEffect(() => {
    localStorage.setItem("growth-library:node-ids", JSON.stringify(nodeIds));
  }, [nodeIds]);

  useEffect(() => {
    localStorage.setItem(
      "growth-library:node-positions",
      JSON.stringify(nodePositions),
    );
  }, [nodePositions]);

  useEffect(() => {
    localStorage.setItem(
      "growth-library:node-parents",
      JSON.stringify(nodeParents),
    );
  }, [nodeParents]);

  useEffect(() => {
    localStorage.setItem(
      "growth-library:node-edges",
      JSON.stringify(nodeEdges),
    );
  }, [nodeEdges]);

  useEffect(() => {
    localStorage.setItem(
      "growth-library:root-labels",
      JSON.stringify(rootLabels),
    );
  }, [rootLabels]);

  const openCapture = (destination: CaptureDestination = "node") => {
    const nextDomain = selectedDomain ?? availableDomains[0];
    setEditingRecordId(null);
    setCaptureDomain(nextDomain);
    setCaptureDestination(destination);
    setCaptureNodeId("");
    setNodePickerOpen(false);
    setCaptureText("");
    setCaptureImages([]);
    setShowModal(true);
  };

  const openRecordEdit = (record: InboxRecord) => {
    setEditingRecordId(record.id);
    setCaptureDomain(
      availableDomains.includes(record.domain)
        ? record.domain
        : availableDomains[0],
    );
    setCaptureDestination(record.skillNodeId ? "node" : "inbox");
    setCaptureNodeId(record.skillNodeId ?? "");
    setNodePickerOpen(false);
    setCaptureText(record.rawText);
    setCaptureImages(record.images ?? (record.image ? [record.image] : []));
    setShowModal(true);
  };

  const openAddDomain = () => {
    setNewDomainName("");
    setNewDomainSummary("");
    setAddDomainOpen(true);
  };

  const addLearningDomain = () => {
    const name = newDomainName.trim();
    if (!name || availableDomains.includes(name)) return;
    const summary =
      newDomainSummary.trim() || "建立这个领域的技能结构，持续记录和复盘学习成果。";
    const toneOptions = [
      "domain-blue",
      "domain-purple",
      "domain-green",
      "domain-coral",
      "domain-lime",
    ];
    const tone = toneOptions[learningDomainCatalog.length % toneOptions.length];
    setLearningDomainCatalog((domains) => [
      ...domains,
      { name, summary, tone },
    ]);
    setNodeLabels((labels) => ({ ...labels, [name]: [] }));
    setNodeColors((colors) => ({ ...colors, [name]: [] }));
    setNodeSizes((sizes) => ({ ...sizes, [name]: [] }));
    setNodeIds((ids) => ({ ...ids, [name]: [] }));
    setNodeParents((parents) => ({ ...parents, [name]: [] }));
    setNodeEdges((edges) => ({ ...edges, [name]: [] }));
    setNodePositions((positions) => ({ ...positions, [name]: {} }));
    setRootLabels((labels) => ({ ...labels, [name]: name }));
    setRecordDomainFilter(name);
    setSelectedDomain(name);
    setAddDomainOpen(false);
  };

  const openDomainEdit = (domain: CustomLearningDomain) => {
    setEditingDomain({
      originalName: domain.name,
      name: domain.name,
      summary: domain.summary,
    });
  };

  const saveDomainEdit = () => {
    if (!editingDomain) return;
    const originalName = editingDomain.originalName;
    const nextName = editingDomain.name.trim();
    const nextSummary =
      editingDomain.summary.trim() ||
      "建立这个领域的技能结构，持续记录和复盘学习成果。";
    if (
      !nextName ||
      (nextName !== originalName && availableDomains.includes(nextName))
    )
      return;
    setLearningDomainCatalog((domains) =>
      domains.map((domain) =>
        domain.name === originalName
          ? { ...domain, name: nextName, summary: nextSummary }
          : domain,
      ),
    );
    if (nextName !== originalName) {
      setNodeLabels((value) => renameDomainKey(value, originalName, nextName));
      setNodeColors((value) => renameDomainKey(value, originalName, nextName));
      setNodeSizes((value) => renameDomainKey(value, originalName, nextName));
      setNodeIds((value) => renameDomainKey(value, originalName, nextName));
      setNodeParents((value) => renameDomainKey(value, originalName, nextName));
      setNodeEdges((value) => renameDomainKey(value, originalName, nextName));
      setNodePositions((value) =>
        renameDomainKey(value, originalName, nextName),
      );
      setRootLabels((value) => {
        const currentRootLabel = value[originalName];
        const next = renameDomainKey(value, originalName, nextName);
        if (!currentRootLabel || currentRootLabel === originalName)
          next[nextName] = nextName;
        return next;
      });
      setInboxRecords((records) =>
        records.map((record) =>
          record.domain === originalName
            ? { ...record, domain: nextName }
            : record,
        ),
      );
      setSelectedDomain((domain) =>
        domain === originalName ? nextName : domain,
      );
      setProgressDetailDomain((domain) =>
        domain === originalName ? nextName : domain,
      );
      setCaptureDomain((domain) =>
        domain === originalName ? nextName : domain,
      );
      setRecordDomainFilter((domain) =>
        domain === originalName ? nextName : domain,
      );
      setInboxDomainFilter((domain) =>
        domain === originalName ? nextName : domain,
      );
      const savedRootPosition = localStorage.getItem(
        `growth-library:root-position:${originalName}`,
      );
      const savedRootSize = localStorage.getItem(
        `growth-library:root-size:${originalName}`,
      );
      if (savedRootPosition)
        localStorage.setItem(
          `growth-library:root-position:${nextName}`,
          savedRootPosition,
        );
      if (savedRootSize)
        localStorage.setItem(
          `growth-library:root-size:${nextName}`,
          savedRootSize,
        );
      localStorage.removeItem(`growth-library:root-position:${originalName}`);
      localStorage.removeItem(`growth-library:root-size:${originalName}`);
    }
    setEditingDomain(null);
  };

  const confirmDeleteLearningDomain = () => {
    if (!pendingDeleteDomain || learningDomainCatalog.length <= 1) return;
    const domain = pendingDeleteDomain;
    const nextDomain =
      learningDomainCatalog.find((item) => item.name !== domain)?.name ?? "";
    setLearningDomainCatalog((domains) =>
      domains.filter((item) => item.name !== domain),
    );
    setNodeLabels((value) => removeDomainKey(value, domain));
    setNodeColors((value) => removeDomainKey(value, domain));
    setNodeSizes((value) => removeDomainKey(value, domain));
    setNodeIds((value) => removeDomainKey(value, domain));
    setNodeParents((value) => removeDomainKey(value, domain));
    setNodeEdges((value) => removeDomainKey(value, domain));
    setNodePositions((value) => removeDomainKey(value, domain));
    setRootLabels((value) => removeDomainKey(value, domain));
    setInboxRecords((records) =>
      records.map((record) =>
        record.domain === domain
          ? {
              ...record,
              domain: "未选择领域",
              skillNodeId: null,
              skillNodeLabel: undefined,
            }
          : record,
      ),
    );
    setRecordSuggestions({});
    setSelectedDomain(null);
    setProgressDetailDomain((value) => (value === domain ? null : value));
    setCaptureDomain((value) => (value === domain ? nextDomain : value));
    setRecordDomainFilter((value) =>
      value === domain ? nextDomain : value,
    );
    setInboxDomainFilter((value) =>
      value === domain ? "全部领域" : value,
    );
    localStorage.removeItem(`growth-library:root-position:${domain}`);
    localStorage.removeItem(`growth-library:root-size:${domain}`);
    setPendingDeleteDomain(null);
    setEditingDomain(null);
  };

  const saveCapture = () => {
    if (!captureText.trim() && captureImages.length === 0) return;
    if (captureDestination === "node" && !captureNodeId) return;
    const selectedNodeIndex = (nodeIds[captureDomain] ?? []).indexOf(
      captureNodeId,
    );
    const selectedNodeLabel =
      selectedNodeIndex >= 0
        ? nodeLabels[captureDomain]?.[selectedNodeIndex]
        : undefined;
    const destinationFields =
      captureDestination === "node"
        ? { skillNodeId: captureNodeId, skillNodeLabel: selectedNodeLabel }
        : { skillNodeId: null, skillNodeLabel: undefined };
    if (editingRecordId) {
      setInboxRecords((records) =>
        records.map((record) =>
          record.id === editingRecordId
            ? {
                ...record,
                domain: captureDomain,
                rawText: captureText.trim(),
                images: captureImages,
                ...destinationFields,
              }
            : record,
        ),
      );
      setEditingRecordId(null);
      setShowModal(false);
      setView(captureDestination === "node" ? "cards" : "inbox");
      return;
    }
    const record: InboxRecord = {
      id: crypto.randomUUID(),
      domain: captureDomain,
      rawText: captureText.trim(),
      context: "",
      trigger: "",
      nextStep: "",
      createdAt: new Date().toLocaleString("zh-CN", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      createdAtIso: new Date().toISOString(),
      images: captureImages,
      ...destinationFields,
    };
    setInboxRecords((records) => [record, ...records]);
    setShowModal(false);
    setView(captureDestination === "node" ? "cards" : "inbox");
  };

  const saveNodeQuickRecord = (index: number, text: string) => {
    if (!selectedDomain || !text.trim()) return;
    const skillNodeId = nodeIds[selectedDomain]?.[index];
    const skillNodeLabel = nodeLabels[selectedDomain]?.[index];
    if (!skillNodeId || !skillNodeLabel) return;
    const record: InboxRecord = {
      id: crypto.randomUUID(),
      domain: selectedDomain,
      rawText: text.trim(),
      context: "",
      trigger: "",
      nextStep: "",
      createdAt: new Date().toLocaleString("zh-CN", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      createdAtIso: new Date().toISOString(),
      images: [],
      skillNodeId,
      skillNodeLabel,
    };
    setInboxRecords((records) => [record, ...records]);
  };

  const requestDeleteRecord = (record: InboxRecord) => {
    setPendingDeleteRecord({
      id: record.id,
      text: recordDisplayText(record).slice(0, 42),
    });
  };

  const confirmDeleteRecord = () => {
    if (!pendingDeleteRecord) return;
    setInboxRecords((records) =>
      records.filter((record) => record.id !== pendingDeleteRecord.id),
    );
    setPendingDeleteRecord(null);
  };

  const toggleInboxManageMode = () => {
    setInboxManageMode((isManaging) => {
      if (isManaging) setSelectedPendingRecordIds([]);
      return !isManaging;
    });
    setBatchAssignOpen(false);
    setPendingBatchDelete(false);
  };

  const togglePendingRecordSelection = (recordId: string) => {
    setSelectedPendingRecordIds((selectedIds) =>
      selectedIds.includes(recordId)
        ? selectedIds.filter((id) => id !== recordId)
        : [...selectedIds, recordId],
    );
  };

  const openBatchAssign = () => {
    if (selectedPendingRecordIds.length === 0) return;
    const firstSelectedRecord = inboxRecords.find((record) =>
      selectedPendingRecordIds.includes(record.id),
    );
    const nextDomain =
      firstSelectedRecord && availableDomains.includes(firstSelectedRecord.domain)
        ? firstSelectedRecord.domain
        : availableDomains[0];
    setBatchAssignDomain(nextDomain);
    setBatchAssignNodeId("");
    setBatchAssignOpen(true);
  };

  const confirmBatchAssign = () => {
    const nodeIndex = (nodeIds[batchAssignDomain] ?? []).indexOf(
      batchAssignNodeId,
    );
    const nodeLabel = nodeLabels[batchAssignDomain]?.[nodeIndex];
    if (
      selectedPendingRecordIds.length === 0 ||
      nodeIndex < 0 ||
      !nodeLabel
    )
      return;
    const selectedIds = new Set(selectedPendingRecordIds);
    setInboxRecords((records) =>
      records.map((record) =>
        selectedIds.has(record.id)
          ? {
              ...record,
              domain: batchAssignDomain,
              skillNodeId: batchAssignNodeId,
              skillNodeLabel: nodeLabel,
            }
          : record,
      ),
    );
    setRecordSuggestions((suggestions) =>
      Object.fromEntries(
        Object.entries(suggestions).filter(([recordId]) =>
          !selectedIds.has(recordId),
        ),
      ),
    );
    setBatchAssignOpen(false);
    setInboxManageMode(false);
    setSelectedPendingRecordIds([]);
  };

  const confirmBatchDeleteRecords = () => {
    if (selectedPendingRecordIds.length === 0) return;
    const selectedIds = new Set(selectedPendingRecordIds);
    setInboxRecords((records) =>
      records.filter((record) => !selectedIds.has(record.id)),
    );
    setRecordSuggestions((suggestions) =>
      Object.fromEntries(
        Object.entries(suggestions).filter(([recordId]) =>
          !selectedIds.has(recordId),
        ),
      ),
    );
    setPendingBatchDelete(false);
    setInboxManageMode(false);
    setSelectedPendingRecordIds([]);
  };

  const buildLocalRecordSuggestion = (
    record: InboxRecord,
  ): RecordSuggestion | null => {
    const text = `${record.rawText} ${record.context} ${record.trigger}`;
    const domains = [
      record.domain,
      ...availableDomains.filter((domain) => domain !== record.domain),
    ].filter(Boolean);
    let best:
      | { domain: string; nodeId: string; nodeLabel: string; score: number }
      | undefined;
    domains.forEach((domain) => {
      (nodeLabels[domain] ?? []).forEach((nodeLabel, index) => {
        const nodeId = nodeIds[domain]?.[index];
        if (!nodeId) return;
        const compactLabel = nodeLabel.replace(/\s/g, "");
        const pairs = Array.from({ length: Math.max(0, compactLabel.length - 1) },
          (_, pairIndex) => compactLabel.slice(pairIndex, pairIndex + 2),
        );
        const score =
          (domain === record.domain ? 2 : 0) +
          (text.includes(nodeLabel) ? 12 : 0) +
          pairs.filter((pair) => text.includes(pair)).length * 3 +
          [...compactLabel].filter((character) => text.includes(character))
            .length;
        if (!best || score > best.score)
          best = { domain, nodeId, nodeLabel, score };
      });
    });
    if (!best) return null;
    return {
      domain: best.domain,
      nodeId: best.nodeId,
      nodeLabel: best.nodeLabel,
      reason:
        "AI 暂时不可用，已根据记录文字和原领域给出本地建议，请确认后再归入。",
      source: "local",
    };
  };

  const recommendRecordDestination = async (record: InboxRecord) => {
    if (recordSuggestionLoadingId) return;
    setRecordSuggestionLoadingId(record.id);
    try {
      const response = await fetch("/api/generate-skill-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "recommend",
          record: {
            text: record.rawText,
            context: record.context,
            currentDomain: record.domain,
          },
          candidates: availableDomains.map((domain) => ({
            domain,
            nodes: (nodeLabels[domain] ?? []).map((label, index) => ({
              id: nodeIds[domain]?.[index],
              label,
            })),
          })),
        }),
      });
      const result = (await response.json()) as {
        domain?: string;
        nodeLabel?: string;
        reason?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "AI 推荐暂时不可用");
      const domain = result.domain?.trim() ?? "";
      const nodeIndex = (nodeLabels[domain] ?? []).findIndex(
        (label) => label === result.nodeLabel?.trim(),
      );
      const nodeId = nodeIds[domain]?.[nodeIndex];
      if (!domain || nodeIndex < 0 || !nodeId)
        throw new Error("AI 返回了不存在的技能节点");
      setRecordSuggestions((suggestions) => ({
        ...suggestions,
        [record.id]: {
          domain,
          nodeId,
          nodeLabel: nodeLabels[domain][nodeIndex],
          reason: result.reason?.trim() || "根据记录内容与技能节点含义推荐。",
          source: "api",
        },
      }));
    } catch {
      const fallback = buildLocalRecordSuggestion(record);
      if (fallback)
        setRecordSuggestions((suggestions) => ({
          ...suggestions,
          [record.id]: fallback,
        }));
    } finally {
      setRecordSuggestionLoadingId(null);
    }
  };

  const applyRecordSuggestion = (
    recordId: string,
    suggestion: RecordSuggestion,
  ) => {
    setInboxRecords((records) =>
      records.map((record) =>
        record.id === recordId
          ? {
              ...record,
              domain: suggestion.domain,
              skillNodeId: suggestion.nodeId,
              skillNodeLabel: suggestion.nodeLabel,
            }
          : record,
      ),
    );
    setRecordSuggestions((suggestions) => {
      const next = { ...suggestions };
      delete next[recordId];
      return next;
    });
  };

  const addSkillNode = (parentIndex?: number) => {
    if (!selectedDomain) return;
    const nextLabel = "新技能节点";
    const nextIndex = (nodeLabels[selectedDomain] ?? []).length;
    setNodeLabels((labels) => ({
      ...labels,
      [selectedDomain]: [...(labels[selectedDomain] ?? []), nextLabel],
    }));
    const nextColor = nodeColorPalette[nextIndex % nodeColorPalette.length];
    setNodeColors((colors) => ({
      ...colors,
      [selectedDomain]: [...(colors[selectedDomain] ?? []), nextColor],
    }));
    setNodeSizes((sizes) => ({
      ...sizes,
      [selectedDomain]: [...(sizes[selectedDomain] ?? []), 112],
    }));
    setNodeIds((ids) => ({
      ...ids,
      [selectedDomain]: [...(ids[selectedDomain] ?? []), crypto.randomUUID()],
    }));
    setNodeParents((parents) => ({
      ...parents,
      [selectedDomain]: [
        ...(parents[selectedDomain] ?? []),
        parentIndex ?? null,
      ],
    }));
  };

  const connectSkillNodes = (sourceIndex: number, targetIndex: number) => {
    if (!selectedDomain || sourceIndex === targetIndex) return;
    setNodeEdges((allEdges) => {
      const currentEdges = allEdges[selectedDomain] ?? [];
      if (
        currentEdges.some(
          (edge) => edge.source === sourceIndex && edge.target === targetIndex,
        )
      )
        return allEdges;
      return {
        ...allEdges,
        [selectedDomain]: [
          ...currentEdges,
          { source: sourceIndex, target: targetIndex },
        ],
      };
    });
  };

  const discardEditingNode = () => {
    // 取消只关闭编辑弹窗，保留新节点及其当前布局位置。
    setEditingNode(null);
  };

  const openRootEdit = () => {
    if (!selectedDomain) return;
    setEditingRootText(rootLabels[selectedDomain] ?? selectedDomain);
    setEditingRoot(true);
  };

  const saveRootEdit = () => {
    if (!selectedDomain) return;
    const nextText = editingRootText.trim();
    if (!nextText) return;
    setRootLabels((labels) => ({ ...labels, [selectedDomain]: nextText }));
    setEditingRoot(false);
  };

  const buildLocalSkillTreeDraft = (domain: string): SkillTreeDraft => {
    const suggestions =
      localSkillSuggestions[domain] ?? localSkillSuggestions["AI产品开发"];
    const nodes = suggestions.map((suggestion, index) => ({
      id: `local-${index}-${suggestion.label}`,
      label: suggestion.label,
      parentId: suggestion.parentId
        ? `local-${suggestions.findIndex((item) => item.label === suggestion.parentId)}-${suggestion.parentId}`
        : null,
      selected: true,
    }));
    return {
      source: "local",
      summary: `根据“${domain}”这个领域生成一份可编辑的技能树草案。先从高频方向开始，之后可以继续用真实学习记录修正。`,
      nodes,
    };
  };

  const openAiInterview = () => {
    if (!selectedDomain) return;
    setAiInterviewMessages([
      {
        role: "assistant",
        content: `在生成“${selectedDomain}”技能树前，我想先了解你。请介绍一下你目前的身份或职业、已有基础，以及学习这个领域最想解决什么问题。`,
      },
    ]);
    setAiInterviewInput("");
    setAiInterviewReady(false);
    setAiProfileSummary("");
    setAiInterviewOpen(true);
  };

  const sendAiInterviewMessage = async () => {
    if (!selectedDomain || !aiInterviewInput.trim() || aiInterviewLoading)
      return;
    const nextMessages: AiInterviewMessage[] = [
      ...aiInterviewMessages,
      { role: "user", content: aiInterviewInput.trim() },
    ];
    setAiInterviewMessages(nextMessages);
    setAiInterviewInput("");
    setAiInterviewLoading(true);
    try {
      const response = await fetch("/api/generate-skill-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "interview",
          domain: selectedDomain,
          messages: nextMessages,
        }),
      });
      const result = (await response.json()) as {
        reply?: string;
        ready?: boolean;
        summary?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "AI 访谈暂时不可用");
      setAiInterviewMessages((messages) => [
        ...messages,
        {
          role: "assistant",
          content:
            result.reply?.trim() ||
            "我已经了解了。你可以继续补充，或者开始生成技能树。",
        },
      ]);
      setAiInterviewReady(Boolean(result.ready && result.summary?.trim()));
      setAiProfileSummary(result.summary?.trim() || "");
    } catch (error) {
      setAiInterviewMessages((messages) => [
        ...messages,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "AI 访谈暂时不可用，请稍后重试。",
        },
      ]);
    } finally {
      setAiInterviewLoading(false);
    }
  };

  const generateSkillTree = async (profileSummary = aiProfileSummary) => {
    if (!selectedDomain) return;
    setAiGenerating(true);
    setAiApplyMode("replace");
    try {
      const response = await fetch("/api/generate-skill-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "generate",
          domain: selectedDomain,
          profileSummary,
          messages: aiInterviewMessages,
          existingNodes: nodeLabels[selectedDomain] ?? [],
          records: inboxRecords
            .filter((record) => record.domain === selectedDomain)
            .slice(0, 20)
            .map((record) => record.rawText),
        }),
      });
      if (!response.ok) throw new Error("AI API unavailable");
      const result = (await response.json()) as {
        summary?: string;
        nodes?: { id?: string; label?: string; parentId?: string | null }[];
      };
      const nodes = (result.nodes ?? [])
        .filter((node) => node.label?.trim())
        .map((node, index) => ({
          id: node.id ?? `api-${index}-${node.label}`,
          label: node.label!.trim(),
          parentId: node.parentId ?? null,
          selected: true,
        }));
      if (nodes.length === 0) throw new Error("Empty AI draft");
      setAiDraft({
        source: "api",
        summary:
          result.summary ?? "AI 已生成技能树草案，请确认后加入当前领域。",
        nodes,
      });
      setAiInterviewOpen(false);
    } catch (error) {
      const fallback = buildLocalSkillTreeDraft(selectedDomain);
      setAiDraft({
        ...fallback,
        summary: `${error instanceof Error ? error.message : "DeepSeek 暂不可用"}。${fallback.summary}`,
      });
      setAiInterviewOpen(false);
    } finally {
      setAiGenerating(false);
    }
  };

  const applyAiDraft = () => {
    if (!selectedDomain || !aiDraft) return;
    const selectedNodes = aiDraft.nodes.filter(
      (node) => node.selected && node.label.trim(),
    );
    if (selectedNodes.length === 0) return;
    const existingLabels = nodeLabels[selectedDomain] ?? [];
    const existingIds = nodeIds[selectedDomain] ?? [];
    const existingParents = nodeParents[selectedDomain] ?? [];
    const existingColors = nodeColors[selectedDomain] ?? [];
    const existingSizes = nodeSizes[selectedDomain] ?? [];
    const existingOffset =
      aiApplyMode === "replace" ? 0 : existingLabels.length;
    const newIndexById = new Map<string, number>();
    selectedNodes.forEach((node, index) =>
      newIndexById.set(node.id, existingOffset + index),
    );
    const newLabels = selectedNodes.map((node) => node.label.trim());
    const newIds = selectedNodes.map(
      (node) => `${selectedDomain}-ai-${crypto.randomUUID()}`,
    );
    const newParents = selectedNodes.map((node) =>
      node.parentId ? (newIndexById.get(node.parentId) ?? null) : null,
    );
    const newColors = selectedNodes.map(
      (_, index) =>
        nodeColorPalette[(existingOffset + index) % nodeColorPalette.length],
    );
    const newSizes = selectedNodes.map(() => 112);

    if (aiApplyMode === "replace") {
      localStorage.removeItem(`growth-library:root-position:${selectedDomain}`);
      const replacedNodeIds = new Set(existingIds);
      setInboxRecords((records) =>
        records.map((record) =>
          record.domain === selectedDomain &&
          record.skillNodeId &&
          replacedNodeIds.has(record.skillNodeId)
            ? { ...record, skillNodeId: null, skillNodeLabel: undefined }
            : record,
        ),
      );
      setNodeLabels((all) => ({ ...all, [selectedDomain]: newLabels }));
      setNodeIds((all) => ({ ...all, [selectedDomain]: newIds }));
      setNodeParents((all) => ({ ...all, [selectedDomain]: newParents }));
      setNodeColors((all) => ({ ...all, [selectedDomain]: newColors }));
      setNodeSizes((all) => ({ ...all, [selectedDomain]: newSizes }));
      setNodePositions((all) => ({ ...all, [selectedDomain]: {} }));
      setNodeEdges((all) => ({ ...all, [selectedDomain]: [] }));
    } else {
      setNodeLabels((all) => ({
        ...all,
        [selectedDomain]: [...existingLabels, ...newLabels],
      }));
      setNodeIds((all) => ({
        ...all,
        [selectedDomain]: [...existingIds, ...newIds],
      }));
      setNodeParents((all) => ({
        ...all,
        [selectedDomain]: [...existingParents, ...newParents],
      }));
      setNodeColors((all) => ({
        ...all,
        [selectedDomain]: [...existingColors, ...newColors],
      }));
      setNodeSizes((all) => ({
        ...all,
        [selectedDomain]: [...existingSizes, ...newSizes],
      }));
    }
    setAiDraft(null);
  };

  const deleteSkillNode = (index: number) => {
    if (!selectedDomain) return;
    const label = nodeLabels[selectedDomain]?.[index] ?? "这个节点";
    setPendingDeleteNode({ indices: [index], labels: [label] });
  };

  const deleteSkillNodes = (indices: number[]) => {
    if (!selectedDomain || indices.length === 0) return;
    const uniqueIndices = [...new Set(indices)].sort((a, b) => a - b);
    const labels = uniqueIndices.map(
      (index) => nodeLabels[selectedDomain]?.[index] ?? "未命名节点",
    );
    setPendingDeleteNode({ indices: uniqueIndices, labels });
  };

  const confirmDeleteSkillNode = () => {
    if (!selectedDomain || !pendingDeleteNode) return;
    const removed = new Set(pendingDeleteNode.indices);
    const oldLabels = nodeLabels[selectedDomain] ?? [];
    const oldIds = nodeIds[selectedDomain] ?? [];
    const removedIds = new Set(
      pendingDeleteNode.indices.map((index) => oldIds[index]).filter(Boolean),
    );
    const indexMap = new Map<number, number>();
    let nextIndex = 0;
    oldLabels.forEach((_, index) => {
      if (!removed.has(index)) indexMap.set(index, nextIndex++);
    });
    setNodeLabels((labels) => ({
      ...labels,
      [selectedDomain]: (labels[selectedDomain] ?? []).filter(
        (_, index) => !removed.has(index),
      ),
    }));
    setNodeColors((colors) => ({
      ...colors,
      [selectedDomain]: (colors[selectedDomain] ?? []).filter(
        (_, index) => !removed.has(index),
      ),
    }));
    setNodeSizes((sizes) => ({
      ...sizes,
      [selectedDomain]: (sizes[selectedDomain] ?? []).filter(
        (_, index) => !removed.has(index),
      ),
    }));
    setNodeIds((ids) => ({
      ...ids,
      [selectedDomain]: (ids[selectedDomain] ?? []).filter(
        (_, index) => !removed.has(index),
      ),
    }));
    setNodePositions((positions) => ({
      ...positions,
      [selectedDomain]: Object.fromEntries(
        Object.entries(positions[selectedDomain] ?? {}).filter(
          ([id]) =>
            !pendingDeleteNode.indices.some((index) => oldIds[index] === id),
        ),
      ),
    }));
    setNodeEdges((allEdges) => ({
      ...allEdges,
      [selectedDomain]: (allEdges[selectedDomain] ?? [])
        .filter(
          (edge) => !removed.has(edge.source) && !removed.has(edge.target),
        )
        .map((edge) => ({
          source: indexMap.get(edge.source) ?? -1,
          target: indexMap.get(edge.target) ?? -1,
        }))
        .filter((edge) => edge.source >= 0 && edge.target >= 0),
    }));
    setNodeParents((parents) => ({
      ...parents,
      [selectedDomain]: (parents[selectedDomain] ?? [])
        .filter((_, index) => !removed.has(index))
        .map((parent) =>
          parent === null || parent === -1
            ? parent
            : removed.has(parent)
              ? -1
              : (indexMap.get(parent) ?? -1),
        ),
    }));
    setInboxRecords((records) =>
      records.map((record) =>
        record.skillNodeId && removedIds.has(record.skillNodeId)
          ? { ...record, skillNodeId: null, skillNodeLabel: undefined }
          : record,
      ),
    );
    setPendingDeleteNode(null);
  };

  const readCaptureImage = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (captureImages.length >= 9) {
      window.alert("每条记录最多上传 9 张图片");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      window.alert("图片请控制在 5MB 以内");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string")
        setCaptureImages((images) =>
          images.length < 9 ? [...images, reader.result as string] : images,
        );
    };
    reader.readAsDataURL(file);
  };

  const handleCapturePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const imageItem = Array.from(event.clipboardData.items).find((item) =>
      item.type.startsWith("image/"),
    );
    if (!imageItem) return;
    event.preventDefault();
    const file = imageItem.getAsFile();
    if (file) readCaptureImage(file);
  };

  const handleDomainImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      window.alert("图片请控制在 5MB 以内");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDomainImage(typeof reader.result === "string" ? reader.result : null);
      setImageAnimating(true);
      window.setTimeout(() => setImageAnimating(false), 820);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const learningRecords = inboxRecords.filter((record) =>
    Boolean(record.skillNodeId),
  );
  const pendingRecords = inboxRecords.filter((record) => !record.skillNodeId);
  const pendingDomainSet = new Set(
    pendingRecords.map((record) => record.domain || "未选择领域"),
  );
  const pendingRecordDomains = [
    ...availableDomains.filter((domain) => pendingDomainSet.has(domain)),
    ...Array.from(pendingDomainSet).filter(
      (domain) => !availableDomains.includes(domain),
    ),
  ];
  const pendingDomainSignature = pendingRecordDomains.join("\u0001");
  const filteredPendingRecords =
    inboxDomainFilter === "全部领域"
      ? pendingRecords
      : pendingRecords.filter(
          (record) => (record.domain || "未选择领域") === inboxDomainFilter,
        );
  const selectedPendingRecordIdSet = new Set(selectedPendingRecordIds);
  const allFilteredPendingSelected =
    filteredPendingRecords.length > 0 &&
    filteredPendingRecords.every((record) =>
      selectedPendingRecordIdSet.has(record.id),
    );

  useEffect(() => {
    if (view !== "inbox") return;
    const scroller = inboxDomainTabsRef.current;
    if (!scroller) return;

    const updateScrollState = () => {
      const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
      setInboxDomainScrollState({
        canScrollLeft: scroller.scrollLeft > 2,
        canScrollRight: scroller.scrollLeft < maxScrollLeft - 2,
      });
    };

    updateScrollState();
    scroller.addEventListener("scroll", updateScrollState, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [view, pendingDomainSignature]);

  useEffect(() => {
    if (
      inboxDomainFilter !== "全部领域" &&
      !pendingRecordDomains.includes(inboxDomainFilter)
    )
      setInboxDomainFilter("全部领域");
  }, [inboxDomainFilter, pendingDomainSignature]);

  const scrollInboxDomains = (direction: -1 | 1) => {
    const scroller = inboxDomainTabsRef.current;
    if (!scroller) return;
    const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const scrollDistance = Math.max(180, scroller.clientWidth * 0.65);
    const targetScrollLeft = Math.min(
      maxScrollLeft,
      Math.max(0, scroller.scrollLeft + direction * scrollDistance),
    );
    if (Math.abs(targetScrollLeft - scroller.scrollLeft) < 1) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    scroller.scrollTo({
      left: targetScrollLeft,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  };

  const toggleVisiblePendingRecords = () => {
    const visibleIds = filteredPendingRecords.map((record) => record.id);
    setSelectedPendingRecordIds((selectedIds) => {
      if (allFilteredPendingSelected)
        return selectedIds.filter((id) => !visibleIds.includes(id));
      return Array.from(new Set([...selectedIds, ...visibleIds]));
    });
  };

  const recordNodeLabel = (record: InboxRecord) => {
    const index = (nodeIds[record.domain] ?? []).indexOf(
      record.skillNodeId ?? "",
    );
    return index >= 0
      ? (nodeLabels[record.domain]?.[index] ??
          record.skillNodeLabel ??
          "技能节点")
      : (record.skillNodeLabel ?? "技能节点");
  };
  const recordDomains = Array.from(
    new Set([...availableDomains, ...learningRecords.map((record) => record.domain)]),
  );
  const recordDomainSignature = recordDomains.join("\u0001");
  useEffect(() => {
    if (view !== "cards") return;
    const scroller = recordDomainTabsRef.current;
    if (!scroller) return;

    const updateScrollState = () => {
      const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
      setRecordDomainScrollState({
        canScrollLeft: scroller.scrollLeft > 2,
        canScrollRight: scroller.scrollLeft < maxScrollLeft - 2,
      });
    };

    updateScrollState();
    scroller.addEventListener("scroll", updateScrollState, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [view, recordDomainSignature]);

  useEffect(() => {
    if (view !== "cards") return;
    const frame = window.requestAnimationFrame(() => {
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const activeTab = recordDomainTabsRef.current?.querySelector<HTMLElement>(
        '[role="tab"][aria-selected="true"]',
      );
      activeTab?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "nearest",
        inline: "nearest",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [view, recordDomainFilter]);

  const scrollRecordDomains = (direction: -1 | 1) => {
    const scroller = recordDomainTabsRef.current;
    if (!scroller) return;
    const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const scrollDistance = Math.max(180, scroller.clientWidth * 0.65);
    const targetScrollLeft = Math.min(
      maxScrollLeft,
      Math.max(0, scroller.scrollLeft + direction * scrollDistance),
    );
    if (Math.abs(targetScrollLeft - scroller.scrollLeft) < 1) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    scroller.scrollTo({
      left: targetScrollLeft,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  };
  const filteredLearningRecords =
    recordDomainFilter === "全部领域"
      ? learningRecords
      : learningRecords.filter(
          (record) => record.domain === recordDomainFilter,
        );
  const groupedLearningRecords = Array.from(
    filteredLearningRecords.reduce((groups, record) => {
      const key = `${record.domain}::${record.skillNodeId ?? recordNodeLabel(record)}`;
      const group = groups.get(key) ?? {
        key,
        domain: record.domain,
        nodeLabel: recordNodeLabel(record),
        records: [] as InboxRecord[],
      };
      group.records.push(record);
      groups.set(key, group);
      return groups;
    }, new Map<string, { key: string; domain: string; nodeLabel: string; records: InboxRecord[] }>())
      .values(),
  ).sort((first, second) => {
    const domainDifference =
      recordDomains.indexOf(first.domain) - recordDomains.indexOf(second.domain);
    if (domainDifference !== 0) return domainDifference;
    const firstIndex = (nodeLabels[first.domain] ?? []).indexOf(first.nodeLabel);
    const secondIndex = (nodeLabels[second.domain] ?? []).indexOf(
      second.nodeLabel,
    );
    return firstIndex - secondIndex;
  });
  const renderLearningRecord = (record: InboxRecord) => (
    <article className="inbox-record" key={record.id}>
      <div className="inbox-record-meta">
        <span>{record.createdAt}</span>
        <b>
          {record.domain} · {recordNodeLabel(record)}
        </b>
        <div className="inbox-record-actions">
          <button onClick={() => openRecordEdit(record)}>编辑</button>
          <button
            className="danger"
            onClick={() => requestDeleteRecord(record)}
          >
            <Trash aria-hidden="true" weight="regular" />
            删除
          </button>
        </div>
      </div>
      <p>{recordDisplayText(record)}</p>
      {(record.images ?? (record.image ? [record.image] : [])).length > 0 && (
        <div className="inbox-record-images">
          {(record.images ?? (record.image ? [record.image] : [])).map(
            (image, index) => (
              <img
                className="inbox-record-image"
                key={`${record.id}-${index}`}
                src={image}
                alt={`记录中的图片 ${index + 1}`}
              />
            ),
          )}
        </div>
      )}
      {record.context && (
        <div className="reflection-summary">
          <span>当时场景</span>
          {record.context}
        </div>
      )}
    </article>
  );
  const now = new Date();
  const today = startOfCalendarDay(now);
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const recentDayStats = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(currentWeekStart);
    date.setDate(currentWeekStart.getDate() + index);
    const key = toDayKey(date);
    const count = learningRecords.filter((record) => {
      const dateValue = recordDate(record, now);
      return dateValue ? toDayKey(dateValue) === key : false;
    }).length;
    return {
      date,
      key,
      count,
      isToday: key === toDayKey(today),
      isFuture: date.getTime() > today.getTime(),
      label: new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(
        date,
      ),
    };
  });
  const recentDayKeys = new Set(recentDayStats.map((day) => day.key));
  const recentLearningRecords = learningRecords.filter((record) => {
    const dateValue = recordDate(record, now);
    return dateValue ? recentDayKeys.has(toDayKey(dateValue)) : false;
  });
  const activeRecentNodeCount = new Set(
    recentLearningRecords.map(
      (record) =>
        `${record.domain}::${record.skillNodeId ?? record.skillNodeLabel ?? ""}`,
    ),
  ).size;
  const activeDayKeys = new Set(
    learningRecords
      .map((record) => recordDate(record, now))
      .filter((date): date is Date => Boolean(date))
      .map(toDayKey),
  );
  let streakCursor = activeDayKeys.has(toDayKey(today))
    ? new Date(today)
    : new Date(today.getTime() - DAY_IN_MS);
  let learningStreak = 0;
  while (
    streakCursor.getTime() >= currentWeekStart.getTime() &&
    activeDayKeys.has(toDayKey(streakCursor))
  ) {
    learningStreak += 1;
    streakCursor = new Date(streakCursor.getTime() - DAY_IN_MS);
  }
  const maxRecentDayCount = Math.max(
    1,
    ...recentDayStats.map((day) => day.count),
  );

  const domainProgressStats = learningDomainCatalog.map((domain) => {
    const labels = nodeLabels[domain.name] ?? [];
    const ids = nodeIds[domain.name] ?? [];
    const domainRecords = learningRecords.filter(
      (record) => record.domain === domain.name,
    );
    const coveredCount = labels.filter((label, index) => {
      const id = ids[index];
      return domainRecords.some(
        (record) =>
          (Boolean(id) && record.skillNodeId === id) ||
          record.skillNodeLabel === label,
      );
    }).length;
    return {
      ...domain,
      totalCount: labels.length,
      coveredCount,
      recordCount: domainRecords.length,
      percentage:
        labels.length > 0
          ? Math.round((coveredCount / labels.length) * 100)
          : 0,
    };
  });
  const detailDomainStats = progressDetailDomain
    ? domainProgressStats.find((domain) => domain.name === progressDetailDomain)
    : null;
  const latestLearningRecord = [...learningRecords].sort((first, second) => {
    const firstTime = recordDate(first, now)?.getTime() ?? 0;
    const secondTime = recordDate(second, now)?.getTime() ?? 0;
    return secondTime - firstTime;
  })[0];

  const handleProgressNextAction = () => {
    if (pendingRecords.length > 0) {
      setView("inbox");
      return;
    }
    if (latestLearningRecord?.skillNodeId) {
      setSelectedDomain(latestLearningRecord.domain);
      openCapture("node");
      setCaptureDomain(latestLearningRecord.domain);
      setCaptureNodeId(latestLearningRecord.skillNodeId);
      return;
    }
    setView("tree");
  };

  const openProgressNodeCapture = (domain: string, nodeIndex: number) => {
    const nodeId = nodeIds[domain]?.[nodeIndex];
    if (!nodeId) return;
    setSelectedDomain(domain);
    openCapture("node");
    setCaptureDomain(domain);
    setCaptureNodeId(nodeId);
  };

  const captureNodeOptions = nodeLabels[captureDomain] ?? [];
  const captureNodeOptionIds = nodeIds[captureDomain] ?? [];
  const selectedCaptureNodeIndex = captureNodeOptionIds.indexOf(captureNodeId);
  const selectedCaptureNodeLabel =
    selectedCaptureNodeIndex >= 0
      ? captureNodeOptions[selectedCaptureNodeIndex]
      : "选择一个技能节点";

  const focusNodePickerOption = (target: "selected" | "first" | "last") => {
    window.requestAnimationFrame(() => {
      const options = Array.from(
        nodePickerRef.current?.querySelectorAll<HTMLButtonElement>(
          ".skill-node-option",
        ) ?? [],
      );
      if (options.length === 0) return;
      const selectedOption = options.find(
        (option) => option.dataset.nodeId === captureNodeId,
      );
      const targetOption =
        target === "last"
          ? options.at(-1)
          : target === "selected"
            ? selectedOption ?? options[0]
            : options[0];
      targetOption?.focus();
    });
  };

  const handleNodePickerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!nodePickerOpen) {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      setNodePickerOpen(true);
      focusNodePickerOption(event.key === "ArrowUp" ? "last" : "selected");
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setNodePickerOpen(false);
      nodePickerRef.current
        ?.querySelector<HTMLButtonElement>(".skill-node-trigger")
        ?.focus();
      return;
    }
    const options = Array.from(
      nodePickerRef.current?.querySelectorAll<HTMLButtonElement>(
        ".skill-node-option",
      ) ?? [],
    );
    if (options.length === 0) return;
    const currentIndex = options.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex = currentIndex;
    if (event.key === "ArrowDown") nextIndex = Math.min(currentIndex + 1, options.length - 1);
    else if (event.key === "ArrowUp") nextIndex = Math.max(currentIndex - 1, 0);
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = options.length - 1;
    else return;
    event.preventDefault();
    options[Math.max(0, nextIndex)]?.focus();
  };

  return (
    <main
      className={`app-shell ${view === "tree" && selectedDomain ? "tree-workspace-active" : ""}`}
    >
      <aside className="sidebar">
        <div className="brand-copy">个人能力成长库</div>

        <nav className="main-nav" aria-label="主导航">
          {navItems.map((item) => (
            <button
              className={`nav-item ${view === item.id ? "active" : ""}`}
              key={item.id}
              onClick={() => {
                setView(item.id);
                if (item.id === "overview") setProgressDetailDomain(null);
              }}
            >
              <span className="nav-icon">{navIcon(item.id)}</span>
              <span>
                {item.label}
                {item.id === "inbox" && pendingRecords.length > 0 && (
                  <b className="nav-count">{pendingRecords.length}</b>
                )}
              </span>
            </button>
          ))}
        </nav>

      </aside>

      <section
        className={`content-area ${view === "tree" && selectedDomain ? "tree-content" : ""}`}
      >
        <div className="page-content">
          {view === "overview" && !progressDetailDomain && (
            <section className="progress-page">
              <header className="progress-header">
                <h1>学习进展</h1>
                <p>回顾最近的积累，找到下一步。</p>
              </header>

              <section className="progress-week-card" aria-labelledby="recent-week-title">
                <h2 id="recent-week-title">本周</h2>
                <div className="progress-metric-grid">
                  <div>
                    <strong>{recentLearningRecords.length}</strong>
                    <span>条新记录</span>
                  </div>
                  <div>
                    <strong>{activeRecentNodeCount}</strong>
                    <span>个活跃节点</span>
                  </div>
                  <div>
                    <small>连续</small>
                    <strong>{learningStreak}</strong>
                    <span>天</span>
                  </div>
                </div>
                <div className="progress-week-activity" aria-label="本周学习记录分布">
                  {recentDayStats.map((day) => (
                    <div
                      className={`${day.isToday ? "is-today" : ""} ${day.isFuture ? "is-future" : ""}`.trim()}
                      key={day.key}
                      aria-current={day.isToday ? "date" : undefined}
                    >
                      <span>{day.label}</span>
                      <i
                        aria-label={`${day.label} ${day.count} 条记录`}
                        style={{
                          height: `${12 + (day.count / maxRecentDayCount) * 30}px`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section className="progress-next-card">
                <span>下一步</span>
                <h2>
                  {pendingRecords.length > 0
                    ? `还有 ${pendingRecords.length} 条记录等待整理`
                    : latestLearningRecord
                      ? `继续积累“${recordNodeLabel(latestLearningRecord)}”`
                      : "开始第一条学习记录"}
                </h2>
                <p>
                  {pendingRecords.length > 0
                    ? "先归入技能节点，让这周的学习留下来。"
                    : latestLearningRecord
                      ? "把刚学到的内容继续记录到这个技能节点。"
                      : "先选择一个技能节点，建立你的第一次积累。"}
                </p>
                <button type="button" onClick={handleProgressNextAction}>
                  {pendingRecords.length > 0
                    ? "去整理"
                    : latestLearningRecord
                      ? "继续记录"
                      : "去技能树"}
                </button>
              </section>

              <section className="progress-domain-card">
                <h2>领域积累</h2>
                <div className="progress-domain-list">
                  {domainProgressStats.map((domain) => (
                    <button
                      type="button"
                      className="progress-domain-row"
                      onClick={() => setProgressDetailDomain(domain.name)}
                      key={domain.name}
                    >
                      <span className="progress-domain-copy">
                        <strong>{domain.name}</strong>
                        <small>
                          {domain.coveredCount} / {domain.totalCount} 个节点有积累
                        </small>
                      </span>
                      <CaretRight weight="bold" aria-hidden="true" />
                      <span className="progress-domain-bar" aria-hidden="true">
                        <i style={{ width: `${domain.percentage}%` }} />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </section>
          )}

          {view === "overview" && progressDetailDomain && detailDomainStats && (
            <section className="progress-detail-page">
              <button
                type="button"
                className="progress-detail-back"
                onClick={() => setProgressDetailDomain(null)}
              >
                <CaretLeft weight="bold" aria-hidden="true" />
                返回学习进展
              </button>
              <header className="progress-detail-header">
                <div>
                  <h1>{progressDetailDomain}</h1>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDomain(progressDetailDomain);
                    setView("tree");
                  }}
                >
                  查看技能树
                </button>
              </header>

              <div className="progress-detail-metrics">
                <div>
                  <strong>{detailDomainStats.recordCount}</strong>
                  <span>条学习记录</span>
                </div>
                <div>
                  <strong>{detailDomainStats.coveredCount}</strong>
                  <span>个节点有积累</span>
                </div>
                <div>
                  <strong>
                    {
                      recentLearningRecords.filter(
                        (record) => record.domain === progressDetailDomain,
                      ).length
                    }
                  </strong>
                  <span>近7天新增</span>
                </div>
              </div>

              <section className="progress-detail-section">
                <div className="progress-detail-section-title">
                  <h2>技能节点</h2>
                  <span>
                    {detailDomainStats.coveredCount} / {detailDomainStats.totalCount} 有积累
                  </span>
                </div>
                <div className="progress-node-list">
                  {(nodeLabels[progressDetailDomain] ?? []).map((label, index) => {
                    const id = nodeIds[progressDetailDomain]?.[index];
                    const count = learningRecords.filter(
                      (record) =>
                        record.domain === progressDetailDomain &&
                        ((Boolean(id) && record.skillNodeId === id) ||
                          record.skillNodeLabel === label),
                    ).length;
                    return (
                      <button
                        type="button"
                        onClick={() => openProgressNodeCapture(progressDetailDomain, index)}
                        key={id ?? `${label}-${index}`}
                      >
                        <span>
                          <strong>{label}</strong>
                          <small>{count > 0 ? `${count} 条记录` : "尚未开始积累"}</small>
                        </span>
                        <b>{count > 0 ? "继续记录" : "开始积累"}</b>
                      </button>
                    );
                  })}
                  {(nodeLabels[progressDetailDomain] ?? []).length === 0 && (
                    <p className="progress-detail-empty">这个领域还没有技能节点。</p>
                  )}
                </div>
              </section>

              <section className="progress-detail-section">
                <div className="progress-detail-section-title">
                  <h2>最近记录</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setRecordDomainFilter(progressDetailDomain);
                      setView("cards");
                    }}
                  >
                    查看全部
                  </button>
                </div>
                <div className="progress-recent-list">
                  {learningRecords
                    .filter((record) => record.domain === progressDetailDomain)
                    .slice(0, 3)
                    .map((record) => (
                      <article key={record.id}>
                        <span>{recordNodeLabel(record)} · {record.createdAt}</span>
                        <p>{recordDisplayText(record)}</p>
                      </article>
                    ))}
                  {!learningRecords.some(
                    (record) => record.domain === progressDetailDomain,
                  ) && (
                    <p className="progress-detail-empty">这个领域还没有学习记录。</p>
                  )}
                </div>
              </section>
            </section>
          )}

          {view === "cards" && (
            <section className="view-page cards-page">
              <div className="section-title">
                <div>
                  <span className="eyebrow">02 / LEARNING RECORDS</span>
                  <h2>学习记录</h2>
                </div>
                <button
                  className="add-button"
                  onClick={() => openCapture()}
                >
                  <Plus weight="bold" />
                  新建记录
                </button>
              </div>
              <p className="view-intro">已经归入技能节点的学习内容。</p>
              <div className="record-organizer" aria-label="学习记录筛选">
                <div className="record-domain-scroll-shell">
                  <button
                    type="button"
                    className="record-domain-scroll-button previous"
                    aria-label="查看前面的学习领域"
                    aria-controls="record-domain-tabs"
                    aria-hidden={!recordDomainScrollState.canScrollLeft}
                    disabled={!recordDomainScrollState.canScrollLeft}
                    onClick={() => scrollRecordDomains(-1)}
                  >
                    <CaretLeft weight="bold" />
                  </button>
                  <div
                    ref={recordDomainTabsRef}
                    id="record-domain-tabs"
                    className="record-domain-tabs"
                    role="tablist"
                    aria-label="按领域筛选"
                  >
                    {["全部领域", ...recordDomains].map((domain) => {
                      const count =
                        domain === "全部领域"
                          ? learningRecords.length
                          : learningRecords.filter(
                              (record) => record.domain === domain,
                            ).length;
                      return (
                        <button
                          type="button"
                          role="tab"
                          aria-selected={recordDomainFilter === domain}
                          className={recordDomainFilter === domain ? "active" : ""}
                          key={domain}
                          onClick={() => setRecordDomainFilter(domain)}
                        >
                          {domain}
                          <span>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="record-domain-scroll-button next"
                    aria-label="查看更多学习领域"
                    aria-controls="record-domain-tabs"
                    aria-hidden={!recordDomainScrollState.canScrollRight}
                    disabled={!recordDomainScrollState.canScrollRight}
                    onClick={() => scrollRecordDomains(1)}
                  >
                    <CaretRight weight="bold" />
                  </button>
                </div>
                <div className="record-view-switch" aria-label="记录展示方式">
                  <button
                    type="button"
                    className={recordViewMode === "grouped" ? "active" : ""}
                    onClick={() => setRecordViewMode("grouped")}
                  >
                    按技能节点
                  </button>
                  <button
                    type="button"
                    className={recordViewMode === "all" ? "active" : ""}
                    onClick={() => setRecordViewMode("all")}
                  >
                    全部记录
                  </button>
                </div>
              </div>
              {learningRecords.length === 0 ? (
                <div className="inbox-empty">还没有归入技能节点的记录。</div>
              ) : filteredLearningRecords.length === 0 ? (
                <div className="inbox-empty">这个领域还没有学习记录。</div>
              ) : recordViewMode === "grouped" ? (
                <div className="record-node-groups">
                  {groupedLearningRecords.map((group, index) => (
                    <details
                      className="record-node-group"
                      key={group.key}
                      open={index === 0 ? true : undefined}
                    >
                      <summary>
                        <span className="record-node-group-icon">
                          {skillIcon(group.nodeLabel, index)}
                        </span>
                        <span className="record-node-group-copy">
                          <small>{group.domain}</small>
                          <strong>{group.nodeLabel}</strong>
                        </span>
                        <span className="record-node-group-count">
                          {group.records.length} 条
                        </span>
                        <CaretDown weight="bold" />
                      </summary>
                      <div className="record-node-records">
                        {group.records.map(renderLearningRecord)}
                      </div>
                    </details>
                  ))}
                </div>
              ) : (
                <div className="inbox-list learning-record-list">
                  {filteredLearningRecords.map(renderLearningRecord)}
                </div>
              )}
            </section>
          )}

          {view === "tree" && !selectedDomain && (
            <section className="view-page tree-page">
              <div className="section-title">
                <div>
                  <h2>我的技能树</h2>
                </div>
                <button className="add-button" onClick={openAddDomain}>
                  <Plus weight="regular" />
                  添加学习领域
                </button>
              </div>
              <p className="view-intro">
                选择一个领域，查看技能节点和学习记录。
              </p>
              <div className="domain-card-grid">
                {visibleDomainCatalog.map((domain) => {
                  const count = inboxRecords.filter(
                    (record) => (record.domain ?? "未选择领域") === domain.name,
                  ).length;
                  return (
                    <article
                      className={`domain-card ${domain.tone}`}
                      key={domain.name}
                    >
                      <button
                        className="domain-card-open"
                        onClick={() => setSelectedDomain(domain.name)}
                      >
                        <div className="domain-card-topline">
                          <span>学习领域</span>
                        </div>
                        <h3>{domain.name}</h3>
                        <p>{domain.summary}</p>
                        <div className="domain-card-meta">
                          <span>
                            {nodeLabels[domain.name]?.length ?? 0} 个节点
                          </span>
                          <strong>{count} 条记录</strong>
                        </div>
                      </button>
                      <button
                        className="domain-card-edit"
                        aria-label={`编辑${domain.name}`}
                        onClick={() => openDomainEdit(domain)}
                      >
                        <PencilSimple weight="regular" />
                        <span>编辑</span>
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {view === "tree" && selectedDomain && (
            <section className="view-page tree-page tree-workspace">
              <div className="skill-tree-titlebar">
                <div className="skill-tree-title">
                  <h1>{selectedDomain}</h1>
                </div>
                <div className="domain-detail-actions">
                  <button
                    className="domain-switch-button"
                    onClick={() => setSelectedDomain(null)}
                  >
                    <Globe weight="regular" />
                    切换领域
                    <CaretDown weight="bold" />
                  </button>
                  <button
                    className="tree-quick-record-button"
                    onClick={() => openCapture("inbox")}
                  >
                    <Plus weight="regular" />
                    <span>快速记录</span>
                  </button>
                  <button
                    className="ai-button"
                    onClick={openAiInterview}
                    disabled={aiGenerating}
                  >
                    <Sparkle weight="fill" />
                    <span>{aiGenerating ? "生成中…" : "AI 生成"}</span>
                  </button>
                </div>
              </div>
              <ForceSkillMap
                key={selectedDomain}
                domain={selectedDomain}
                rootLabel={rootLabels[selectedDomain] ?? selectedDomain}
                labels={nodeLabels[selectedDomain] ?? []}
                colors={nodeColors[selectedDomain] ?? []}
                sizes={nodeSizes[selectedDomain] ?? []}
                parents={nodeParents[selectedDomain] ?? []}
                edges={nodeEdges[selectedDomain] ?? []}
                nodeIds={nodeIds[selectedDomain] ?? []}
                positions={nodePositions[selectedDomain] ?? {}}
                onPositionsChange={(positions) =>
                  setNodePositions((all) => ({
                    ...all,
                    [selectedDomain]: positions,
                  }))
                }
                onAdd={addSkillNode}
                onConnect={connectSkillNodes}
                onDelete={deleteSkillNode}
                onDeleteMany={deleteSkillNodes}
                onSaveRecord={saveNodeQuickRecord}
                onOpenRecord={(index) =>
                  openProgressNodeCapture(selectedDomain, index)
                }
                onResize={(index, nextSize) =>
                  setNodeSizes((sizes) => ({
                    ...sizes,
                    [selectedDomain]: (sizes[selectedDomain] ?? []).map(
                      (value, valueIndex) =>
                        valueIndex === index ? nextSize : value,
                    ),
                  }))
                }
                onEditRoot={openRootEdit}
                onEdit={(index, label, color) => {
                  setEditingNode({ index, label, color });
                  setEditingNodeText(label);
                }}
              />
            </section>
          )}

          {view === "inbox" && (
            <section
              className={`inbox-section ${inboxManageMode ? "is-managing" : ""}`}
            >
              <div className="section-title">
                <div>
                  <span className="eyebrow">03 / INBOX</span>
                  <h2>待整理</h2>
                </div>
                <div className="inbox-section-header-actions">
                  {pendingRecords.length > 0 && (
                    <button
                      type="button"
                      className={`inbox-manage-toggle ${inboxManageMode ? "active" : ""}`}
                      aria-pressed={inboxManageMode}
                      onClick={toggleInboxManageMode}
                    >
                      {inboxManageMode ? "完成" : "管理"}
                    </button>
                  )}
                  {!inboxManageMode && (
                    <button
                      className="add-button"
                      onClick={() => openCapture("inbox")}
                    >
                      <Plus weight="bold" />
                      新建待整理
                    </button>
                  )}
                </div>
              </div>
              {pendingRecords.length > 0 && (
                <div
                  className="record-domain-scroll-shell inbox-domain-filter"
                  aria-label="待整理记录领域筛选"
                >
                  <button
                    type="button"
                    className="record-domain-scroll-button previous"
                    aria-label="查看前面的学习领域"
                    aria-controls="inbox-domain-tabs"
                    aria-hidden={!inboxDomainScrollState.canScrollLeft}
                    disabled={!inboxDomainScrollState.canScrollLeft}
                    onClick={() => scrollInboxDomains(-1)}
                  >
                    <CaretLeft weight="bold" />
                  </button>
                  <div
                    ref={inboxDomainTabsRef}
                    id="inbox-domain-tabs"
                    className="record-domain-tabs"
                    role="tablist"
                    aria-label="按领域筛选待整理记录"
                  >
                    {["全部领域", ...pendingRecordDomains].map((domain) => {
                      const count =
                        domain === "全部领域"
                          ? pendingRecords.length
                          : pendingRecords.filter(
                              (record) =>
                                (record.domain || "未选择领域") === domain,
                            ).length;
                      return (
                        <button
                          type="button"
                          role="tab"
                          aria-selected={inboxDomainFilter === domain}
                          className={inboxDomainFilter === domain ? "active" : ""}
                          key={domain}
                          onClick={() => setInboxDomainFilter(domain)}
                        >
                          {domain}
                          <span>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="record-domain-scroll-button next"
                    aria-label="查看更多学习领域"
                    aria-controls="inbox-domain-tabs"
                    aria-hidden={!inboxDomainScrollState.canScrollRight}
                    disabled={!inboxDomainScrollState.canScrollRight}
                    onClick={() => scrollInboxDomains(1)}
                  >
                    <CaretRight weight="bold" />
                  </button>
                </div>
              )}
              {pendingRecords.length === 0 ? (
                <div className="inbox-empty">暂时没有待整理内容。</div>
              ) : filteredPendingRecords.length === 0 ? (
                <div className="inbox-empty">这个领域暂时没有待整理内容。</div>
              ) : (
                <div className="inbox-list">
                  {filteredPendingRecords.map((record) => {
                    const selected = selectedPendingRecordIdSet.has(record.id);
                    return (
                    <article
                      className={`inbox-record pending-record ${inboxManageMode ? "is-selectable" : ""} ${selected ? "is-selected" : ""}`}
                      key={record.id}
                      role={inboxManageMode ? "checkbox" : undefined}
                      aria-checked={inboxManageMode ? selected : undefined}
                      tabIndex={inboxManageMode ? 0 : undefined}
                      onClick={() => {
                        if (inboxManageMode)
                          togglePendingRecordSelection(record.id);
                      }}
                      onKeyDown={(event) => {
                        if (
                          inboxManageMode &&
                          (event.key === "Enter" || event.key === " ")
                        ) {
                          event.preventDefault();
                          togglePendingRecordSelection(record.id);
                        }
                      }}
                    >
                      <div className="inbox-record-meta">
                        {inboxManageMode && (
                          <span
                            className="inbox-selection-mark"
                            aria-hidden="true"
                          >
                            {selected && <Check weight="bold" />}
                          </span>
                        )}
                        <span>{record.createdAt}</span>
                        <b>{record.domain ?? "未选择领域"} · 待归入节点</b>
                      </div>
                      <p>{recordDisplayText(record)}</p>
                      {!inboxManageMode && (
                        <div className="inbox-record-actions pending-record-actions">
                          <button
                            className="recommend-action"
                            aria-label="让 AI 推荐这条记录的归属节点"
                            disabled={recordSuggestionLoadingId === record.id}
                            onClick={() => recommendRecordDestination(record)}
                          >
                            <Sparkle aria-hidden="true" weight="fill" />
                            {recordSuggestionLoadingId === record.id
                              ? "分析中…"
                              : "AI 推荐归属"}
                          </button>
                          <button
                            aria-label="把这条记录归入技能节点"
                            onClick={() => openRecordEdit(record)}
                          >
                            手动归入
                          </button>
                          <button
                            className="danger"
                            aria-label="删除这条记录"
                            onClick={() => requestDeleteRecord(record)}
                          >
                            <Trash aria-hidden="true" weight="regular" />
                            删除
                          </button>
                        </div>
                      )}
                      {!inboxManageMode && recordSuggestions[record.id] && (
                        <div className="record-suggestion">
                          <div>
                            <span>
                              {recordSuggestions[record.id].source === "api"
                                ? "AI 推荐"
                                : "本地建议"}
                            </span>
                            <strong>
                              {recordSuggestions[record.id].domain} ·{" "}
                              {recordSuggestions[record.id].nodeLabel}
                            </strong>
                            <p>{recordSuggestions[record.id].reason}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              applyRecordSuggestion(
                                record.id,
                                recordSuggestions[record.id],
                              )
                            }
                          >
                            确认归入
                          </button>
                        </div>
                      )}
                      {(record.images ?? (record.image ? [record.image] : []))
                        .length > 0 && (
                        <div className="inbox-record-images">
                          {(
                            record.images ??
                            (record.image ? [record.image] : [])
                          ).map((image, index) => (
                            <img
                              className="inbox-record-image"
                              key={`${record.id}-${index}`}
                              src={image}
                              alt={`记录中的图片 ${index + 1}`}
                            />
                          ))}
                        </div>
                      )}
                      {record.context && (
                        <div className="reflection-summary">
                          <span>当时场景</span>
                          {record.context}
                          {record.trigger && ` · 触发：${record.trigger}`}
                        </div>
                      )}
                    </article>
                    );
                  })}
                </div>
              )}
              {inboxManageMode && pendingRecords.length > 0 && (
                <div className="inbox-manage-bar" role="toolbar" aria-label="批量管理待整理记录">
                  <div className="inbox-manage-summary" aria-live="polite">
                    <strong>已选择 {selectedPendingRecordIds.length} 条</strong>
                    <span>当前显示 {filteredPendingRecords.length} 条</span>
                  </div>
                  <div className="inbox-manage-actions">
                    <button type="button" onClick={toggleVisiblePendingRecords}>
                      {allFilteredPendingSelected ? "取消全选" : "全选当前"}
                    </button>
                    <button
                      type="button"
                      className="primary"
                      disabled={selectedPendingRecordIds.length === 0}
                      onClick={openBatchAssign}
                    >
                      归入节点
                    </button>
                    <button
                      type="button"
                      disabled={selectedPendingRecordIds.length === 0}
                      onClick={() => setPendingBatchDelete(true)}
                    >
                      <Trash weight="regular" aria-hidden="true" />
                      删除
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </section>

      <nav className="mobile-nav" aria-label="手机端主导航">
        {navItems.map((item) => (
          <button
            className={view === item.id ? "active" : ""}
            key={item.id}
            onClick={() => {
              setView(item.id);
              if (item.id === "overview") setProgressDetailDomain(null);
            }}
          >
            <span className="mobile-nav-icon">{navIcon(item.id)}</span>
            <span>{mobileNavLabel(item.id)}</span>
            {item.id === "inbox" && pendingRecords.length > 0 && (
              <b>{pendingRecords.length}</b>
            )}
          </button>
        ))}
      </nav>

      {selectedCard && (
        <div className="modal-backdrop" onClick={() => setSelectedCard(null)}>
          <article
            className="learning-card-detail"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="detail-topline">
              <span className={`card-dot ${selectedCard.tone}`} />
              <span>{selectedCard.tag}</span>
              <button
                className="close-button"
                onClick={() => setSelectedCard(null)}
              >
                <X weight="bold" />
              </button>
            </div>
            <p className="eyebrow">LEARNING CARD / {selectedCard.status}</p>
            <h2>{selectedCard.title}</h2>
            <div className="detail-section">
              <span>我学到了什么</span>
              <p>{selectedCard.learned}</p>
            </div>
            <div className="detail-meta-grid">
              <div>
                <span>所属领域</span>
                <strong>{selectedCard.tag}</strong>
              </div>
              <div>
                <span>技能树节点</span>
                <strong>{selectedCard.skillNode}</strong>
              </div>
            </div>
            <div className="detail-section">
              <span>我的理解</span>
              <p>{selectedCard.understanding}</p>
            </div>
            <div className="detail-section">
              <span>什么时候能用</span>
              <p>{selectedCard.useCase}</p>
            </div>
            <div className="detail-section">
              <span>关联素材和行动记录</span>
              <p>{selectedCard.related}</p>
            </div>
            <div className="detail-next">
              <span>下一步行动</span>
              <strong>{selectedCard.nextStep}</strong>
            </div>
            <button
              className="detail-done-button"
              onClick={() => setSelectedCard(null)}
            >
              看完了
            </button>
          </article>
        </div>
      )}

      {editingNode && (
        <div className="modal-backdrop" onClick={discardEditingNode}>
          <div
            className="node-edit-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="eyebrow">EDIT NODE</span>
            <h2>编辑技能节点</h2>
            <p>把它改成你真正想发展的能力方向。</p>
            <input
              value={editingNodeText}
              onChange={(event) => setEditingNodeText(event.target.value)}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  const nextText = editingNodeText.trim();
                  if (nextText && selectedDomain && editingNode) {
                    setNodeLabels((labels) => ({
                      ...labels,
                      [selectedDomain]: labels[selectedDomain].map(
                        (label, index) =>
                          index === editingNode.index ? nextText : label,
                      ),
                    }));
                    setNodeColors((colors) => ({
                      ...colors,
                      [selectedDomain]: (colors[selectedDomain] ?? []).map(
                        (color, index) =>
                          index === editingNode.index
                            ? editingNode.color
                            : color,
                      ),
                    }));
                    setEditingNode(null);
                  }
                }
              }}
            />
            <div className="node-color-control">
              <span>节点颜色</span>
              <div className="node-color-options">
                {nodeColorPalette.map((color) => (
                  <button
                    className={editingNode.color === color ? "selected" : ""}
                    key={color}
                    style={{ background: color }}
                    aria-label={`选择颜色 ${color}`}
                    onClick={() =>
                      setEditingNode((node) =>
                        node ? { ...node, color } : node,
                      )
                    }
                  />
                ))}
              </div>
            </div>
            <div className="node-edit-actions">
              <button className="plain-link" onClick={discardEditingNode}>
                取消
              </button>
              <button
                className="add-button"
                onClick={() => {
                  const nextText = editingNodeText.trim();
                  if (!nextText || !selectedDomain || !editingNode) return;
                  setNodeLabels((labels) => ({
                    ...labels,
                    [selectedDomain]: labels[selectedDomain].map(
                      (label, index) =>
                        index === editingNode.index ? nextText : label,
                    ),
                  }));
                  setNodeColors((colors) => ({
                    ...colors,
                    [selectedDomain]: (colors[selectedDomain] ?? []).map(
                      (color, index) =>
                        index === editingNode.index ? editingNode.color : color,
                    ),
                  }));
                  setEditingNode(null);
                }}
              >
                保存节点
              </button>
            </div>
          </div>
        </div>
      )}

      {editingRoot && (
        <div className="modal-backdrop" onClick={() => setEditingRoot(false)}>
          <div
            className="node-edit-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="eyebrow">EDIT ROOT</span>
            <h2>编辑核心节点</h2>
            <p>给这个领域一个更准确、对你有意义的能力名称。</p>
            <input
              value={editingRootText}
              onChange={(event) => setEditingRootText(event.target.value)}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") saveRootEdit();
              }}
            />
            <div className="node-edit-actions">
              <button
                className="plain-link"
                onClick={() => setEditingRoot(false)}
              >
                取消
              </button>
              <button className="add-button" onClick={saveRootEdit}>
                保存核心节点
              </button>
            </div>
          </div>
        </div>
      )}

      {aiInterviewOpen && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!aiGenerating) setAiInterviewOpen(false);
          }}
        >
          <div
            className="ai-interview-modal"
            aria-busy={aiGenerating}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ai-draft-head">
              <div>
                <span className="eyebrow">AI PROFILE INTERVIEW</span>
                <h2>{aiGenerating ? "技能树正在生长" : "先了解你，再生成"}</h2>
              </div>
              <button
                className="close-button"
                disabled={aiGenerating}
                onClick={() => setAiInterviewOpen(false)}
              >
                <X weight="bold" />
              </button>
            </div>
            {aiGenerating ? (
              <div
                className="ai-generating-view"
                role="status"
                aria-live="polite"
              >
                <div className="ai-generation-orbit">
                  <span className="ai-generation-core">AI</span>
                  <i className="orbit-one">
                    <b />
                  </i>
                  <i className="orbit-two">
                    <b />
                  </i>
                  <i className="orbit-three">
                    <b />
                  </i>
                </div>
                <h3>正在根据你的画像生成技能树</h3>
                <p>AI 正在判断你需要学习什么，以及应该学到多深。</p>
                <div className="ai-generation-steps">
                  <span>分析身份与目标</span>
                  <span>调整专业深度</span>
                  <span>组织节点层级</span>
                </div>
              </div>
            ) : (
              <>
                <p className="ai-interview-intro">
                  AI
                  会根据你的身份、基础和目标，判断这棵技能树应该学到什么深度。
                </p>
                <div className="ai-interview-chat">
                  {aiInterviewMessages.map((message, index) => (
                    <div
                      className={`ai-interview-message ${message.role}`}
                      key={`${message.role}-${index}`}
                    >
                      <span>{message.role === "assistant" ? "AI" : "你"}</span>
                      <p>{message.content}</p>
                    </div>
                  ))}
                  {aiInterviewLoading && (
                    <div className="ai-interview-message assistant">
                      <span>AI</span>
                      <p>正在判断还需要了解什么…</p>
                    </div>
                  )}
                </div>
                {aiProfileSummary && (
                  <div className="ai-profile-summary">
                    <span>AI 对你的判断</span>
                    <p>{aiProfileSummary}</p>
                  </div>
                )}
                <div className="ai-interview-compose">
                  <textarea
                    value={aiInterviewInput}
                    onChange={(event) =>
                      setAiInterviewInput(event.target.value)
                    }
                    placeholder="补充你的身份、经验、目标、使用场景或可投入时间…"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void sendAiInterviewMessage();
                      }
                    }}
                  />
                  <button
                    onClick={() => void sendAiInterviewMessage()}
                    disabled={!aiInterviewInput.trim() || aiInterviewLoading}
                  >
                    发送
                  </button>
                </div>
                <div className="ai-interview-actions">
                  <button
                    className="plain-link"
                    onClick={() => setAiInterviewOpen(false)}
                  >
                    取消
                  </button>
                  <button
                    className="add-button"
                    disabled={!aiInterviewReady}
                    onClick={() => void generateSkillTree()}
                  >
                    {aiInterviewReady ? "根据画像生成技能树" : "完成访谈后生成"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {aiDraft && (
        <div className="modal-backdrop" onClick={() => setAiDraft(null)}>
          <div
            className="ai-draft-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ai-draft-scroll">
              <div className="ai-draft-head">
                <div>
                  <span className="eyebrow">AI SKILL TREE DRAFT</span>
                  <h2>技能树草案</h2>
                </div>
                <button
                  className="close-button"
                  onClick={() => setAiDraft(null)}
                >
                  <X weight="bold" />
                </button>
              </div>
              <p className="ai-draft-summary">{aiDraft.summary}</p>
              <div className="ai-draft-source">
                {aiDraft.source === "api"
                  ? "来自 AI 接口"
                  : "当前为本地演示生成器，接入 API 后会自动切换"}
              </div>
              <SkillTreeDraftPreview
                rootLabel={selectedDomain ?? "目标领域"}
                nodes={aiDraft.nodes}
              />
              <section
                className="ai-apply-mode"
                aria-label="选择 AI 技能树的应用方式"
              >
                <div className="ai-apply-mode-head">
                  <div>
                    <strong>应用方式</strong>
                    <span>采用前先决定是否保留当前节点</span>
                  </div>
                  {aiApplyMode === "replace" && (
                    <small>
                      将替换 {nodeLabels[selectedDomain ?? ""]?.length ?? 0}{" "}
                      个现有节点
                    </small>
                  )}
                </div>
                <div className="ai-apply-mode-options">
                  <button
                    className={aiApplyMode === "append" ? "selected" : ""}
                    aria-pressed={aiApplyMode === "append"}
                    onClick={() => setAiApplyMode("append")}
                  >
                    <strong>追加到当前</strong>
                    <span>保留当前技能树，再加入勾选节点</span>
                  </button>
                  <button
                    className={aiApplyMode === "replace" ? "selected" : ""}
                    aria-pressed={aiApplyMode === "replace"}
                    onClick={() => setAiApplyMode("replace")}
                  >
                    <strong>覆盖当前并采用</strong>
                    <span>清空旧节点，只使用这份 AI 技能树</span>
                  </button>
                </div>
              </section>
              <div className="ai-draft-list">
                {aiDraft.nodes.map((node, index) => (
                  <label
                    className={`ai-draft-item ${node.selected ? "selected" : ""}`}
                    key={node.id}
                  >
                    <input
                      type="checkbox"
                      checked={node.selected}
                      onChange={() =>
                        setAiDraft((draft) =>
                          draft
                            ? {
                                ...draft,
                                nodes: draft.nodes.map((item) =>
                                  item.id === node.id
                                    ? { ...item, selected: !item.selected }
                                    : item,
                                ),
                              }
                            : draft,
                        )
                      }
                    />
                    <input
                      className="ai-draft-label"
                      value={node.label}
                      onChange={(event) =>
                        setAiDraft((draft) =>
                          draft
                            ? {
                                ...draft,
                                nodes: draft.nodes.map((item) =>
                                  item.id === node.id
                                    ? { ...item, label: event.target.value }
                                    : item,
                                ),
                              }
                            : draft,
                        )
                      }
                    />
                    <span>{node.parentId ? "子节点" : "一级方向"}</span>
                    <b>0{index + 1}</b>
                  </label>
                ))}
              </div>
              <div className="ai-draft-actions">
                <button className="plain-link" onClick={() => setAiDraft(null)}>
                  取消
                </button>
                <button className="add-button" onClick={applyAiDraft}>
                  {aiApplyMode === "replace"
                    ? "采用 AI 技能树"
                    : "追加到当前技能树"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteNode && (
        <div
          className="modal-backdrop"
          onClick={() => setPendingDeleteNode(null)}
        >
          <div
            className="node-edit-modal delete-confirm-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="eyebrow">DELETE NODE</span>
            <h2>删除技能节点</h2>
            <p>
              {pendingDeleteNode.indices.length === 1 ? (
                <>确定删除“{pendingDeleteNode.labels[0]}”吗？</>
              ) : (
                <>
                  确定删除选中的 {pendingDeleteNode.indices.length} 个节点吗？
                </>
              )}
              删除后当前节点内容不会保留。
            </p>
            <div className="node-edit-actions">
              <button
                className="plain-link"
                onClick={() => setPendingDeleteNode(null)}
              >
                取消
              </button>
              <button
                className="delete-confirm-button"
                onClick={confirmDeleteSkillNode}
              >
                删除节点
              </button>
            </div>
          </div>
        </div>
      )}

      {batchAssignOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setBatchAssignOpen(false)}
        >
          <div
            className="node-edit-modal batch-assign-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="batch-assign-head">
              <div>
                <span className="eyebrow">ORGANIZE RECORDS</span>
                <h2>批量归入节点</h2>
              </div>
              <button
                type="button"
                className="close-button"
                aria-label="关闭批量归入弹窗"
                onClick={() => setBatchAssignOpen(false)}
              >
                <X weight="bold" />
              </button>
            </div>
            <p className="batch-assign-description">
              将选中的 {selectedPendingRecordIds.length} 条记录归入同一个技能节点。
            </p>
            <div className="domain-select-label batch-domain-select">
              <span>学习领域</span>
              <div className="domain-picker">
                {availableDomains.map((domain) => (
                  <button
                    type="button"
                    className={`domain-chip ${batchAssignDomain === domain ? "selected" : ""}`}
                    key={domain}
                    aria-pressed={batchAssignDomain === domain}
                    onClick={() => {
                      setBatchAssignDomain(domain);
                      setBatchAssignNodeId("");
                    }}
                  >
                    {domain}
                  </button>
                ))}
              </div>
            </div>
            <div className="batch-node-select">
              <span>技能节点</span>
              {(nodeLabels[batchAssignDomain] ?? []).length > 0 ? (
                <div className="batch-node-grid" role="listbox" aria-label="选择批量归入的技能节点">
                  {(nodeLabels[batchAssignDomain] ?? []).map((label, index) => {
                    const nodeId = nodeIds[batchAssignDomain]?.[index] ?? "";
                    const selected = nodeId === batchAssignNodeId;
                    return (
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={selected ? "selected" : ""}
                        key={nodeId || `${batchAssignDomain}-${index}`}
                        onClick={() => setBatchAssignNodeId(nodeId)}
                      >
                        <span>{label}</span>
                        {selected && <Check weight="bold" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="batch-node-empty">
                  这个领域还没有技能节点，请先在技能树中创建节点。
                </div>
              )}
            </div>
            <div className="node-edit-actions batch-assign-actions">
              <button
                type="button"
                className="plain-link"
                onClick={() => setBatchAssignOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="add-button"
                disabled={!batchAssignNodeId}
                onClick={confirmBatchAssign}
              >
                确认归入
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingBatchDelete && (
        <div
          className="modal-backdrop"
          onClick={() => setPendingBatchDelete(false)}
        >
          <div
            className="node-edit-modal delete-confirm-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="eyebrow">DELETE RECORDS</span>
            <h2>批量删除记录</h2>
            <p>
              确定删除选中的 {selectedPendingRecordIds.length} 条记录吗？删除后将无法恢复。
            </p>
            <div className="node-edit-actions">
              <button
                type="button"
                className="plain-link"
                onClick={() => setPendingBatchDelete(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="delete-confirm-button"
                onClick={confirmBatchDeleteRecords}
              >
                删除记录
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteRecord && (
        <div
          className="modal-backdrop"
          onClick={() => setPendingDeleteRecord(null)}
        >
          <div
            className="node-edit-modal delete-confirm-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="eyebrow">DELETE RECORD</span>
            <h2>删除学习记录</h2>
            <p>确定删除这条记录吗？删除后将无法恢复。</p>
            <div className="delete-record-preview">
              “{pendingDeleteRecord.text}
              {pendingDeleteRecord.text.length >= 42 ? "…" : ""}”
            </div>
            <div className="node-edit-actions">
              <button
                className="plain-link"
                onClick={() => setPendingDeleteRecord(null)}
              >
                取消
              </button>
              <button
                className="delete-confirm-button"
                onClick={confirmDeleteRecord}
              >
                删除记录
              </button>
            </div>
          </div>
        </div>
      )}

      {editingDomain && (
        <div className="modal-backdrop" onClick={() => setEditingDomain(null)}>
          <div
            className="node-edit-modal add-domain-modal edit-domain-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="add-domain-modal-head">
              <div>
                <span className="eyebrow">EDIT LEARNING DOMAIN</span>
                <h2>编辑学习领域</h2>
              </div>
              <button
                className="close-button"
                aria-label="关闭编辑学习领域弹窗"
                onClick={() => setEditingDomain(null)}
              >
                <X weight="bold" />
              </button>
            </div>
            <p>修改后会同步更新该领域的技能树和所有关联记录。</p>
            <label className="add-domain-field">
              <span>领域名称</span>
              <input
                value={editingDomain.name}
                maxLength={24}
                autoFocus
                onChange={(event) =>
                  setEditingDomain({
                    ...editingDomain,
                    name: event.target.value,
                  })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveDomainEdit();
                }}
              />
            </label>
            <label className="add-domain-field">
              <span>领域介绍</span>
              <textarea
                value={editingDomain.summary}
                maxLength={80}
                onChange={(event) =>
                  setEditingDomain({
                    ...editingDomain,
                    summary: event.target.value,
                  })
                }
              />
            </label>
            {editingDomain.name.trim() !== editingDomain.originalName &&
              availableDomains.includes(editingDomain.name.trim()) && (
                <p className="add-domain-error">这个学习领域已经存在。</p>
              )}
            <div className="edit-domain-actions">
              <button
                className="domain-delete-trigger"
                disabled={learningDomainCatalog.length <= 1}
                title={
                  learningDomainCatalog.length <= 1
                    ? "至少保留一个学习领域"
                    : "删除这个学习领域"
                }
                onClick={() =>
                  setPendingDeleteDomain(editingDomain.originalName)
                }
              >
                <Trash weight="regular" />
                删除领域
              </button>
              <div className="node-edit-actions">
                <button
                  className="plain-link"
                  onClick={() => setEditingDomain(null)}
                >
                  取消
                </button>
                <button
                  className="add-button"
                  disabled={
                    !editingDomain.name.trim() ||
                    (editingDomain.name.trim() !==
                      editingDomain.originalName &&
                      availableDomains.includes(editingDomain.name.trim()))
                  }
                  onClick={saveDomainEdit}
                >
                  保存修改
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteDomain && (
        <div
          className="modal-backdrop"
          onClick={() => setPendingDeleteDomain(null)}
        >
          <div
            className="node-edit-modal delete-confirm-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="eyebrow">DELETE DOMAIN</span>
            <h2>删除“{pendingDeleteDomain}”？</h2>
            <p>
              该领域的 {nodeLabels[pendingDeleteDomain]?.length ?? 0} 个技能节点会被删除，
              {
                inboxRecords.filter(
                  (record) => record.domain === pendingDeleteDomain,
                ).length
              }{" "}
              条学习记录会转入待整理，不会丢失。
            </p>
            <div className="node-edit-actions">
              <button
                className="plain-link"
                onClick={() => setPendingDeleteDomain(null)}
              >
                取消
              </button>
              <button
                className="delete-confirm-button domain-delete-confirm-button"
                onClick={confirmDeleteLearningDomain}
              >
                确认删除领域
              </button>
            </div>
          </div>
        </div>
      )}

      {addDomainOpen && (
        <div className="modal-backdrop" onClick={() => setAddDomainOpen(false)}>
          <div
            className="node-edit-modal add-domain-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="add-domain-modal-head">
              <div>
                <span className="eyebrow">NEW LEARNING DOMAIN</span>
                <h2>添加学习领域</h2>
              </div>
              <button
                className="close-button"
                aria-label="关闭添加学习领域弹窗"
                onClick={() => setAddDomainOpen(false)}
              >
                <X weight="bold" />
              </button>
            </div>
            <p>先建立领域，之后可以手动添加节点或让 AI 生成技能树。</p>
            <label className="add-domain-field">
              <span>领域名称</span>
              <input
                value={newDomainName}
                maxLength={24}
                autoFocus
                placeholder="例如：摄影、数据分析"
                onChange={(event) => setNewDomainName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") addLearningDomain();
                }}
              />
            </label>
            <label className="add-domain-field">
              <span>简短说明（选填）</span>
              <textarea
                value={newDomainSummary}
                maxLength={80}
                placeholder="你想在这个领域获得什么能力？"
                onChange={(event) => setNewDomainSummary(event.target.value)}
              />
            </label>
            {newDomainName.trim() &&
              availableDomains.includes(newDomainName.trim()) && (
                <p className="add-domain-error">这个学习领域已经存在。</p>
              )}
            <div className="node-edit-actions">
              <button
                className="plain-link"
                onClick={() => setAddDomainOpen(false)}
              >
                取消
              </button>
              <button
                className="add-button"
                disabled={
                  !newDomainName.trim() ||
                  availableDomains.includes(newDomainName.trim())
                }
                onClick={addLearningDomain}
              >
                添加领域
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setShowModal(false);
            setEditingRecordId(null);
          }}
        >
          <div
            className="capture-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="capture-modal-head">
              <div>
                <span className="eyebrow lime-text">
                  {editingRecordId ? "EDIT RECORD" : "QUICK CAPTURE"}
                </span>
                <h2>
                  {editingRecordId ? "整理学习记录" : "快速记录"}
                </h2>
              </div>
              <button
                className="close-button"
                onClick={() => {
                  setShowModal(false);
                  setEditingRecordId(null);
                }}
              >
                <X weight="bold" />
              </button>
            </div>
            <div className="domain-select-label">
              <span>学习领域</span>
              <div className="domain-picker">
                {availableDomains.map((domain) => (
                  <button
                    className={`domain-chip ${captureDomain === domain ? "selected" : ""}`}
                    key={domain}
                    onClick={() => {
                      setCaptureDomain(domain);
                      setCaptureNodeId("");
                      setNodePickerOpen(false);
                    }}
                    aria-pressed={captureDomain === domain}
                  >
                    {domain}
                  </button>
                ))}
              </div>
            </div>
            <div className="capture-destination-control">
              <span>记录归属</span>
              <div className="capture-destination-switch">
                <button
                  className={captureDestination === "node" ? "selected" : ""}
                  onClick={() => {
                    setCaptureDestination("node");
                    setNodePickerOpen(false);
                  }}
                >
                  归入技能节点
                </button>
                <button
                  className={captureDestination === "inbox" ? "selected" : ""}
                  onClick={() => {
                    setCaptureDestination("inbox");
                    setCaptureNodeId("");
                    setNodePickerOpen(false);
                  }}
                >
                  暂时待整理
                </button>
              </div>
              {captureDestination === "node" && (
                <div className="skill-node-select">
                  <span>技能节点</span>
                  <div
                    className="skill-node-picker"
                    ref={nodePickerRef}
                    onKeyDown={handleNodePickerKeyDown}
                  >
                    <button
                      type="button"
                      className={`skill-node-trigger ${nodePickerOpen ? "is-open" : ""}`}
                      aria-haspopup="listbox"
                      aria-expanded={nodePickerOpen}
                      aria-controls="capture-node-listbox"
                      onClick={() => {
                        const nextOpen = !nodePickerOpen;
                        setNodePickerOpen(nextOpen);
                        if (nextOpen) focusNodePickerOption("selected");
                      }}
                    >
                      <span className={captureNodeId ? "" : "is-placeholder"}>
                        {selectedCaptureNodeLabel}
                      </span>
                      <CaretDown weight="bold" aria-hidden="true" />
                    </button>
                    {nodePickerOpen && (
                      <div
                        className="skill-node-menu"
                        id="capture-node-listbox"
                        role="listbox"
                        aria-label="选择技能节点"
                      >
                        {captureNodeOptions.map((label, index) => {
                          const nodeId = captureNodeOptionIds[index] ?? "";
                          const selected = nodeId === captureNodeId;
                          return (
                            <button
                              type="button"
                              className={`skill-node-option ${selected ? "selected" : ""}`}
                              key={nodeId || `${captureDomain}-${index}`}
                              data-node-id={nodeId}
                              role="option"
                              aria-selected={selected}
                              onClick={() => {
                                setCaptureNodeId(nodeId);
                                setNodePickerOpen(false);
                                window.requestAnimationFrame(() =>
                                  nodePickerRef.current
                                    ?.querySelector<HTMLButtonElement>(
                                      ".skill-node-trigger",
                                    )
                                    ?.focus(),
                                );
                              }}
                            >
                              <span>{label}</span>
                              {selected && <Check weight="bold" aria-hidden="true" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <label className="capture-label">
              刚刚捕捉到的内容
              <textarea
                value={captureText}
                onChange={(event) => setCaptureText(event.target.value)}
                onPaste={handleCapturePaste}
                placeholder="一句话、一个链接，或者一段还没想清楚的话……"
                autoFocus
              />
            </label>
            <div className="capture-image-tools">
              <label className="image-attach-button">
                + 上传图片（{captureImages.length}/9）
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    if (captureImages.length >= 9)
                      window.alert("已达到上限，单条记录最多 9 张图片");
                    else
                      files
                        .slice(0, 9 - captureImages.length)
                        .forEach(readCaptureImage);
                    event.target.value = "";
                  }}
                />
              </label>
              <span>也可以直接 Ctrl + V 粘贴图片</span>
              {captureImages.length > 0 && (
                <button
                  className="remove-capture-image"
                  onClick={() => setCaptureImages([])}
                >
                  全部移除
                </button>
              )}
            </div>
            {captureImages.length > 0 && (
              <div className="capture-image-previews">
                {captureImages.map((image, index) => (
                  <div
                    className="capture-image-preview-wrap"
                    key={`capture-${index}`}
                  >
                    <img
                      className="capture-image-preview"
                      src={image}
                      alt={`待保存的图片 ${index + 1}`}
                    />
                    <button
                      className="remove-one-image"
                      onClick={() =>
                        setCaptureImages((images) =>
                          images.filter(
                            (_, imageIndex) => imageIndex !== index,
                          ),
                        )
                      }
                    >
                      <X weight="bold" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button
                className="plain-link"
                onClick={() => {
                  setShowModal(false);
                  setEditingRecordId(null);
                }}
              >
                取消
              </button>
              <button
                className="add-button"
                disabled={
                  (!captureText.trim() && captureImages.length === 0) ||
                  (captureDestination === "node" && !captureNodeId)
                }
                onClick={saveCapture}
              >
                {captureDestination === "node"
                  ? "保存到技能节点"
                  : "放入待整理"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
