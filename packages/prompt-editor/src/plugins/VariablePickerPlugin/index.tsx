import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  PUNCTUATION,
  TriggerFn,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { Box, alpha, styled } from '@mui/material';
import Divider from '@mui/material/Divider';
import Stack, { StackProps } from '@mui/material/Stack';
import { LexicalEditor, TextNode } from 'lexical';
import React, { useCallback, useMemo, useState, type JSX } from 'react';
import * as ReactDOM from 'react-dom';

function useBasicTypeaheadTriggerMatch(
  trigger: string,
  { minLength = 1, maxLength = 75 }: { minLength?: number; maxLength?: number }
): TriggerFn {
  // @ts-ignore
  return useCallback(
    (text: string) => {
      const validChars = `[^${trigger}${PUNCTUATION}\\s]`;
      const TypeaheadTriggerRegex = new RegExp(
        // eslint-disable-next-line no-useless-concat
        '(^|\\s|\\(|)' + `(${trigger}{1,2})` + `((?:${validChars}){0,${maxLength}})$`
      );

      const match = TypeaheadTriggerRegex.exec(text);
      if (match !== null) {
        const maybeLeadingWhitespace = match[1] || '';
        const matchingString = match[3] || '';

        if (matchingString.length >= minLength) {
          return {
            leadOffset: match.index + maybeLeadingWhitespace.length,
            matchingString,
            replaceableString: match[2] + matchingString,
          };
        }
      }
      return null;
    },
    [maxLength, minLength, trigger]
  );
}

export class VariablePickerOption extends MenuOption {
  title: string;

  icon?: JSX.Element;

  disabled?: boolean;

  onSelect: (editor: LexicalEditor, queryString?: string) => void;

  replaceTitle?: string;

  constructor(
    title: string,
    options: {
      icon?: JSX.Element;
      disabled?: boolean;
      replaceTitle?: string;
      onSelect: (editor: LexicalEditor, queryString?: string) => void;
    }
  ) {
    super(title);
    this.title = title;
    this.icon = options.icon;
    this.disabled = options.disabled;
    this.replaceTitle = options.replaceTitle;
    this.onSelect = options.onSelect.bind(this);
  }
}

function VariablePickerMenuItem({
  isSelected,
  option,
  onClick,
  onMouseEnter,
}: {
  isSelected: boolean;
  option: VariablePickerOption;
} & StackProps) {
  const className = ['item', ...(isSelected ? ['selected'] : [])].join(' ');

  return (
    <Item
      direction="row"
      alignItems="center"
      key={option.key}
      className={className}
      ref={option.setRefElement}
      onMouseEnter={onMouseEnter}
      onClick={onClick}>
      {!!option.icon && (
        <Box
          sx={{
            px: 0.5,
            display: "flex"
          }}>
          {option.icon}
        </Box>
      )}
      <Box className="text" sx={{
        display: "flex"
      }}>
        {option.title}
      </Box>
    </Item>
  );
}

export default function VariablePickerPlugin({ options }: { options?: VariablePickerOption[] }) {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('{', { minLength: 0 });

  const [filterDisabledOptions, matchOptions] = useMemo(() => {
    const filterDisabledOptions = (options || []).filter((x) => x.disabled);
    const matchOptions = (options || []).filter((x) => !x.disabled);
    return [filterDisabledOptions, matchOptions];
  }, [options]);

  const filteredOptions = useMemo(() => {
    const replaceVariableOptions = filterDisabledOptions.map((x) => {
      if (x.replaceTitle) {
        const found = matchOptions.find((x) => x.title === queryString);

        if (!found) {
          x.title = x.replaceTitle.replace('$$$', queryString ? ` "${queryString}" ` : '');
        }
      }

      return x;
    });

    if (!queryString) {
      return matchOptions.concat(replaceVariableOptions);
    }

    const regex = new RegExp(queryString, 'i');
    return [...matchOptions.filter((option) => regex.test(option.title))].concat(replaceVariableOptions);
  }, [queryString, filterDisabledOptions, matchOptions]);

  const onSelectOption = useCallback(
    (
      selectedOption: VariablePickerOption,
      nodeToRemove: TextNode | null,
      closeMenu: () => void,
      matchingString: string
    ) => {
      editor.update(() => {
        nodeToRemove?.remove();
        selectedOption.onSelect(editor, matchingString);
        closeMenu();
      });
    },
    [editor]
  );

  return (
    <LexicalTypeaheadMenuPlugin<VariablePickerOption>
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForTriggerMatch}
      options={filteredOptions}
      menuRenderFn={(anchorElementRef, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) =>
        anchorElementRef.current && filteredOptions.length
          ? ReactDOM.createPortal(
              <Box className="typeahead-popover component-picker-menu">
                <Box component="ul">
                  {filteredOptions.map((option, i: number) => (
                    <React.Fragment key={option.key}>
                      <VariablePickerMenuItem
                        isSelected={selectedIndex === i}
                        onClick={() => {
                          setHighlightedIndex(i);
                          selectOptionAndCleanUp(option);
                        }}
                        onMouseEnter={() => {
                          setHighlightedIndex(i);
                        }}
                        option={option}
                      />

                      {!option.disabled && filteredOptions[i + 1]?.disabled && <Divider sx={{
                        opacity: "0.6"
                      }} />}
                    </React.Fragment>
                  ))}
                </Box>
              </Box>,
              anchorElementRef.current
            )
          : null
      }
    />
  );
}

const Item = styled(Stack)`
  margin: 3px 4px;
  font-size: ${({ theme }) => theme.typography.caption.fontSize};
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;

  &.selected {
    background-color: ${({ theme }) => alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity)};
  }
`;
