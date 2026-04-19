import { Box, Text, useInput } from 'ink';
import { useEffect, useState } from 'react';

const CONTROLLER = [
  '     ╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮     ',
  '   ╭━╯   ┌─┐         ┌────────┐         ╰━╮  ',
  '  │     ─┤ ├─        │  > _   │      ◯    │ ',
  '  │      └─┘         │        │    ◯   ◯  │ ',
  '   ╰━╮               └────────┘      ◯    ╭━╯',
  '     ╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯     ',
];

const WORDMARK = [
  ' ██████╗████████╗██████╗ ██╗     ██████╗ ',
  '██╔════╝╚══██╔══╝██╔══██╗██║     ██╔══██╗',
  '██║        ██║   ██████╔╝██║     ██████╔╝',
  '██║        ██║   ██╔══██╗██║     ██╔══██╗',
  '╚██████╗   ██║   ██║  ██║███████╗██║  ██║',
  ' ╚═════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝',
];

const TAGLINE = 'C O N T R O L   Y O U R   A I   A G E N T S';

const GRADIENT_START = '#b14bff'; // ctrlr pink
const GRADIENT_END = '#3ed8ff'; // ctrlr cyan

const SPINNER_FRAMES = ['◐', '◓', '◑', '◒'];

interface Props {
  /** Minimum render time in ms. Default 900. */
  minDurationMs?: number;
  /** Called once both `minDurationMs` has elapsed and `ready` is true. */
  onDismiss?: () => void;
  /** Set to `true` once the engine has finished booting. */
  ready?: boolean;
}

export const Splash: React.FC<Props> = ({ minDurationMs = 900, onDismiss, ready = true }) => {
  const [tick, setTick] = useState(0);
  const [minDone, setMinDone] = useState(false);
  const [skipped, setSkipped] = useState(false);

  useInput((_, key) => {
    if (key.return || key.escape) setSkipped(true);
  });

  useEffect(() => {
    const t = setTimeout(() => setMinDone(true), minDurationMs);
    return () => clearTimeout(t);
  }, [minDurationMs]);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 110);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if ((minDone && ready) || skipped) onDismiss?.();
  }, [minDone, ready, skipped, onDismiss]);

  const longest = Math.max(...WORDMARK.map((l) => l.length));

  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      {CONTROLLER.map((line, i) => (
        <GradientLine key={`ctrl-${i}`} text={line} length={longest} />
      ))}
      <Box height={1} />
      {WORDMARK.map((line, i) => (
        <GradientLine key={`mark-${i}`} text={line} length={longest} />
      ))}
      <Box height={1} />
      <Text color="#a8a8c0">{TAGLINE}</Text>
      <Box height={1} />
      <Box>
        <Text color={GRADIENT_END}>{SPINNER_FRAMES[tick % SPINNER_FRAMES.length]} </Text>
        <Text color="#7e7e95">
          {ready ? 'Ready' : 'Booting engine'}{' '}
          <Text color="#52526a">· press Enter to skip</Text>
        </Text>
      </Box>
    </Box>
  );
};

interface GradientLineProps {
  text: string;
  length: number;
}

const GradientLine: React.FC<GradientLineProps> = ({ text, length }) => {
  // Walk by character — Ink renders each <Text> child as a coloured run, so
  // characters that share a colour can collapse to one element. We bin by
  // colour key to keep React's child count down on long lines.
  const chars = [...text];
  const groups: { color: string; chunk: string }[] = [];
  for (let i = 0; i < chars.length; i++) {
    const t = length === 0 ? 0 : i / Math.max(length - 1, 1);
    const color = chars[i] === ' ' ? 'transparent' : interpolateHex(GRADIENT_START, GRADIENT_END, t);
    if (groups.length > 0 && groups[groups.length - 1]!.color === color) {
      groups[groups.length - 1]!.chunk += chars[i];
    } else {
      groups.push({ color, chunk: chars[i]! });
    }
  }
  return (
    <Box>
      {groups.map((g, i) =>
        g.color === 'transparent' ? (
          <Text key={`g-${i}`}>{g.chunk}</Text>
        ) : (
          <Text key={`g-${i}`} color={g.color}>
            {g.chunk}
          </Text>
        ),
      )}
    </Box>
  );
};

export function interpolateHex(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bch = Math.round(ab + (bb - ab) * t);
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(bch)}`;
}
