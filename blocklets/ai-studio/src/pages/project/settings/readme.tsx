/* eslint-disable react/function-component-definition */
import { Box } from '@mui/material';
import { styled as muiStyled } from '@mui/material/styles';
import MDEditor, { commands } from '@uiw/react-md-editor';
import rehypeSanitize from 'rehype-sanitize';

export const ReadMe = ({
  readMeValue,
  setReadMeValue,
}: {
  readMeValue: string;
  setReadMeValue: (value?: string) => void;
}) => {
  return (
    <StyledBox>
      <div data-color-mode="light">
        <MDEditor
          value={readMeValue}
          onChange={setReadMeValue}
          preview="edit"
          height={400}
          previewOptions={{
            rehypePlugins: [[rehypeSanitize]],
          }}
          commands={[commands.codeEdit, commands.codePreview]}
          extraCommands={[
            commands.bold,
            commands.italic,
            commands.strikethrough,
            commands.hr,
            commands.title,
            commands.divider,
            commands.link,
            commands.quote,
            commands.code,
            commands.codeBlock,
            commands.comment,
            commands.image,
            commands.table,
            commands.divider,
            commands.unorderedListCommand,
            commands.orderedListCommand,
            commands.checkedListCommand,
            commands.divider,
            commands.help,
          ]}
          components={{
            toolbar: (command, _disabled, excuteCommand) => {
              if (command.name === 'edit') {
                return (
                  <button
                    type="button"
                    {...command.buttonProps}
                    onClick={(evn) => {
                      evn.stopPropagation();
                      excuteCommand(command, command.groupName);
                    }}>
                    Write
                  </button>
                );
              }
              if (command.name === 'preview') {
                return (
                  <button
                    type="button"
                    {...command.buttonProps}
                    onClick={(evn) => {
                      evn.stopPropagation();
                      excuteCommand(command, command.groupName);
                    }}>
                    Preview
                  </button>
                );
              }
              return null;
            },
          }}
        />
      </div>
    </StyledBox>
  );
};

const StyledBox = muiStyled(Box)(({ theme }) => ({
  margin: '1px',
  '& .code-line': {
    color: `${theme.palette.text.primary} !important`,
  },
}));
