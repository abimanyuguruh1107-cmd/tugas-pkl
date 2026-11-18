import { ApiError } from "../../lib/errors";

export interface SignedFileUrlInput {
  storageKey: string;
  expiresInSeconds: number;
}
export type SignedFileUrlProvider = (
  input: SignedFileUrlInput,
) => Promise<string>;
let provider: SignedFileUrlProvider | undefined;
export function configureFileUrlProvider(
  value: SignedFileUrlProvider | undefined,
): void {
  provider = value;
}
export async function createSignedFileUrl(storageKey: string): Promise<string> {
  if (!provider) {
    throw new ApiError(503, "File storage URL provider is not configured");
  }
  return provider({ storageKey, expiresInSeconds: 120 });
}
