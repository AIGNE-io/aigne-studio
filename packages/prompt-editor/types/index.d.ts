import PromptEditor from './app';
import { $createCommentNode, $isCommentNode } from './plugins/CommentPlugin/comment-node';
import { $createRoleSelectNode, $isRoleSelectNode } from './plugins/RolePlugin/role-select-node';
import { $createVariableNode, $isVariableTextNode } from './plugins/VariablePlugin/variable-text-node';
export default PromptEditor;
export { $createCommentNode, $isCommentNode };
export { $createVariableNode, $isVariableTextNode };
export { $createRoleSelectNode, $isRoleSelectNode };
