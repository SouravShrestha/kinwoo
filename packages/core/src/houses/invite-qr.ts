export type QrModules = readonly (readonly boolean[])[];

export function qrPathData(modules: QrModules): string {
  const commands: string[] = [];

  modules.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x += 1;
        continue;
      }
      const start = x;
      while (x < row.length && row[x]) x += 1;
      commands.push(`M${start} ${y}h${x - start}v1h${start - x}z`);
    }
  });

  return commands.join("");
}
