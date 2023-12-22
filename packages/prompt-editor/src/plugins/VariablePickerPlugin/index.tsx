import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { Box, alpha, styled } from '@mui/material';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import { LexicalEditor, TextNode } from 'lexical';
import React, { useCallback, useMemo, useState } from 'react';
import * as ReactDOM from 'react-dom';

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
  onClick,
  onMouseEnter,
  option,
}: {
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  option: VariablePickerOption;
}) {
  let className = 'item';
  if (isSelected) {
    className += ' selected';
  }

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
        <Box px={0.5} display="flex">
          {option.icon}
        </Box>
      )}
      <Box className="text" display="flex">
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
              <div className="typeahead-popover component-picker-menu">
                <ul>
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

                      {!option.disabled && filteredOptions[i + 1]?.disabled && <Divider light />}
                    </React.Fragment>
                  ))}
                </ul>
              </div>,
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
