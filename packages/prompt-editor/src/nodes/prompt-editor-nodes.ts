import type { Klass, LexicalNode } from 'lexical';

import { CommentNode } from '../plugins/CommentPlugin/comment-node';
import { VariableTextNode } from '../plugins/VariablePlugin/variable-text-node';

const PromptEditorNodes: Array<Klass<LexicalNode>> = [VariableTextNode, CommentNode];

export default PromptEditorNodes;
