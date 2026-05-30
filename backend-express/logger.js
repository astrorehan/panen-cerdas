// Tiny structured logger for the Express gateway.
// Keeps output tidy (ISO timestamp + level) without pulling in a logging dep.
// Drop-in for the bare console.* calls scattered across routes.

function emit(level, scope, message) {
  const ts = new Date().toISOString();
  const line = `${ts} [${level}] [${scope}] ${message}`;
  if (level === "ERROR") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

module.exports = {
  info: (scope, message) => emit("INFO", scope, message),
  warn: (scope, message) => emit("WARN", scope, message),
  error: (scope, message) => emit("ERROR", scope, message),
};
