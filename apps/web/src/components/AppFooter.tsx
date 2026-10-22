import { FOOTER_COPY } from "@kinwoo/core/app";
import { HeartIcon } from "@kinwoo/icons";

export function AppFooter() {
  return (
    <footer className="pt-16">
      <p className="font-display text-6xl font-semibold uppercase leading-none tracking-tight text-border">
        {FOOTER_COPY.tagline.map((word) => (
          <span key={word} className="block">
            {word}
          </span>
        ))}
      </p>
      <p className="mt-10 flex items-center gap-2 font-display text-base font-normal uppercase text-muted-foreground">
        {FOOTER_COPY.madeWith}
        <HeartIcon size={18} className="text-destructive" />
        {FOOTER_COPY.madeIn}
      </p>
      <p className="mt-6 font-display text-base font-normal uppercase text-muted-foreground">
        {FOOTER_COPY.version(process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0")}
      </p>
    </footer>
  );
}
