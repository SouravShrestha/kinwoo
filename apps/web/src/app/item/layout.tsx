export default function ItemLayout({ children }: { children: React.ReactNode }) {
  return (
    // Clips the screen while it slides, so the page does not grow a scrollbar mid-animation.
    <div className="flex min-h-dvh justify-center overflow-y-clip">
      <div className="w-full max-w-md lg:border-x lg:border-border">{children}</div>
    </div>
  );
}
