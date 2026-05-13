export const drawMultilineText = (
  ctx: any,
  textArray: string[], 
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) => {
  textArray.forEach(item => {
    const words = item.split(' ');
    let line = '- ';

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }

    if (line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
    }
  });

  return y; 
};
