import type { AgentRuntimeState } from '@ctrlr/types';
import { Box, Text } from 'ink';
import type React from 'react';

interface Props {
  agent: AgentRuntimeState;
  focused: boolean;
  width: number;
  height: number;
  rows: string[];
}

const ACCENT: Record<NonNullable<AgentRuntimeState['spec']['accent']>, string> = {
  pink: '#b14bff',
  cyan: '#3ed8ff',
  amber: '#ffb547',
  green: '#5af78e',
  red: '#ff5470',
};

const STATUS_COLOR = {
  idle: 'gray',
  running: 'green',
  exited: 'gray',
  crashed: 'red',
} as const;

export const PaneCell: React.FC<Props> = ({ agent, focused, width, height, rows }) => {
  const accent = agent.spec.accent ? ACCENT[agent.spec.accent] : undefined;
  const borderColor = focused ? (accent ?? '#b14bff') : '#333344';

  return (
    <Box
      flexDirection="column"
      borderStyle={focused ? 'double' : 'round'}
      borderColor={borderColor}
      width={width + 2}
      height={height + 2}
    >
      <Box justifyContent="space-between" paddingX={1}>
        <Text bold color={focused ? 'white' : 'gray'}>
          {agent.spec.label}
        </Text>
        <Text color={STATUS_COLOR[agent.status]}>● {agent.status}</Text>
      </Box>
      <Box flexDirection="column" paddingX={1}>
        {Array.from({ length: height - 1 }).map((_, i) => {
          const text = (rows[i] ?? '').padEnd(width).slice(0, width);
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: row index is the natural key
            <Text key={`row-${i}`} wrap="truncate-end">
              {text}
            </Text>
          );
        })}
      </Box>
    </Box>
  );
};
