import { Box } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react';

import CodeEditor from '../test-editor';

const meta: Meta<typeof CodeEditor> = {
  title: 'TestEditor',
  component: CodeEditor,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof CodeEditor>;

export const Typescript: Story = {
  render: () => {
    return (
      <Box width={1} height={1000}>
        <CodeEditor
          theme="vs-dark"
          keyId="typescript"
          language="typescript"
          path="function.ts"
          value={`\
console.log('hello world')
`}
          onChange={() => {}}
          locale="zh"
        />
      </Box>
    );
  },
};
