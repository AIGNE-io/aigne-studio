import 'highlight.js/styles/base16/github.css';

import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import type { BoxProps } from '@mui/material';
import { Box, styled } from '@mui/material';
import hljs from 'highlight.js';
import { marked } from 'marked';
import { mangle } from 'marked-mangle';
import { memo, useEffect, useMemo, useRef } from 'react';

const MarkdownViewer = styled(Box)`
  padding: 0 4px;
  background-color: transparent;

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    color: ${({ theme }) => theme.palette.text.primary};
    font-weight: bold;
  }

  p {
    word-break: break-word;
    margin: 0;
    padding: ${({ theme }) => theme.spacing(1)} 0px;
  }

  ul,
  ol {
    margin-block-start: 1em;
    margin-block-end: 1em;
    margin-inline-start: 0px;
    margin-inline-start: 0px;
    padding-inline-start: 2em;
  }

  ul {
    list-style-type: disc;
  }

  ol {
    list-style-type: decimal;
  }

  a:-webkit-any-link {
    color: -webkit-link;
    cursor: pointer;
    text-decoration: underline;
  }

  blockquote {
    display: block;
    margin-block-start: 1em;
    margin-block-end: 1em;

    > p {
      &::before {
        content: '';
      }

      &::after {
        content: '';
      }
    }
  }

  /* .marked-code-block {
    margin: ${({ theme }) => theme.spacing(1)} 0px;
  } */

  .marked-code-header {
    display: flex;
    justify-content: space-between;
    padding: 4px 8px;
    background-color: ${({ theme }) => theme.palette.divider};
    border-radius: 4px 4px 0 0;
  }

  code {
    color: ${({ theme }) => theme.palette.secondary.main};
    background-color: #fff;
    border-radius: 0 0 4px 4px;
  }
  pre {
    background-color: #fff;
    border-radius: 0 0 4px 4px;
  }

  .copy-button {
    border-color: transparent;
    border-radius: 4px;
    background-color: rgba(0, 0, 0, 0.3);
    color: #fff;
    cursor: pointer;
    transition: background-color 0.3s;
  }

  .marked-table-container {
    width: 100%;
    overflow-x: auto;
  }

  &.writing:empty,
  &.writing > *:last-child {
    &:after {
      content: '';
      display: inline-block;
      vertical-align: middle;
      height: 1.2em;
      margin-top: -0.2em;
      margin-left: 0.1em;
      border-right: 0.2em solid orange;
      border-radius: 10px;
      animation: blink-caret 0.75s step-end infinite;

      @keyframes blink-caret {
        from,
        to {
          border-color: transparent;
        }
        50% {
          border-color: ${({ theme }) => theme.palette.secondary.main};
        }
      }
    }
  }
`;

interface MdViewerProps {
  content: string;
}

marked.use({
  pedantic: false,
  gfm: true,
  breaks: true,
});

marked.use(mangle());

function MdViewer(props: BoxProps & MdViewerProps) {
  const { t } = useLocaleContext();
  const mdViewerRef = useRef<HTMLDivElement>(null);
  const renderer = useMemo(() => {
    const renderer = new marked.Renderer();

    renderer.code = ({ text, lang }) => {
      const validLanguage = hljs.getLanguage(lang as string) ? lang : 'plaintext';
      const highlightedCode = hljs.highlight(validLanguage as string, text).value;

      if (validLanguage === 'md') return convertMarkdownToHTML(text);
      if (validLanguage === 'markdown') return convertMarkdownToHTML(text);

      return `
      <div class="marked-code-block">
        <div class="marked-code-header">
          <span>${validLanguage === 'plaintext' ? t('plaintext') : validLanguage}</span>
          <button class="copy-button">${t('copy')}</button>
        </div>
        <pre><code class="hljs ${validLanguage}">${highlightedCode}</code></pre>
      </div>
    `;
    };

    renderer.del = (text) => {
      return `<span>${text}</span>`;
    };

    renderer.link = ({ href, text }) => {
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    };

    renderer.image = ({ href, title, text }) => {
      return `<img class="default-image" src="${href}" alt="${text}" title="${title}" />`;
    };

    return renderer;
  }, [t]);

  useEffect(() => {
    const handleClick = (event: Event) => {
      event.stopPropagation();
      const target = event.target as HTMLElement; // 类型断言
      if (target.classList.contains('copy-button')) {
        const code = (target.parentNode as HTMLElement)?.nextElementSibling?.querySelector('code')?.textContent;

        if (code) {
          navigator.clipboard
            .writeText(code)
            .then(() => {
              Toast.success(t('copied'));
            })
            .catch(() => {});
        }
      }
    };

    if (mdViewerRef.current) {
      mdViewerRef.current.addEventListener('click', handleClick);
    }

    return () => {
      if (mdViewerRef.current) {
        mdViewerRef.current.removeEventListener('click', handleClick);
      }
    };
  }, [t]);

  const convertMarkdownToHTML = (content: string) => {
    const tokens = marked.lexer(content);
    return marked.parser(tokens, { renderer });
  };

  return (
    <MarkdownViewer
      ref={mdViewerRef}
      dangerouslySetInnerHTML={{ __html: convertMarkdownToHTML(props.content) }}
      {...props}
    />
  );
}
export default memo(MdViewer);
