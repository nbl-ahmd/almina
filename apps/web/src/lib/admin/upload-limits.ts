// Leave room below Vercel's 4.5 MB function payload limit for multipart framing.
export const adminBodyLimit = 4 * 1024 * 1024;
export const adminFileLimit = 3 * 1024 * 1024;
