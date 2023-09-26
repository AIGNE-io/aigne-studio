/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/// <reference types="react" />
import './index.css';

import { LexicalEditor } from 'lexical';
export default function FloatingTextFormatToolbarPlugin({
  anchorElem,
  floatItems,
}: {
  anchorElem?: HTMLElement;
  floatItems?: (data: { editor: LexicalEditor }) => any;
}): JSX.Element | null;
