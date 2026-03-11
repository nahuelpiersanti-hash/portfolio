import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";

import { mdxComponents } from "@/components/mdx/mdx-components";

interface RenderMdxContentProps {
  source: string;
}

export function RenderMdxContent({ source }: RenderMdxContentProps) {
  return (
    <article className="min-w-0">
      <MDXRemote
        source={source}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
          },
        }}
        components={mdxComponents}
      />
    </article>
  );
}
