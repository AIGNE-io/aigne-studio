import { Box } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react';

import CodeEditor from '../test-editor';

const meta: Meta<typeof CodeEditor> = {
  title: 'TestEditor',
  component: CodeEditor,
  argTypes: {
    theme: {
      options: [
        'catppuccin-latte',
        'everforest-light',
        'github-light',
        'github-light-default',
        'github-light-high-contrast',
        'light-plus',
        'material-theme-lighter',
        'min-light',
        'one-light',
        'rose-pine-dawn',
        'slack-ochin',
        'snazzy-light',
        'solarized-light',
        'vitesse-light',
        'andromeeda',
        'aurora-x',
        'ayu-dark',
        'catppuccin-frappe',
        'catppuccin-macchiato',
        'catppuccin-mocha',
        'dark-plus',
        'dracula',
        'dracula-soft',
        'everforest-dark',
        'github-dark',
        'github-dark-default',
        'github-dark-dimmed',
        'github-dark-high-contrast',
        'houston',
        'laserwave',
        'material-theme',
        'material-theme-darker',
        'material-theme-ocean',
        'material-theme-palenight',
        'min-dark',
        'monokai',
        'night-owl',
        'nord',
        'one-dark-pro',
        'plastic',
        'poimandres',
        'red',
        'rose-pine',
        'rose-pine-moon',
        'slack-dark',
        'solarized-dark',
        'synthwave-84',
        'tokyo-night',
        'vesper',
        'vitesse-black',
        'vitesse-dark',
      ],
      control: { type: 'select' },
    },
  },
};

export default meta;

type Story = StoryObj<typeof CodeEditor>;

export const Typescript: Story = {
  args: {
    keyId: 'typescript',
    language: 'typescript',
    path: 'function.ts',
    value: `\
function resolveAfter2Seconds(x) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(x);
    }, 2000);
  });
}

// async function expression assigned to a variable
const add = async function (x) {
  const a = await resolveAfter2Seconds(20);
  const b = await resolveAfter2Seconds(30);
  return x + a + b;
};

add(10).then((v) => {
  console.log(v); // prints 60 after 4 seconds.
});

// async function expression used as an IIFE
(async function (x) {
  const p1 = resolveAfter2Seconds(20);
  const p2 = resolveAfter2Seconds(30);
  return x + (await p1) + (await p2);
})(10).then((v) => {
  console.log(v); // prints 60 after 2 seconds.
});\
    `,
    onChange: () => {},
    locale: 'zh',
    theme: 'solarized-dark',
  },
  render: (args) => {
    return (
      <Box
        sx={{
          width: 1,
          height: 500
        }}>
        <CodeEditor {...args} />
      </Box>
    );
  },
};
