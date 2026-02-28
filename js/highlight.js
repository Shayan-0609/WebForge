Prism.hooks.add("wrap", function (env) {
  if (env.type !== "comment") return;

  const text = env.content
    .replace(/<[^>]+>/g, "")   // remove prism spans
    .replace(/&.*?;/g, "")     // remove html entities
    .trim()
    .toLowerCase();

  if (text.startsWith("/*!")) {
    env.classes.push("comment-important");
  }

  if (text.includes("todo")) {
    env.classes.push("comment-todo");
  }

  if (text.includes("fixme")) {
    env.classes.push("comment-fixme");
  }

  if (text.includes("bug")) {
    env.classes.push("comment-bug");
  }

  if (text.includes("note") || text.includes("info")) {
    env.classes.push("comment-note");
  }

  if (text.includes("hack")) {
    env.classes.push("comment-hack");
  }

  if (/(https?:\/\/|www\.)\S+/i.test(text)) {
  env.classes.push("comment-link");
}
});