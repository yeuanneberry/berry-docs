/** Native Sätteri HAST visitor; generated guide sources stay unchanged. */
export default {
  name: "external-links",
  element: {
    filter: ["a"],
    visit(node) {
      if (typeof node.properties?.href !== "string" ||
          !/^(?:https?:)?\/\//i.test(node.properties.href)) return;
      const existing = node.properties.rel;
      const tokens = Array.isArray(existing) ? existing : String(existing ?? "").split(/\s+/);
      const children = [...(node.children ?? [])];
      const alreadyHinted = children.some(child =>
        child.type === "element" && child.properties?.className?.includes("sr-only") &&
        child.children?.some(text => text.type === "text" && text.value?.includes("opens in a new tab")));
      if (!alreadyHinted) children.push({
        type: "element", tagName: "span", properties: { className: ["sr-only"] },
        children: [{ type: "text", value: " (opens in a new tab)" }],
      });
      // Native visitors receive immutable nodes: return a replacement instead.
      return {
        ...node,
        properties: {
          ...node.properties,
          ...(node.properties.href.startsWith("https://github.com/yeuanneberry/berry-desktop") ? { "data-stats-target": "desktop-source" } : {}),
          target: "_blank",
          rel: [...new Set([...tokens.filter(Boolean), "noopener", "noreferrer"])],
        },
        children,
      };
    },
  },
};
