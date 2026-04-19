import { Box, Text } from 'ink';
import type React from 'react';
import type { TuiBindingsHint } from '../render.js';

interface Props {
  controllerCount: number;
  controllerLabel: string;
  focusedLabel: string;
  bindingHints: TuiBindingsHint[];
  message?: string | null;
}

export const StatusBar: React.FC<Props> = ({
  controllerCount,
  controllerLabel,
  focusedLabel,
  bindingHints,
  message,
}) => {
  const controllerStatus = controllerCount > 0 ? `🎮 ${controllerLabel}` : '🎮 (none)';
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="#444466" paddingX={1}>
      <Box justifyContent="space-between">
        <Text>
          <Text color="#b14bff" bold>
            ctrlr
          </Text>{' '}
          <Text color="gray">·</Text> {controllerStatus} <Text color="gray">·</Text> focus:{' '}
          <Text color="#3ed8ff">{focusedLabel}</Text>
        </Text>
        <Text color="gray">Ctrl-Q quit · Ctrl-R restart focused · Ctrl-N next</Text>
      </Box>
      <Box flexWrap="wrap">
        {bindingHints.slice(0, 8).map((hint, i) => (
          <Text key={`hint-${i}-${hint.button}`}>
            <Text color="#ffb547" bold>
              {hint.button}
            </Text>
            <Text color="gray">:</Text> <Text>{hint.label}</Text>
            <Text color="gray">{i < bindingHints.length - 1 ? '  ' : ''}</Text>
          </Text>
        ))}
      </Box>
      {message ? (
        <Box marginTop={0}>
          <Text color="#3ed8ff">↳ {message}</Text>
        </Box>
      ) : null}
    </Box>
  );
};
