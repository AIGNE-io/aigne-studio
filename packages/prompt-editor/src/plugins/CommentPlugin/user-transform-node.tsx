/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { LexicalEditor, TextNode } from 'lexical';
import { useEffect } from 'react';

import replaceNodes from '../VariablePlugin/utils/replace-nodes';
import { $createCommentNode, CommentNode } from './comment-node';

const COMMENT_ID = '// ';

export default function useTransformNode(editor: LexicalEditor) {
  const nodeTextTransform = (node: TextNode) => {
    const text = node.getTextContent();

    if (text.startsWith(COMMENT_ID)) {
      node.replace($createCommentNode(text));
    }
  };

  const nodeCommentTransform = (node: CommentNode) => {
    const text = node.getTextContent();

    if (!text.startsWith(COMMENT_ID)) {
      replaceNodes({ node, text });
    }
  };

  useEffect(() => {
    const handleTransform = editor.registerNodeTransform(TextNode, nodeTextTransform);
    return () => {
      handleTransform();
    };
  }, [editor]);

  useEffect(() => {
    const handleTransform = editor.registerNodeTransform(CommentNode, nodeCommentTransform);

    return () => {
      handleTransform();
    };
  }, [editor]);

  return null;
}
