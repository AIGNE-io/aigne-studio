import { Box } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react';

import CodeEditor from '../code-editor';

const meta: Meta<typeof CodeEditor> = {
  title: 'CodeEditor',
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
      <Box
        sx={{
          width: 1,
          height: 1000
        }}>
        <CodeEditor
          keyId="typescript"
          language="typescript"
          path="function.ts"
          value={`\
// 开始使用 React\nReact.
`}
          onChange={() => {}}
          locale="zh"
        />
      </Box>
    );
  },
};

export const Javascript: Story = {
  render: () => {
    return (
      <Box
        sx={{
          width: 1,
          height: 1000
        }}>
        <CodeEditor
          keyId="javascript"
          language="javascript"
          path="function.js"
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

export const HTML: Story = {
  render: () => {
    return (
      <Box
        sx={{
          width: 1,
          height: 1000
        }}>
        <CodeEditor
          keyId="html"
          language="html"
          path="function.html"
          value={`\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
  <div>hello world</div>
</body>
</html>`}
          onChange={() => {}}
          locale="zh"
        />
      </Box>
    );
  },
};

export const CSS: Story = {
  render: () => {
    return (
      <Box
        sx={{
          width: 1,
          height: 1000
        }}>
        <CodeEditor
          keyId="css"
          language="css"
          path="function.ts"
          value={`\
body {
  background-color: #f0f0f0;
}
`}
          onChange={() => {}}
          locale="zh"
        />
      </Box>
    );
  },
};
