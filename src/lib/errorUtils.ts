export type ErrorDetails = {
  message: string;
  location: string;
};

const parseLocationFromStack = (stack: string): string => {
  const lines = stack
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const stackLine = lines
    .slice(1)
    .find((line) => !line.includes("errorUtils") && !line.includes("node_modules") && !line.includes("<anonymous>"))
    || lines[1];

  if (!stackLine) {
    return "line not available";
  }

  const match = stackLine.match(/(?:at\s+)?(?:.*\()?(.+):(\d+):(\d+)\)?$/);
  if (!match) {
    return stackLine;
  }

  const [, file, line, column] = match;
  return `${file}:${line}:${column}`;
};

export function getErrorDetails(error: unknown): ErrorDetails {
  if (error instanceof Error) {
    return {
      message: error.message || "Runtime error",
      location: error.stack ? parseLocationFromStack(error.stack) : "line not available",
    };
  }

  if (typeof error === "string") {
    return { message: error, location: "line not available" };
  }

  return { message: "Unknown runtime error", location: "line not available" };
}

export function formatErrorDetails(error: unknown): string {
  const details = getErrorDetails(error);
  return `${details.message}${details.location ? ` (${details.location})` : ""}`;
}
