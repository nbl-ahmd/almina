export function localDevPlan(env: Readonly<Record<string, string | undefined>>, args: string[]): {
  port: number;
  hostname: string;
  webOrigin: string;
};
export function localApiEnvironment(source: Readonly<Record<string, string | undefined>>, webOrigin: string): Record<string, string | undefined>;
