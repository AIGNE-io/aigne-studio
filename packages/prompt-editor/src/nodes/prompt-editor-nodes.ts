import type { Klass, LexicalNode } from 'lexical';

import { CommentNode } from '../plugins/CommentPlugin/comment-node';
import { RoleSelectNode } from '../plugins/RolePlugin/role-select-node';
import { VariableTextNode } from '../plugins/VariablePlugin/variable-text-node';

const PromptEditorNodes: Array<Klass<LexicalNode>> = [RoleSelectNode, VariableTextNode, CommentNode];

export default PromptEditorNodes;
