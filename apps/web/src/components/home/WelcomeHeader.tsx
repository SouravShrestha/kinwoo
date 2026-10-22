type WelcomeHeaderProps = {
  salutation: string;
  message: string;
};

export function WelcomeHeader({ salutation, message }: WelcomeHeaderProps) {
  return (
    <h1 className="mt-4 min-w-0 max-w-[70%] font-display font-normal">
      <span className="block truncate text-lg text-muted-foreground">{salutation}</span>
      <span className="mt-0.5 block truncate text-2xl tracking-wide text-foreground">
        {message}
      </span>
    </h1>
  );
}
