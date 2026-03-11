import Link from "next/link";

export const mdxComponents = {
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="mt-12 border-t border-slate-200 pt-6 text-2xl font-semibold text-slate-900" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mt-8 text-lg font-semibold text-slate-900" {...props} />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mt-4 text-base leading-7 text-slate-700" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-700" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="mt-4 list-decimal space-y-2 pl-5 text-slate-700" {...props} />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    if (!props.href) return <a {...props} />;

    const isInternal = props.href.startsWith("/");
    if (isInternal) {
      return (
        <Link href={props.href} className="font-medium text-blue-700 underline-offset-4 hover:underline">
          {props.children}
        </Link>
      );
    }

    return <a className="font-medium text-blue-700 underline-offset-4 hover:underline" {...props} />;
  },
};
