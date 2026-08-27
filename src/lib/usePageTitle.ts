import { usePageMeta, type PageMeta } from "@/lib/usePageMeta";

export function usePageTitle(
  title: string | undefined,
  meta: Omit<PageMeta, "title"> = {},
) {
  usePageMeta({ ...meta, title });
}
