import { promises as fs } from "fs";
import * as path from "path";

const getAllFiles = async (dir: string): Promise<string[]> => {
  // Read the directory entries along with file type info
  const entries = await fs.readdir(dir, { withFileTypes: true });

  // Map each entry to either its file path or a recursive lookup for directories
  const files = await Promise.all(
    entries.map((entry) => {
      const fullPath = path.join(dir, entry.name);
      return entry.isDirectory()
        ? getAllFiles(fullPath)
        : Promise.resolve(fullPath);
    })
  );
  // Flatten the array (without mutating state) and return
  return files.flat();
};

const isTsFile = (file: string): boolean =>
  file.endsWith(".ts") || file.endsWith(".tsx");

const formatFileAsMarkdown = async (file: string): Promise<string> => {
  const content = await fs.readFile(file, "utf-8");
  // Wrap the content in a markdown code block, indicating it's TypeScript
  return [`## ${file}`, "", "```ts", content, "```", ""].join("\n");
};

(async () => {
  try {
    // Allow a folder path to be passed as the first CLI argument; default to 'src'
    const targetDir = process.argv[2] || "src";
    const allFiles = await getAllFiles(targetDir);
    const tsFiles = allFiles.filter(isTsFile);

    // Process each file into a markdown snippet
    const markdownSnippets = await Promise.all(
      tsFiles.map(formatFileAsMarkdown)
    );
    const outputContent = markdownSnippets.join("\n");

    // Write to an output file that you can later share with an LLM
    const outputPath = "repo-dump.md";
    await fs.writeFile(outputPath, outputContent, "utf-8");
    console.log(`Dump successfully written to ${outputPath}`);
  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1);
  }
})();
