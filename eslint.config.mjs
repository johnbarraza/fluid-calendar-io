import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [// Ignore specific worker files that use CommonJS require
{
  ignores: ["src/saas/jobs/register-aliases.js", "src/saas/jobs/worker-with-aliases.js"]
}, ...nextCoreWebVitals, ...nextTypescript];

export default eslintConfig;
